/**
 * Budget Control Routes
 * SyntexLegger - Hệ thống Kiểm soát Ngân sách nội bộ theo TT 99/2025/TT-BTC
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

    // ================================================================
    // BUDGET SETTLEMENT (QUYẾT TOÁN) ENDPOINTS
    // ================================================================

    /**
     * GET /api/budget-control/settlement
     * Get settlement data for a fiscal year
     */
    router.get('/budget-control/settlement', verifyToken, async (req, res) => {
        try {
            const { fiscal_year, fund_type, company_id = '1' } = req.query;
            const year = parseInt(fiscal_year) || new Date().getFullYear();

            let sql = `
                SELECT
                    be.id,
                    fs.id as fund_source_id,
                    fs.code as fund_source_code,
                    fs.name as fund_source_name,
                    fs.type as fund_source_type,
                    be.chapter_code,
                    be.item_code,
                    be.item_name,
                    be.allocated_amount,
                    COALESCE(
                        (SELECT SUM(adj.allocated_amount - be.allocated_amount)
                         FROM budget_estimates adj
                         WHERE adj.parent_id = be.id AND adj.version > be.version),
                        0
                    ) as adjusted_amount,
                    be.allocated_amount + COALESCE(
                        (SELECT SUM(adj.allocated_amount - be.allocated_amount)
                         FROM budget_estimates adj
                         WHERE adj.parent_id = be.id AND adj.version > be.version),
                        0
                    ) as final_allocated,
                    COALESCE(be.spent_amount, 0) as spent_amount,
                    be.allocated_amount + COALESCE(
                        (SELECT SUM(adj.allocated_amount - be.allocated_amount)
                         FROM budget_estimates adj
                         WHERE adj.parent_id = be.id AND adj.version > be.version),
                        0
                    ) - COALESCE(be.spent_amount, 0) as remaining_amount,
                    CASE
                        WHEN be.status = 'CLOSED' THEN 'APPROVED'
                        WHEN EXISTS (SELECT 1 FROM budget_settlements bs WHERE bs.budget_estimate_id = be.id AND bs.status = 'SUBMITTED') THEN 'SUBMITTED'
                        WHEN EXISTS (SELECT 1 FROM budget_settlements bs WHERE bs.budget_estimate_id = be.id AND bs.status = 'REJECTED') THEN 'REJECTED'
                        ELSE 'PENDING'
                    END as settlement_status,
                    be.fiscal_year
                FROM budget_estimates be
                LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
                WHERE be.fiscal_year = ?
                  AND be.company_id = ?
                  AND be.version = (
                      SELECT MAX(be2.version)
                      FROM budget_estimates be2
                      WHERE be2.chapter_code = be.chapter_code
                        AND be2.item_code = be.item_code
                        AND be2.fund_source_id = be.fund_source_id
                        AND be2.fiscal_year = be.fiscal_year
                  )`;

            const params = [year, company_id];

            if (fund_type && fund_type !== 'ALL') {
                sql += ` AND fs.type = ?`;
                params.push(fund_type);
            }

            sql += ` ORDER BY fs.code, be.chapter_code, be.item_code`;

            db.all(sql, params, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });

                // Calculate variance for each row
                const data = rows.map(row => ({
                    ...row,
                    variance_amount: row.remaining_amount,
                    variance_percent: row.final_allocated > 0
                        ? ((row.remaining_amount / row.final_allocated) * 100).toFixed(2)
                        : 0
                }));

                res.json({
                    fiscal_year: year,
                    data
                });
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/budget-control/settlement/summary
     * Get settlement summary for a fiscal year
     */
    router.get('/budget-control/settlement/summary', verifyToken, async (req, res) => {
        try {
            const { fiscal_year, fund_type, company_id = '1' } = req.query;
            const year = parseInt(fiscal_year) || new Date().getFullYear();

            // Get totals
            let totalsSql = `
                SELECT
                    SUM(be.allocated_amount) as total_allocated,
                    SUM(COALESCE(be.spent_amount, 0)) as total_spent,
                    SUM(be.allocated_amount - COALESCE(be.spent_amount, 0)) as total_remaining
                FROM budget_estimates be
                LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
                WHERE be.fiscal_year = ? AND be.company_id = ?
                  AND be.status IN ('APPROVED', 'EXECUTING', 'CLOSED')`;

            const totalsParams = [year, company_id];
            if (fund_type && fund_type !== 'ALL') {
                totalsSql += ` AND fs.type = ?`;
                totalsParams.push(fund_type);
            }

            const totals = await new Promise((resolve, reject) => {
                db.get(totalsSql, totalsParams, (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { total_allocated: 0, total_spent: 0, total_remaining: 0 });
                });
            });

            // Get breakdown by fund type
            let byTypeSql = `
                SELECT
                    fs.type,
                    CASE fs.type
                        WHEN 'BUDGET_REGULAR' THEN 'Ngân sách thường xuyên'
                        WHEN 'BUDGET_NON_REGULAR' THEN 'Ngân sách không thường xuyên'
                        WHEN 'REVENUE_RETAINED' THEN 'Thu sự nghiệp'
                        WHEN 'AID' THEN 'Viện trợ/Vay'
                        ELSE 'Nguồn khác'
                    END as type_name,
                    SUM(be.allocated_amount) as allocated,
                    SUM(COALESCE(be.spent_amount, 0)) as spent,
                    SUM(be.allocated_amount - COALESCE(be.spent_amount, 0)) as remaining
                FROM budget_estimates be
                LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
                WHERE be.fiscal_year = ? AND be.company_id = ?
                  AND be.status IN ('APPROVED', 'EXECUTING', 'CLOSED')
                GROUP BY fs.type
                ORDER BY allocated DESC`;

            const byType = await new Promise((resolve, reject) => {
                db.all(byTypeSql, [year, company_id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

            // Get breakdown by chapter
            let byChapterSql = `
                SELECT
                    be.chapter_code,
                    CASE be.chapter_code
                        WHEN '018' THEN 'Giáo dục'
                        WHEN '030' THEN 'Y tế'
                        WHEN '040' THEN 'Văn hóa'
                        WHEN '050' THEN 'KH&CN'
                        WHEN '060' THEN 'Nông nghiệp'
                        ELSE 'Khác'
                    END as chapter_name,
                    SUM(be.allocated_amount) as allocated,
                    SUM(COALESCE(be.spent_amount, 0)) as spent
                FROM budget_estimates be
                WHERE be.fiscal_year = ? AND be.company_id = ?
                  AND be.status IN ('APPROVED', 'EXECUTING', 'CLOSED')
                GROUP BY be.chapter_code
                ORDER BY allocated DESC`;

            const byChapter = await new Promise((resolve, reject) => {
                db.all(byChapterSql, [year, company_id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

            const totalAllocated = totals.total_allocated || 0;
            const totalSpent = totals.total_spent || 0;

            res.json({
                fiscal_year: year,
                total_allocated: totalAllocated,
                total_spent: totalSpent,
                total_remaining: totals.total_remaining || 0,
                total_variance: totals.total_remaining || 0,
                settlement_rate: totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100) : 0,
                by_fund_type: byType,
                by_chapter: byChapter
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/settlement/submit
     * Submit settlement report for approval
     */
    router.post('/budget-control/settlement/submit', verifyToken, requireRole('admin', 'accountant', 'chief_accountant'), async (req, res) => {
        try {
            const { fiscal_year, submitted_by, notes } = req.body;
            const year = parseInt(fiscal_year) || new Date().getFullYear();

            // Create settlement submission record
            const id = `SETTLE_${year}_${Date.now()}`;
            const now = new Date().toISOString();

            // Check if budget_settlements table exists, if not create it
            await new Promise((resolve, reject) => {
                db.run(`CREATE TABLE IF NOT EXISTS budget_settlements (
                    id TEXT PRIMARY KEY,
                    fiscal_year INTEGER NOT NULL,
                    company_id TEXT DEFAULT '1',
                    budget_estimate_id TEXT,
                    submitted_by TEXT NOT NULL,
                    submitted_at TEXT NOT NULL,
                    status TEXT DEFAULT 'SUBMITTED',
                    approved_by TEXT,
                    approved_at TEXT,
                    rejection_reason TEXT,
                    notes TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`, [], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Insert settlement record
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO budget_settlements (id, fiscal_year, submitted_by, submitted_at, status, notes, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 'SUBMITTED', ?, ?, ?)`,
                    [id, year, submitted_by || req.user.username, now, notes, now, now], function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    });
            });

            // Log audit
            auditService.logAudit({
                entity_type: 'BUDGET_SETTLEMENT',
                entity_id: id,
                action: 'SUBMIT',
                action_category: 'SETTLEMENT',
                username: req.user.username,
                user_id: req.user.id,
                ip_address: req.ip,
                new_values: { fiscal_year: year, submitted_by }
            });

            res.json({
                success: true,
                settlement_id: id,
                message: `Đã nộp quyết toán năm ${year} thành công`
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/budget-control/settlement/status/:fiscalYear
     * Get settlement status for a fiscal year
     */
    router.get('/budget-control/settlement/status/:fiscalYear', verifyToken, async (req, res) => {
        try {
            const { fiscalYear } = req.params;
            const year = parseInt(fiscalYear);

            const settlement = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM budget_settlements WHERE fiscal_year = ? ORDER BY submitted_at DESC LIMIT 1`,
                    [year], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
            });

            if (settlement) {
                res.json({
                    fiscal_year: year,
                    status: settlement.status,
                    submitted_at: settlement.submitted_at,
                    submitted_by: settlement.submitted_by,
                    approved_at: settlement.approved_at,
                    approved_by: settlement.approved_by
                });
            } else {
                res.json({
                    fiscal_year: year,
                    status: 'NOT_SUBMITTED',
                    message: 'Chưa nộp quyết toán'
                });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ================================================================
    // BUDGET COMMITMENTS (CAM KẾT CHI) ENDPOINTS
    // ================================================================

    /**
     * Ensure budget_commitments table exists
     */
    const ensureCommitmentsTable = () => {
        return new Promise((resolve, reject) => {
            db.run(`CREATE TABLE IF NOT EXISTS budget_commitments (
                id TEXT PRIMARY KEY,
                doc_no TEXT UNIQUE NOT NULL,
                doc_date TEXT NOT NULL,
                fiscal_year INTEGER NOT NULL,
                company_id TEXT DEFAULT '1',
                reference_type TEXT NOT NULL,
                reference_id TEXT,
                reference_no TEXT,
                partner_name TEXT,
                description TEXT,
                budget_estimate_id TEXT,
                fund_source_id TEXT,
                amount REAL NOT NULL DEFAULT 0,
                released_amount REAL DEFAULT 0,
                remaining_amount REAL DEFAULT 0,
                status TEXT DEFAULT 'ACTIVE',
                created_by TEXT,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (budget_estimate_id) REFERENCES budget_estimates(id)
            )`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

    /**
     * GET /api/budget-control/commitments
     * Get list of budget commitments
     */
    router.get('/budget-control/commitments', verifyToken, async (req, res) => {
        try {
            await ensureCommitmentsTable();
            const { fiscal_year, status, company_id = '1' } = req.query;
            const year = parseInt(fiscal_year) || new Date().getFullYear();

            let sql = `
                SELECT bc.*, be.item_code as budget_item_code, be.item_name as budget_item_name, fs.name as fund_source_name
                FROM budget_commitments bc
                LEFT JOIN budget_estimates be ON bc.budget_estimate_id = be.id
                LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
                WHERE bc.fiscal_year = ? AND bc.company_id = ?`;
            const params = [year, company_id];

            if (status && status !== 'ALL') {
                sql += ` AND bc.status = ?`;
                params.push(status);
            }
            sql += ` ORDER BY bc.doc_date DESC, bc.doc_no DESC`;

            db.all(sql, params, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ fiscal_year: year, data: rows || [] });
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/budget-control/commitments/summary
     */
    router.get('/budget-control/commitments/summary', verifyToken, async (req, res) => {
        try {
            await ensureCommitmentsTable();
            const { fiscal_year, company_id = '1' } = req.query;
            const year = parseInt(fiscal_year) || new Date().getFullYear();

            const totals = await new Promise((resolve, reject) => {
                db.get(`SELECT COUNT(*) as total_commitments, COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(SUM(CASE WHEN status IN ('ACTIVE', 'PARTIALLY_RELEASED') THEN remaining_amount ELSE 0 END), 0) as active_amount,
                    COALESCE(SUM(released_amount), 0) as released_amount
                    FROM budget_commitments WHERE fiscal_year = ? AND company_id = ? AND status != 'CANCELLED'`,
                    [year, company_id], (err, row) => { if (err) reject(err); else resolve(row || {}); });
            });

            const byType = await new Promise((resolve, reject) => {
                db.all(`SELECT reference_type as type, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
                    FROM budget_commitments WHERE fiscal_year = ? AND company_id = ? AND status != 'CANCELLED' GROUP BY reference_type`,
                    [year, company_id], (err, rows) => { if (err) reject(err); else resolve(rows || []); });
            });

            res.json({ ...totals, by_type: byType });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/budget-control/availability
     */
    router.get('/budget-control/availability', verifyToken, (req, res) => {
        const { fiscal_year, company_id = '1' } = req.query;
        const year = parseInt(fiscal_year) || new Date().getFullYear();

        db.all(`SELECT be.id, be.item_code, be.item_name, fs.name as fund_source_name,
            COALESCE(be.allocated_amount, 0) as allocated_amount, COALESCE(be.committed_amount, 0) as committed_amount,
            COALESCE(be.spent_amount, 0) as spent_amount,
            COALESCE(be.allocated_amount - be.committed_amount - be.spent_amount, 0) as available_amount
            FROM budget_estimates be LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
            WHERE be.fiscal_year = ? AND be.company_id = ? AND be.status IN ('APPROVED', 'EXECUTING') ORDER BY be.item_code`,
            [year, company_id], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ data: rows || [] });
            });
    });

    // ================================================================
    // COST CENTERS (Trung tâm chi phí - Doanh nghiệp)
    // Replaces HCSN "Nguồn kinh phí" with enterprise terminology
    // ================================================================

    /**
     * GET /api/budget-control/cost-centers
     * Get list of cost centers (enterprise version of fund sources)
     */
    router.get('/budget-control/cost-centers', verifyToken, (req, res) => {
        const { company_id = '1', status = 'active' } = req.query;

        // Cost centers are stored in fund_sources table with enterprise-friendly naming
        let sql = `SELECT
            id, code, name, type, description,
            COALESCE(allocated_amount, 0) as allocated_amount,
            COALESCE(spent_amount, 0) as spent_amount,
            COALESCE(committed_amount, 0) as committed_amount,
            COALESCE(allocated_amount - spent_amount - committed_amount, 0) as available_amount,
            status, created_at, updated_at
        FROM fund_sources
        WHERE company_id = ?`;

        const params = [company_id];

        if (status && status !== 'all') {
            sql += ` AND status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY code`;

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            // Return mock data if no cost centers exist
            if (!rows || rows.length === 0) {
                return res.json([
                    { id: 'CC001', code: 'SX-2026', name: 'Bộ phận Sản xuất 2026', type: 'PRODUCTION', allocated_amount: 5000000000, spent_amount: 1200000000, committed_amount: 300000000, available_amount: 3500000000, status: 'active' },
                    { id: 'CC002', code: 'BH-2026', name: 'Bộ phận Bán hàng 2026', type: 'SALES', allocated_amount: 2000000000, spent_amount: 500000000, committed_amount: 100000000, available_amount: 1400000000, status: 'active' },
                    { id: 'CC003', code: 'QLDN-2026', name: 'Quản lý Doanh nghiệp 2026', type: 'ADMIN', allocated_amount: 500000000, spent_amount: 100000000, committed_amount: 50000000, available_amount: 350000000, status: 'active' }
                ]);
            }

            res.json(rows);
        });
    });

    /**
     * GET /api/budget-control/cost-centers/:id
     * Get a specific cost center by ID
     */
    router.get('/budget-control/cost-centers/:id', verifyToken, (req, res) => {
        const { id } = req.params;

        db.get(`SELECT * FROM fund_sources WHERE id = ?`, [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Cost center not found' });
            res.json(row);
        });
    });

    // ================================================================
    // BUDGET ESTIMATES (Dự toán ngân sách nội bộ)
    // ================================================================

    /**
     * GET /api/budget-control/budget-estimates
     * Get list of budget estimates
     */
    router.get('/budget-control/budget-estimates', verifyToken, (req, res) => {
        const { fiscal_year, company_id = '1', cost_center_id, status } = req.query;
        const year = parseInt(fiscal_year) || new Date().getFullYear();

        let sql = `SELECT
            be.id, be.item_code as code, be.item_name as name,
            be.budget_type, be.chapter_code, be.fund_source_id as cost_center_id,
            fs.code as cost_center_code, fs.name as cost_center_name,
            COALESCE(be.allocated_amount, 0) as allocated_amount,
            COALESCE(be.spent_amount, 0) as spent_amount,
            COALESCE(be.committed_amount, 0) as committed_amount,
            COALESCE(be.allocated_amount - be.spent_amount - be.committed_amount, 0) as available_amount,
            be.status, be.fiscal_year, be.created_at, be.updated_at
        FROM budget_estimates be
        LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
        WHERE be.fiscal_year = ? AND be.company_id = ?`;

        const params = [year, company_id];

        if (cost_center_id) {
            sql += ` AND be.fund_source_id = ?`;
            params.push(cost_center_id);
        }

        if (status && status !== 'all') {
            sql += ` AND be.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY be.item_code`;

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            // Return mock data if no estimates exist
            if (!rows || rows.length === 0) {
                return res.json({ data: [
                    { id: 'BE001', code: 'DT-VPP-2026', name: 'Văn phòng phẩm', cost_center_id: 'CC001', allocated_amount: 100000000, spent_amount: 30000000, available_amount: 70000000 },
                    { id: 'BE002', code: 'DT-CSVC-2026', name: 'Cơ sở vật chất', cost_center_id: 'CC001', allocated_amount: 500000000, spent_amount: 200000000, available_amount: 300000000 },
                    { id: 'BE003', code: 'DT-LUONG-2026', name: 'Chi lương', cost_center_id: 'CC001', allocated_amount: 2000000000, spent_amount: 800000000, available_amount: 1200000000 }
                ]});
            }

            res.json({ data: rows });
        });
    });

    /**
     * GET /api/budget-control/budget-estimates/:id
     * Get a specific budget estimate by ID
     */
    router.get('/budget-control/budget-estimates/:id', verifyToken, (req, res) => {
        const { id } = req.params;

        db.get(`SELECT be.*, fs.code as cost_center_code, fs.name as cost_center_name
            FROM budget_estimates be
            LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
            WHERE be.id = ?`, [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Budget estimate not found' });
            res.json(row);
        });
    });

    /**
     * POST /api/budget-control/commitments
     */
    router.post('/budget-control/commitments', verifyToken, async (req, res) => {
        try {
            await ensureCommitmentsTable();
            const { reference_type, reference_id, reference_no, partner_name, description, budget_estimate_id, amount, fiscal_year, company_id = '1' } = req.body;
            const year = parseInt(fiscal_year) || new Date().getFullYear();

            if (!budget_estimate_id || !amount) return res.status(400).json({ error: 'Vui lòng chọn dự toán và nhập số tiền' });

            const budget = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM budget_estimates WHERE id = ?`, [budget_estimate_id], (err, row) => { if (err) reject(err); else resolve(row); });
            });
            if (!budget) return res.status(404).json({ error: 'Không tìm thấy dự toán' });

            const available = (budget.allocated_amount || 0) - (budget.committed_amount || 0) - (budget.spent_amount || 0);
            if (amount > available) return res.status(400).json({ error: `Vượt quá số khả dụng: ${available.toLocaleString()} VND` });

            const now = new Date();
            const prefix = `CK-${year}-`;
            const lastDoc = await new Promise((resolve, reject) => {
                db.get(`SELECT doc_no FROM budget_commitments WHERE doc_no LIKE ? ORDER BY doc_no DESC LIMIT 1`, [`${prefix}%`], (err, row) => { if (err) reject(err); else resolve(row); });
            });
            let seq = 1;
            if (lastDoc && lastDoc.doc_no) { const parts = lastDoc.doc_no.split('-'); seq = parseInt(parts[parts.length - 1]) + 1 || 1; }
            const doc_no = `${prefix}${seq.toString().padStart(3, '0')}`;
            const id = `CMT_${year}_${Date.now()}`;
            const created_at = now.toISOString();

            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO budget_commitments (id, doc_no, doc_date, fiscal_year, company_id, reference_type, reference_id, reference_no, partner_name, description, budget_estimate_id, fund_source_id, amount, released_amount, remaining_amount, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'ACTIVE', ?, ?, ?)`,
                    [id, doc_no, created_at.split('T')[0], year, company_id, reference_type, reference_id, reference_no, partner_name, description, budget_estimate_id, budget.fund_source_id, amount, amount, req.user.username, created_at, created_at],
                    function (err) { if (err) reject(err); else resolve(); });
            });

            await new Promise((resolve, reject) => {
                db.run(`UPDATE budget_estimates SET committed_amount = COALESCE(committed_amount, 0) + ?, updated_at = ? WHERE id = ?`, [amount, created_at, budget_estimate_id], (err) => { if (err) reject(err); else resolve(); });
            });

            auditService.logAudit({ entity_type: 'BUDGET_COMMITMENT', entity_id: id, action: 'CREATE', username: req.user.username, new_values: { doc_no, amount } });
            res.json({ success: true, commitment_id: id, doc_no, message: `Tạo cam kết ${doc_no} thành công` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/commitments/:id/release
     */
    router.post('/budget-control/commitments/:id/release', verifyToken, async (req, res) => {
        try {
            const { id } = req.params;
            const { release_amount, voucher_no, notes } = req.body;
            if (!release_amount || release_amount <= 0) return res.status(400).json({ error: 'Số tiền phải > 0' });

            const commitment = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM budget_commitments WHERE id = ?`, [id], (err, row) => { if (err) reject(err); else resolve(row); });
            });
            if (!commitment) return res.status(404).json({ error: 'Không tìm thấy cam kết' });
            if (commitment.status === 'FULLY_RELEASED' || commitment.status === 'CANCELLED') return res.status(400).json({ error: 'Cam kết đã giải phóng hoặc đã hủy' });
            if (release_amount > commitment.remaining_amount) return res.status(400).json({ error: 'Vượt quá số còn lại' });

            const now = new Date().toISOString();
            const newReleased = (commitment.released_amount || 0) + release_amount;
            const newRemaining = commitment.amount - newReleased;
            const newStatus = newRemaining <= 0 ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED';

            await new Promise((resolve, reject) => {
                db.run(`UPDATE budget_commitments SET released_amount = ?, remaining_amount = ?, status = ?, updated_at = ? WHERE id = ?`, [newReleased, newRemaining, newStatus, now, id], (err) => { if (err) reject(err); else resolve(); });
            });

            await new Promise((resolve, reject) => {
                db.run(`UPDATE budget_estimates SET committed_amount = COALESCE(committed_amount, 0) - ?, spent_amount = COALESCE(spent_amount, 0) + ?, updated_at = ? WHERE id = ?`, [release_amount, release_amount, now, commitment.budget_estimate_id], (err) => { if (err) reject(err); else resolve(); });
            });

            auditService.logAudit({ entity_type: 'BUDGET_COMMITMENT', entity_id: id, action: 'RELEASE', username: req.user.username, new_values: { release_amount, voucher_no, notes } });
            res.json({ success: true, message: `Giải phóng ${release_amount.toLocaleString()} VND thành công` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/commitments/:id/cancel
     */
    router.post('/budget-control/commitments/:id/cancel', verifyToken, async (req, res) => {
        try {
            const { id } = req.params;
            const commitment = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM budget_commitments WHERE id = ?`, [id], (err, row) => { if (err) reject(err); else resolve(row); });
            });
            if (!commitment) return res.status(404).json({ error: 'Không tìm thấy cam kết' });
            if (commitment.status === 'CANCELLED') return res.status(400).json({ error: 'Đã hủy trước đó' });
            if (commitment.status === 'FULLY_RELEASED') return res.status(400).json({ error: 'Không thể hủy cam kết đã giải phóng' });

            const now = new Date().toISOString();
            const amountToRestore = commitment.remaining_amount || 0;

            await new Promise((resolve, reject) => { db.run(`UPDATE budget_commitments SET status = 'CANCELLED', updated_at = ? WHERE id = ?`, [now, id], (err) => { if (err) reject(err); else resolve(); }); });
            if (amountToRestore > 0) {
                await new Promise((resolve, reject) => { db.run(`UPDATE budget_estimates SET committed_amount = COALESCE(committed_amount, 0) - ?, updated_at = ? WHERE id = ?`, [amountToRestore, now, commitment.budget_estimate_id], (err) => { if (err) reject(err); else resolve(); }); });
            }

            auditService.logAudit({ entity_type: 'BUDGET_COMMITMENT', entity_id: id, action: 'CANCEL', username: req.user.username, new_values: { restored_amount: amountToRestore } });
            res.json({ success: true, message: `Hủy cam kết thành công. Khôi phục ${amountToRestore.toLocaleString()} VND` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ================================================================
    // BUDGET TRANSFERS (CHUYỂN NGUỒN) ENDPOINTS
    // ================================================================

    /**
     * Ensure budget_transfers table exists
     */
    const ensureTransfersTable = () => {
        return new Promise((resolve, reject) => {
            db.run(`CREATE TABLE IF NOT EXISTS budget_transfers (
                id TEXT PRIMARY KEY,
                transfer_no TEXT UNIQUE NOT NULL,
                transfer_date TEXT NOT NULL,
                fiscal_year INTEGER NOT NULL,
                company_id TEXT DEFAULT '1',
                from_fund_source_id TEXT,
                from_budget_estimate_id TEXT,
                to_fund_source_id TEXT,
                to_budget_estimate_id TEXT,
                amount REAL NOT NULL DEFAULT 0,
                reason TEXT NOT NULL,
                notes TEXT,
                decision_no TEXT,
                status TEXT DEFAULT 'DRAFT',
                requested_by TEXT NOT NULL,
                requested_at TEXT NOT NULL,
                approved_by TEXT,
                approved_at TEXT,
                rejection_reason TEXT,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (from_fund_source_id) REFERENCES fund_sources(id),
                FOREIGN KEY (to_fund_source_id) REFERENCES fund_sources(id),
                FOREIGN KEY (from_budget_estimate_id) REFERENCES budget_estimates(id),
                FOREIGN KEY (to_budget_estimate_id) REFERENCES budget_estimates(id)
            )`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

    /**
     * GET /api/budget-control/transfers
     * Get list of budget transfers
     */
    router.get('/budget-control/transfers', verifyToken, async (req, res) => {
        try {
            await ensureTransfersTable();
            const { fiscal_year, status, company_id = '1' } = req.query;
            const year = parseInt(fiscal_year) || new Date().getFullYear();

            let sql = `
                SELECT bt.*,
                    fs_from.code as from_fund_source_code, fs_from.name as from_fund_source_name,
                    fs_to.code as to_fund_source_code, fs_to.name as to_fund_source_name,
                    be_from.item_code as from_budget_code, be_from.item_name as from_budget_name,
                    be_to.item_code as to_budget_code, be_to.item_name as to_budget_name
                FROM budget_transfers bt
                LEFT JOIN fund_sources fs_from ON bt.from_fund_source_id = fs_from.id
                LEFT JOIN fund_sources fs_to ON bt.to_fund_source_id = fs_to.id
                LEFT JOIN budget_estimates be_from ON bt.from_budget_estimate_id = be_from.id
                LEFT JOIN budget_estimates be_to ON bt.to_budget_estimate_id = be_to.id
                WHERE bt.fiscal_year = ? AND bt.company_id = ?`;

            const params = [year, company_id];

            if (status && status !== 'ALL') {
                sql += ` AND bt.status = ?`;
                params.push(status);
            }

            sql += ` ORDER BY bt.transfer_date DESC, bt.transfer_no DESC`;

            db.all(sql, params, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows || []);
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/budget-control/transfers/summary
     * Get transfer summary statistics
     */
    router.get('/budget-control/transfers/summary', verifyToken, async (req, res) => {
        try {
            await ensureTransfersTable();
            const { fiscal_year, company_id = '1' } = req.query;
            const year = parseInt(fiscal_year) || new Date().getFullYear();

            const totals = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT
                        COUNT(*) as total_transfers,
                        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) as pending_count,
                        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END), 0) as approved_count,
                        COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END), 0) as rejected_count,
                        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as total_approved_amount,
                        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as total_pending_amount
                    FROM budget_transfers
                    WHERE fiscal_year = ? AND company_id = ?`,
                    [year, company_id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row || {});
                    });
            });

            res.json({
                fiscal_year: year,
                ...totals
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/budget-control/transfers/pending
     * Get pending transfers for approval
     */
    router.get('/budget-control/transfers/pending', verifyToken, requireRole('admin', 'chief_accountant'), async (req, res) => {
        try {
            await ensureTransfersTable();
            const { company_id = '1' } = req.query;

            const sql = `
                SELECT bt.*,
                    fs_from.code as from_fund_source_code, fs_from.name as from_fund_source_name,
                    fs_to.code as to_fund_source_code, fs_to.name as to_fund_source_name
                FROM budget_transfers bt
                LEFT JOIN fund_sources fs_from ON bt.from_fund_source_id = fs_from.id
                LEFT JOIN fund_sources fs_to ON bt.to_fund_source_id = fs_to.id
                WHERE bt.status = 'PENDING' AND bt.company_id = ?
                ORDER BY bt.requested_at ASC`;

            db.all(sql, [company_id], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    count: rows?.length || 0,
                    transfers: rows || []
                });
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/transfers
     * Create a new budget transfer request
     */
    router.post('/budget-control/transfers', verifyToken, async (req, res) => {
        try {
            await ensureTransfersTable();
            const {
                from_fund_source_id, from_budget_estimate_id,
                to_fund_source_id, to_budget_estimate_id,
                amount, reason, notes, decision_no,
                fiscal_year, company_id = '1'
            } = req.body;

            const year = parseInt(fiscal_year) || new Date().getFullYear();

            if (!from_fund_source_id || !to_fund_source_id) {
                return res.status(400).json({ error: 'Vui lòng chọn nguồn chuyển đi và nguồn nhận' });
            }
            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
            }
            if (!reason) {
                return res.status(400).json({ error: 'Vui lòng nhập lý do chuyển nguồn' });
            }

            // Check source availability
            if (from_budget_estimate_id) {
                const fromBudget = await new Promise((resolve, reject) => {
                    db.get(`SELECT * FROM budget_estimates WHERE id = ?`, [from_budget_estimate_id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                if (!fromBudget) {
                    return res.status(404).json({ error: 'Không tìm thấy dự toán nguồn' });
                }
                const available = (fromBudget.allocated_amount || 0) - (fromBudget.committed_amount || 0) - (fromBudget.spent_amount || 0);
                if (amount > available) {
                    return res.status(400).json({ error: `Vượt quá số khả dụng của nguồn: ${available.toLocaleString()} VND` });
                }
            }

            const now = new Date();
            const prefix = `CN-${year}/`;
            const lastDoc = await new Promise((resolve, reject) => {
                db.get(`SELECT transfer_no FROM budget_transfers WHERE transfer_no LIKE ? ORDER BY transfer_no DESC LIMIT 1`,
                    [`${prefix}%`], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
            });

            let seq = 1;
            if (lastDoc && lastDoc.transfer_no) {
                const parts = lastDoc.transfer_no.split('/');
                seq = parseInt(parts[parts.length - 1]) + 1 || 1;
            }
            const transfer_no = `${prefix}${seq.toString().padStart(3, '0')}`;
            const id = `TRF_${year}_${Date.now()}`;
            const created_at = now.toISOString();

            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO budget_transfers (
                    id, transfer_no, transfer_date, fiscal_year, company_id,
                    from_fund_source_id, from_budget_estimate_id,
                    to_fund_source_id, to_budget_estimate_id,
                    amount, reason, notes, decision_no, status,
                    requested_by, requested_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?)`,
                    [id, transfer_no, created_at.split('T')[0], year, company_id,
                        from_fund_source_id, from_budget_estimate_id,
                        to_fund_source_id, to_budget_estimate_id,
                        amount, reason, notes, decision_no,
                        req.user.username, created_at, created_at, created_at],
                    function (err) {
                        if (err) reject(err);
                        else resolve();
                    });
            });

            auditService.logAudit({
                entity_type: 'BUDGET_TRANSFER',
                entity_id: id,
                action: 'CREATE',
                username: req.user.username,
                new_values: { transfer_no, amount, reason }
            });

            res.json({
                success: true,
                transfer_id: id,
                transfer_no,
                message: `Tạo yêu cầu chuyển nguồn ${transfer_no} thành công`
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/transfers/:id/submit
     * Submit transfer request for approval
     */
    router.post('/budget-control/transfers/:id/submit', verifyToken, async (req, res) => {
        try {
            const { id } = req.params;
            const now = new Date().toISOString();

            const transfer = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM budget_transfers WHERE id = ?`, [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!transfer) {
                return res.status(404).json({ error: 'Không tìm thấy yêu cầu chuyển nguồn' });
            }
            if (transfer.status !== 'DRAFT') {
                return res.status(400).json({ error: 'Chỉ có thể gửi phê duyệt yêu cầu ở trạng thái Nháp' });
            }

            await new Promise((resolve, reject) => {
                db.run(`UPDATE budget_transfers SET status = 'PENDING', updated_at = ? WHERE id = ?`,
                    [now, id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });

            auditService.logAudit({
                entity_type: 'BUDGET_TRANSFER',
                entity_id: id,
                action: 'SUBMIT',
                username: req.user.username
            });

            res.json({ success: true, message: 'Đã gửi yêu cầu chuyển nguồn để phê duyệt' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/transfers/:id/approve
     * Approve a budget transfer request
     */
    router.post('/budget-control/transfers/:id/approve', verifyToken, requireRole('admin', 'chief_accountant'), async (req, res) => {
        try {
            const { id } = req.params;
            const now = new Date().toISOString();

            const transfer = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM budget_transfers WHERE id = ?`, [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!transfer) {
                return res.status(404).json({ error: 'Không tìm thấy yêu cầu chuyển nguồn' });
            }
            if (transfer.status !== 'PENDING') {
                return res.status(400).json({ error: 'Chỉ có thể phê duyệt yêu cầu đang chờ duyệt' });
            }

            // Update transfer status
            await new Promise((resolve, reject) => {
                db.run(`UPDATE budget_transfers SET status = 'APPROVED', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?`,
                    [req.user.username, now, now, id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });

            // Update budget amounts if budget estimate IDs are specified
            if (transfer.from_budget_estimate_id) {
                await new Promise((resolve, reject) => {
                    db.run(`UPDATE budget_estimates SET
                        allocated_amount = COALESCE(allocated_amount, 0) - ?,
                        updated_at = ?
                        WHERE id = ?`,
                        [transfer.amount, now, transfer.from_budget_estimate_id], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                });
            }

            if (transfer.to_budget_estimate_id) {
                await new Promise((resolve, reject) => {
                    db.run(`UPDATE budget_estimates SET
                        allocated_amount = COALESCE(allocated_amount, 0) + ?,
                        updated_at = ?
                        WHERE id = ?`,
                        [transfer.amount, now, transfer.to_budget_estimate_id], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                });
            }

            // Record budget transaction for audit trail
            const transactionId = `TRX_TRF_${Date.now()}`;
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO budget_transactions (
                    id, budget_estimate_id, fund_source_id, transaction_type,
                    transaction_date, doc_no, description, amount,
                    fiscal_year, fiscal_period, authorized_by, created_by, created_at
                ) VALUES (?, ?, ?, 'TRANSFER', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [transactionId, transfer.to_budget_estimate_id, transfer.to_fund_source_id,
                        transfer.transfer_date, transfer.transfer_no,
                        `Chuyển nguồn: ${transfer.reason}`, transfer.amount,
                        transfer.fiscal_year, new Date(transfer.transfer_date).getMonth() + 1,
                        req.user.username, req.user.username, now],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });

            auditService.logAudit({
                entity_type: 'BUDGET_TRANSFER',
                entity_id: id,
                action: 'APPROVE',
                username: req.user.username,
                new_values: { amount: transfer.amount }
            });

            res.json({
                success: true,
                message: `Đã phê duyệt chuyển nguồn ${transfer.transfer_no}. Số tiền ${transfer.amount.toLocaleString()} VND đã được điều chuyển.`
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/transfers/:id/reject
     * Reject a budget transfer request
     */
    router.post('/budget-control/transfers/:id/reject', verifyToken, requireRole('admin', 'chief_accountant'), async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const now = new Date().toISOString();

            if (!reason) {
                return res.status(400).json({ error: 'Vui lòng nhập lý do từ chối' });
            }

            const transfer = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM budget_transfers WHERE id = ?`, [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!transfer) {
                return res.status(404).json({ error: 'Không tìm thấy yêu cầu chuyển nguồn' });
            }
            if (transfer.status !== 'PENDING') {
                return res.status(400).json({ error: 'Chỉ có thể từ chối yêu cầu đang chờ duyệt' });
            }

            await new Promise((resolve, reject) => {
                db.run(`UPDATE budget_transfers SET
                    status = 'REJECTED', approved_by = ?, approved_at = ?,
                    rejection_reason = ?, updated_at = ?
                    WHERE id = ?`,
                    [req.user.username, now, reason, now, id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });

            auditService.logAudit({
                entity_type: 'BUDGET_TRANSFER',
                entity_id: id,
                action: 'REJECT',
                username: req.user.username,
                new_values: { rejection_reason: reason }
            });

            res.json({ success: true, message: 'Đã từ chối yêu cầu chuyển nguồn' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/budget-control/transfers/:id/cancel
     * Cancel a draft transfer request
     */
    router.post('/budget-control/transfers/:id/cancel', verifyToken, async (req, res) => {
        try {
            const { id } = req.params;
            const now = new Date().toISOString();

            const transfer = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM budget_transfers WHERE id = ?`, [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!transfer) {
                return res.status(404).json({ error: 'Không tìm thấy yêu cầu chuyển nguồn' });
            }
            if (transfer.status !== 'DRAFT' && transfer.status !== 'PENDING') {
                return res.status(400).json({ error: 'Chỉ có thể hủy yêu cầu ở trạng thái Nháp hoặc Chờ duyệt' });
            }

            await new Promise((resolve, reject) => {
                db.run(`UPDATE budget_transfers SET status = 'CANCELLED', updated_at = ? WHERE id = ?`,
                    [now, id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });

            auditService.logAudit({
                entity_type: 'BUDGET_TRANSFER',
                entity_id: id,
                action: 'CANCEL',
                username: req.user.username
            });

            res.json({ success: true, message: 'Đã hủy yêu cầu chuyển nguồn' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/budget-control/transfers/:id
     * Get a specific transfer by ID
     */
    router.get('/budget-control/transfers/:id', verifyToken, async (req, res) => {
        try {
            await ensureTransfersTable();
            const { id } = req.params;

            const sql = `
                SELECT bt.*,
                    fs_from.code as from_fund_source_code, fs_from.name as from_fund_source_name,
                    fs_to.code as to_fund_source_code, fs_to.name as to_fund_source_name,
                    be_from.item_code as from_budget_code, be_from.item_name as from_budget_name,
                    be_to.item_code as to_budget_code, be_to.item_name as to_budget_name
                FROM budget_transfers bt
                LEFT JOIN fund_sources fs_from ON bt.from_fund_source_id = fs_from.id
                LEFT JOIN fund_sources fs_to ON bt.to_fund_source_id = fs_to.id
                LEFT JOIN budget_estimates be_from ON bt.from_budget_estimate_id = be_from.id
                LEFT JOIN budget_estimates be_to ON bt.to_budget_estimate_id = be_to.id
                WHERE bt.id = ?`;

            db.get(sql, [id], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!row) return res.status(404).json({ error: 'Không tìm thấy yêu cầu chuyển nguồn' });
                res.json(row);
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
