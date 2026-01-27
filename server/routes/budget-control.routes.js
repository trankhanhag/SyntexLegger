/**
 * Budget Control Routes
 * SyntexHCSN - Hệ thống Kiểm soát Ngân sách theo TT 24/2024/TT-BTC
 *
 * Provides API endpoints for:
 * - Budget period management (lock/unlock)
 * - Budget availability checking
 * - Spending authorization workflow
 * - Budget alerts management
 * - Budget utilization reporting
 */

const express = require('express');
const { verifyToken, requireRole, sanitizeBody, sanitizeQuery } = require('../middleware');
const budgetService = require('../services/budget.service');
const auditService = require('../services/audit.service');

module.exports = (db) => {
    const router = express.Router();

    // ================================================================
    // BUDGET PERIOD MANAGEMENT
    // ================================================================

    /**
     * GET /api/budget-control/periods
     * Get all budget periods for a fiscal year
     */
    router.get('/budget-control/periods', sanitizeQuery, verifyToken, (req, res) => {
        const { fiscal_year, company_id = '1' } = req.query;
        const year = parseInt(fiscal_year) || new Date().getFullYear();

        const sql = `SELECT * FROM budget_periods
            WHERE fiscal_year = ? AND company_id = ?
            ORDER BY period_type, period_number`;

        db.all(sql, [year, company_id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                fiscal_year: year,
                periods: rows
            });
        });
    });

    /**
     * GET /api/budget-control/periods/:periodId
     * Get a specific budget period
     */
    router.get('/budget-control/periods/:periodId', verifyToken, (req, res) => {
        const { periodId } = req.params;

        db.get(`SELECT * FROM budget_periods WHERE id = ?`, [periodId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Period not found' });
            res.json(row);
        });
    });

    /**
     * POST /api/budget-control/periods/:periodId/lock
     * Lock a budget period
     */
    router.post('/budget-control/periods/:periodId/lock', verifyToken, requireRole('admin', 'chief_accountant'), async (req, res) => {
        try {
            const { periodId } = req.params;
            const { reason } = req.body;

            // Get period info
            const period = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM budget_periods WHERE id = ?`, [periodId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!period) {
                return res.status(404).json({ error: 'Period not found' });
            }

            const result = await budgetService.lockPeriod({
                fiscal_year: period.fiscal_year,
                period: period.period_number,
                company_id: period.company_id,
                locked_by: req.user.username,
                reason
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/periods/:periodId/unlock
     * Unlock a budget period (requires admin)
     */
    router.post('/budget-control/periods/:periodId/unlock', verifyToken, requireRole('admin'), async (req, res) => {
        try {
            const { periodId } = req.params;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ error: 'Reason is required to unlock a period' });
            }

            // Get period info
            const period = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM budget_periods WHERE id = ?`, [periodId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!period) {
                return res.status(404).json({ error: 'Period not found' });
            }

            const result = await budgetService.unlockPeriod({
                fiscal_year: period.fiscal_year,
                period: period.period_number,
                company_id: period.company_id,
                unlocked_by: req.user.username,
                reason
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/budget-control/periods/:periodId/thresholds
     * Update budget period thresholds
     */
    router.put('/budget-control/periods/:periodId/thresholds', verifyToken, requireRole('admin'), (req, res) => {
        const { periodId } = req.params;
        const { warning_threshold, block_threshold, allow_override } = req.body;

        const sql = `UPDATE budget_periods
            SET warning_threshold = COALESCE(?, warning_threshold),
                block_threshold = COALESCE(?, block_threshold),
                allow_override = COALESCE(?, allow_override),
                updated_at = ?
            WHERE id = ?`;

        db.run(sql, [
            warning_threshold,
            block_threshold,
            allow_override !== undefined ? (allow_override ? 1 : 0) : null,
            new Date().toISOString(),
            periodId
        ], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: this.changes > 0 });
        });
    });

    // ================================================================
    // BUDGET AVAILABILITY
    // ================================================================

    /**
     * GET /api/budget-control/availability
     * Check budget availability
     */
    router.get('/budget-control/availability', sanitizeQuery, verifyToken, async (req, res) => {
        try {
            const { budget_estimate_id, fund_source_id, fiscal_year, item_code } = req.query;

            const availability = await budgetService.getBudgetAvailability({
                budget_estimate_id,
                fund_source_id,
                fiscal_year: fiscal_year ? parseInt(fiscal_year) : undefined,
                item_code
            });

            res.json(availability);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/check-spending
     * Check if spending is allowed before creating a voucher
     */
    router.post('/budget-control/check-spending', sanitizeBody, verifyToken, async (req, res) => {
        try {
            const {
                budget_estimate_id,
                fund_source_id,
                amount,
                fiscal_year,
                item_code,
                company_id
            } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Amount must be greater than 0' });
            }

            const result = await budgetService.checkBudgetForSpending({
                budget_estimate_id,
                fund_source_id,
                amount,
                fiscal_year: fiscal_year || new Date().getFullYear(),
                item_code,
                company_id
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ================================================================
    // SPENDING AUTHORIZATION
    // ================================================================

    /**
     * GET /api/budget-control/authorizations
     * Get spending authorizations with filters
     */
    router.get('/budget-control/authorizations', sanitizeQuery, verifyToken, (req, res) => {
        const { status, fiscal_year, requested_by, limit = 50 } = req.query;

        let sql = `SELECT ba.*,
            be.item_name, be.item_code,
            fs.name as fund_source_name
        FROM budget_authorizations ba
        LEFT JOIN budget_estimates be ON ba.budget_estimate_id = be.id
        LEFT JOIN fund_sources fs ON ba.fund_source_id = fs.id
        WHERE 1=1`;

        const params = [];

        if (status) {
            sql += ` AND ba.status = ?`;
            params.push(status);
        }
        if (fiscal_year) {
            sql += ` AND ba.fiscal_year = ?`;
            params.push(parseInt(fiscal_year));
        }
        if (requested_by) {
            sql += ` AND ba.requested_by = ?`;
            params.push(requested_by);
        }

        sql += ` ORDER BY ba.request_date DESC LIMIT ?`;
        params.push(parseInt(limit));

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            const results = rows.map(row => ({
                ...row,
                supporting_docs: row.supporting_docs ? JSON.parse(row.supporting_docs) : []
            }));

            res.json(results);
        });
    });

    /**
     * GET /api/budget-control/authorizations/pending
     * Get pending authorizations for approval
     */
    router.get('/budget-control/authorizations/pending', verifyToken, requireRole('admin', 'chief_accountant', 'accountant'), async (req, res) => {
        try {
            const { fiscal_year, limit } = req.query;

            const pending = await budgetService.getPendingAuthorizations({
                fiscal_year: fiscal_year ? parseInt(fiscal_year) : undefined,
                limit: limit ? parseInt(limit) : 50
            });

            res.json({
                count: pending.length,
                authorizations: pending
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/authorizations
     * Create a spending authorization request
     */
    router.post('/budget-control/authorizations', sanitizeBody, verifyToken, async (req, res) => {
        try {
            const {
                request_type,
                department_code,
                budget_estimate_id,
                fund_source_id,
                fiscal_year,
                requested_amount,
                purpose,
                justification,
                supporting_docs,
                voucher_id,
                doc_no
            } = req.body;

            if (!requested_amount || requested_amount <= 0) {
                return res.status(400).json({ error: 'Requested amount must be greater than 0' });
            }

            if (!purpose) {
                return res.status(400).json({ error: 'Purpose is required' });
            }

            // Get current budget availability
            const availability = await budgetService.getBudgetAvailability({
                budget_estimate_id,
                fund_source_id
            });

            const result = await budgetService.createSpendingAuthorization({
                request_type,
                requested_by: req.user.username,
                department_code,
                budget_estimate_id,
                fund_source_id,
                fiscal_year: fiscal_year || new Date().getFullYear(),
                requested_amount,
                budget_available: availability.available_amount,
                purpose,
                justification,
                supporting_docs,
                voucher_id,
                doc_no
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/authorizations/:id/approve
     * Approve a spending authorization
     */
    router.post('/budget-control/authorizations/:id/approve', verifyToken, requireRole('admin', 'chief_accountant'), async (req, res) => {
        try {
            const { id } = req.params;
            const { approved_amount, approval_notes } = req.body;

            const result = await budgetService.approveAuthorization({
                authorization_id: id,
                approved_by: req.user.username,
                approved_amount,
                approval_notes
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/authorizations/:id/reject
     * Reject a spending authorization
     */
    router.post('/budget-control/authorizations/:id/reject', verifyToken, requireRole('admin', 'chief_accountant'), async (req, res) => {
        try {
            const { id } = req.params;
            const { rejection_reason } = req.body;

            if (!rejection_reason) {
                return res.status(400).json({ error: 'Rejection reason is required' });
            }

            const result = await budgetService.rejectAuthorization({
                authorization_id: id,
                rejected_by: req.user.username,
                rejection_reason
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ================================================================
    // BUDGET TRANSACTIONS
    // ================================================================

    /**
     * GET /api/budget-control/transactions
     * Get budget transactions with filters
     */
    router.get('/budget-control/transactions', sanitizeQuery, verifyToken, (req, res) => {
        const {
            budget_estimate_id,
            fund_source_id,
            transaction_type,
            fiscal_year,
            fiscal_period,
            from_date,
            to_date,
            limit = 100
        } = req.query;

        let sql = `SELECT bt.*,
            be.item_name, be.item_code,
            fs.name as fund_source_name,
            v.doc_no as voucher_doc_no
        FROM budget_transactions bt
        LEFT JOIN budget_estimates be ON bt.budget_estimate_id = be.id
        LEFT JOIN fund_sources fs ON bt.fund_source_id = fs.id
        LEFT JOIN vouchers v ON bt.voucher_id = v.id
        WHERE 1=1`;

        const params = [];

        if (budget_estimate_id) {
            sql += ` AND bt.budget_estimate_id = ?`;
            params.push(budget_estimate_id);
        }
        if (fund_source_id) {
            sql += ` AND bt.fund_source_id = ?`;
            params.push(fund_source_id);
        }
        if (transaction_type) {
            sql += ` AND bt.transaction_type = ?`;
            params.push(transaction_type);
        }
        if (fiscal_year) {
            sql += ` AND bt.fiscal_year = ?`;
            params.push(parseInt(fiscal_year));
        }
        if (fiscal_period) {
            sql += ` AND bt.fiscal_period = ?`;
            params.push(parseInt(fiscal_period));
        }
        if (from_date) {
            sql += ` AND bt.transaction_date >= ?`;
            params.push(from_date);
        }
        if (to_date) {
            sql += ` AND bt.transaction_date <= ?`;
            params.push(to_date);
        }

        sql += ` ORDER BY bt.transaction_date DESC, bt.created_at DESC LIMIT ?`;
        params.push(parseInt(limit));

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/budget-control/transactions
     * Record a budget transaction
     */
    router.post('/budget-control/transactions', sanitizeBody, verifyToken, async (req, res) => {
        try {
            const {
                budget_estimate_id,
                fund_source_id,
                budget_allocation_id,
                transaction_type,
                transaction_date,
                voucher_id,
                doc_no,
                description,
                amount,
                authorization_id,
                fiscal_year,
                fiscal_period,
                department_code,
                project_code,
                account_code
            } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Amount must be greater than 0' });
            }

            if (!transaction_type) {
                return res.status(400).json({ error: 'Transaction type is required' });
            }

            const result = await budgetService.recordBudgetTransaction({
                budget_estimate_id,
                fund_source_id,
                budget_allocation_id,
                transaction_type,
                transaction_date: transaction_date || new Date().toISOString().split('T')[0],
                voucher_id,
                doc_no,
                description,
                amount,
                authorization_id,
                authorized_by: req.user.username,
                fiscal_year: fiscal_year || new Date().getFullYear(),
                fiscal_period: fiscal_period || (new Date().getMonth() + 1),
                department_code,
                project_code,
                account_code,
                created_by: req.user.username
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ================================================================
    // BUDGET ALERTS
    // ================================================================

    /**
     * GET /api/budget-control/alerts
     * Get active budget alerts
     */
    router.get('/budget-control/alerts', sanitizeQuery, verifyToken, async (req, res) => {
        try {
            const { fiscal_year, severity, limit } = req.query;

            const alerts = await budgetService.getActiveAlerts({
                fiscal_year: fiscal_year ? parseInt(fiscal_year) : undefined,
                severity,
                limit: limit ? parseInt(limit) : 50
            });

            res.json({
                count: alerts.length,
                alerts
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/budget-control/alerts/summary
     * Get alert summary by type and severity
     */
    router.get('/budget-control/alerts/summary', verifyToken, (req, res) => {
        const { fiscal_year } = req.query;
        const year = parseInt(fiscal_year) || new Date().getFullYear();

        const sql = `SELECT
            alert_type,
            severity,
            status,
            COUNT(*) as count,
            SUM(budget_amount) as total_budget,
            SUM(spent_amount) as total_spent
        FROM budget_alerts
        WHERE fiscal_year = ? OR fiscal_year IS NULL
        GROUP BY alert_type, severity, status
        ORDER BY
            CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
            count DESC`;

        db.all(sql, [year], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                fiscal_year: year,
                summary: rows
            });
        });
    });

    /**
     * POST /api/budget-control/alerts/:id/acknowledge
     * Acknowledge a budget alert
     */
    router.post('/budget-control/alerts/:id/acknowledge', verifyToken, async (req, res) => {
        try {
            const { id } = req.params;
            const { notes } = req.body;

            const result = await budgetService.resolveAlert({
                alert_id: id,
                action: 'acknowledge',
                resolved_by: req.user.username,
                resolution_notes: notes
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/alerts/:id/resolve
     * Resolve a budget alert
     */
    router.post('/budget-control/alerts/:id/resolve', verifyToken, async (req, res) => {
        try {
            const { id } = req.params;
            const { resolution_notes } = req.body;

            if (!resolution_notes) {
                return res.status(400).json({ error: 'Resolution notes are required' });
            }

            const result = await budgetService.resolveAlert({
                alert_id: id,
                action: 'resolve',
                resolved_by: req.user.username,
                resolution_notes
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ================================================================
    // BUDGET REPORTS
    // ================================================================

    /**
     * GET /api/budget-control/report/utilization
     * Get budget utilization report
     */
    router.get('/budget-control/report/utilization', verifyToken, async (req, res) => {
        try {
            const { fiscal_year, fund_source_id, chapter_code } = req.query;

            const report = await budgetService.getBudgetUtilizationReport({
                fiscal_year: fiscal_year ? parseInt(fiscal_year) : undefined,
                fund_source_id,
                chapter_code
            });

            res.json(report);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/budget-control/report/variance
     * Get budget variance report (actual vs budget)
     */
    router.get('/budget-control/report/variance', verifyToken, (req, res) => {
        const { fiscal_year, chapter_code } = req.query;
        const year = parseInt(fiscal_year) || new Date().getFullYear();

        const sql = `SELECT
            be.item_code,
            be.item_name,
            be.budget_type,
            be.chapter_code,
            be.allocated_amount as budget_amount,
            COALESCE(be.spent_amount, 0) as actual_amount,
            (COALESCE(be.spent_amount, 0) - be.allocated_amount) as variance_amount,
            ROUND((COALESCE(be.spent_amount, 0) - be.allocated_amount) * 100.0 / NULLIF(be.allocated_amount, 0), 2) as variance_percent,
            CASE
                WHEN COALESCE(be.spent_amount, 0) > be.allocated_amount THEN 'OVER'
                WHEN COALESCE(be.spent_amount, 0) < be.allocated_amount * 0.8 THEN 'UNDER'
                ELSE 'ON_TRACK'
            END as variance_status
        FROM budget_estimates be
        WHERE be.fiscal_year = ? AND be.status = 'EXECUTING'
        ${chapter_code ? 'AND be.chapter_code = ?' : ''}
        ORDER BY
            CASE
                WHEN COALESCE(be.spent_amount, 0) > be.allocated_amount THEN 1
                ELSE 2
            END,
            ABS(COALESCE(be.spent_amount, 0) - be.allocated_amount) DESC`;

        const params = chapter_code ? [year, chapter_code] : [year];

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            // Calculate summary
            const overBudget = rows.filter(r => r.variance_status === 'OVER');
            const underBudget = rows.filter(r => r.variance_status === 'UNDER');

            res.json({
                fiscal_year: year,
                generated_at: new Date().toISOString(),
                summary: {
                    total_items: rows.length,
                    over_budget_count: overBudget.length,
                    under_budget_count: underBudget.length,
                    on_track_count: rows.length - overBudget.length - underBudget.length,
                    total_over_amount: overBudget.reduce((sum, r) => sum + r.variance_amount, 0),
                    total_under_amount: Math.abs(underBudget.reduce((sum, r) => sum + r.variance_amount, 0))
                },
                items: rows
            });
        });
    });

    /**
     * GET /api/budget-control/dashboard
     * Get budget control dashboard data
     */
    router.get('/budget-control/dashboard', verifyToken, async (req, res) => {
        try {
            const { fiscal_year } = req.query;
            const year = parseInt(fiscal_year) || new Date().getFullYear();

            const queries = [
                // Total budget summary
                new Promise((resolve, reject) => {
                    db.get(`SELECT
                        SUM(allocated_amount) as total_allocated,
                        SUM(COALESCE(committed_amount, 0)) as total_committed,
                        SUM(COALESCE(spent_amount, 0)) as total_spent,
                        SUM(allocated_amount - COALESCE(committed_amount, 0) - COALESCE(spent_amount, 0)) as total_available
                    FROM budget_estimates
                    WHERE fiscal_year = ? AND status = 'EXECUTING'`, [year], (err, row) => {
                        if (err) reject(err);
                        else resolve({ budgetSummary: row });
                    });
                }),

                // Pending authorizations count
                new Promise((resolve, reject) => {
                    db.get(`SELECT COUNT(*) as count FROM budget_authorizations
                        WHERE status = 'PENDING' AND expires_at > datetime('now')`, (err, row) => {
                        if (err) reject(err);
                        else resolve({ pendingAuthorizations: row?.count || 0 });
                    });
                }),

                // Active alerts count by severity
                new Promise((resolve, reject) => {
                    db.all(`SELECT severity, COUNT(*) as count FROM budget_alerts
                        WHERE status = 'ACTIVE'
                        GROUP BY severity`, (err, rows) => {
                        if (err) reject(err);
                        else resolve({ alertsBySeverity: rows });
                    });
                }),

                // Period status
                new Promise((resolve, reject) => {
                    db.all(`SELECT period_number, period_name, is_locked, status
                        FROM budget_periods
                        WHERE fiscal_year = ? AND period_type = 'MONTHLY'
                        ORDER BY period_number`, [year], (err, rows) => {
                        if (err) reject(err);
                        else resolve({ periodStatus: rows });
                    });
                }),

                // Over-budget items
                new Promise((resolve, reject) => {
                    db.all(`SELECT item_code, item_name, allocated_amount, spent_amount,
                        (spent_amount - allocated_amount) as over_amount
                    FROM budget_estimates
                    WHERE fiscal_year = ? AND status = 'EXECUTING' AND spent_amount > allocated_amount
                    ORDER BY over_amount DESC LIMIT 5`, [year], (err, rows) => {
                        if (err) reject(err);
                        else resolve({ overBudgetItems: rows });
                    });
                }),

                // Recent transactions
                new Promise((resolve, reject) => {
                    db.all(`SELECT bt.*, be.item_name
                    FROM budget_transactions bt
                    LEFT JOIN budget_estimates be ON bt.budget_estimate_id = be.id
                    WHERE bt.fiscal_year = ?
                    ORDER BY bt.created_at DESC LIMIT 10`, [year], (err, rows) => {
                        if (err) reject(err);
                        else resolve({ recentTransactions: rows });
                    });
                })
            ];

            const results = await Promise.all(queries);
            const dashboard = results.reduce((acc, curr) => ({ ...acc, ...curr }), {
                fiscal_year: year,
                generated_at: new Date().toISOString()
            });

            // Calculate utilization
            if (dashboard.budgetSummary && dashboard.budgetSummary.total_allocated > 0) {
                dashboard.utilizationPercent = (
                    (dashboard.budgetSummary.total_spent + dashboard.budgetSummary.total_committed) /
                    dashboard.budgetSummary.total_allocated * 100
                ).toFixed(2);
            } else {
                dashboard.utilizationPercent = 0;
            }

            res.json(dashboard);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ================================================================
    // APPROVAL WORKFLOW RULES
    // ================================================================

    /**
     * GET /api/budget-control/workflow-rules
     * Get approval workflow rules
     */
    router.get('/budget-control/workflow-rules', verifyToken, (req, res) => {
        const { rule_type, is_active = 1 } = req.query;

        let sql = `SELECT * FROM approval_workflow_rules WHERE is_active = ?`;
        const params = [is_active];

        if (rule_type) {
            sql += ` AND rule_type = ?`;
            params.push(rule_type);
        }

        sql += ` ORDER BY min_amount ASC`;

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * PUT /api/budget-control/workflow-rules/:id
     * Update an approval workflow rule
     */
    router.put('/budget-control/workflow-rules/:id', verifyToken, requireRole('admin'), (req, res) => {
        const { id } = req.params;
        const {
            rule_name,
            min_amount,
            max_amount,
            required_approvers,
            required_role,
            approval_deadline_hours,
            is_active
        } = req.body;

        const sql = `UPDATE approval_workflow_rules
            SET rule_name = COALESCE(?, rule_name),
                min_amount = COALESCE(?, min_amount),
                max_amount = COALESCE(?, max_amount),
                required_approvers = COALESCE(?, required_approvers),
                required_role = COALESCE(?, required_role),
                approval_deadline_hours = COALESCE(?, approval_deadline_hours),
                is_active = COALESCE(?, is_active),
                updated_at = ?
            WHERE id = ?`;

        db.run(sql, [
            rule_name, min_amount, max_amount, required_approvers,
            required_role, approval_deadline_hours,
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            new Date().toISOString(),
            id
        ], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            if (this.changes > 0) {
                auditService.logAudit({
                    entity_type: 'APPROVAL_RULE',
                    entity_id: id,
                    action: 'UPDATE',
                    username: req.user.username,
                    user_id: req.user.id,
                    ip_address: req.ip,
                    new_values: req.body
                });
            }

            res.json({ success: this.changes > 0 });
        });
    });

    return router;
};
