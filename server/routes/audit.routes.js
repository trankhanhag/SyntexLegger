/**
 * Audit Trail Routes
 * SyntexHCSN - Hệ thống Dấu vết Kiểm toán theo TT 24/2024/TT-BTC
 *
 * Provides API endpoints for audit trail management, querying,
 * anomaly detection, and compliance reporting.
 */

const express = require('express');
const { verifyToken, requireRole, sanitizeQuery } = require('../middleware');
const auditService = require('../services/audit.service');

module.exports = (db) => {
    const router = express.Router();

    // ================================================================
    // AUDIT TRAIL ENDPOINTS
    // ================================================================

    /**
     * GET /api/audit/health-check
     * Simple server status check
     */
    router.get('/audit/health-check', (req, res) => {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            features: ['audit_trail', 'budget_control', 'anomaly_detection']
        });
    });

    /**
     * GET /api/audit/trail
     * Query audit trail with filters
     */
    router.get('/audit/trail', sanitizeQuery, verifyToken, async (req, res) => {
        try {
            const {
                entity_type,
                entity_id,
                doc_no,
                action,
                username,
                from_date,
                to_date,
                fiscal_year,
                fiscal_period,
                approval_status,
                limit = 100,
                offset = 0
            } = req.query;

            const results = await auditService.queryAuditTrail({
                entity_type,
                entity_id,
                doc_no,
                action,
                username,
                from_date,
                to_date,
                fiscal_year: fiscal_year ? parseInt(fiscal_year) : undefined,
                fiscal_period: fiscal_period ? parseInt(fiscal_period) : undefined,
                approval_status,
                limit: Math.min(parseInt(limit) || 100, 1000),
                offset: parseInt(offset) || 0
            });

            // Get total count for pagination
            const countSql = `SELECT COUNT(*) as total FROM audit_trail`;
            db.get(countSql, [], (err, countRow) => {
                res.json({
                    data: results,
                    pagination: {
                        total: countRow?.total || results.length,
                        limit: parseInt(limit) || 100,
                        offset: parseInt(offset) || 0
                    }
                });
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/audit/trail/:entityType/:entityId
     * Get complete audit history for a specific entity
     */
    router.get('/audit/trail/:entityType/:entityId', verifyToken, async (req, res) => {
        try {
            const { entityType, entityId } = req.params;
            const history = await auditService.getEntityAuditHistory(entityType, entityId);

            res.json({
                entity_type: entityType,
                entity_id: entityId,
                history,
                count: history.length
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/audit/statistics
     * Get audit statistics for dashboard
     */
    router.get('/audit/statistics', verifyToken, async (req, res) => {
        try {
            const { fiscal_year, from_date, to_date } = req.query;
            const stats = await auditService.getAuditStatistics({
                fiscal_year: fiscal_year ? parseInt(fiscal_year) : undefined,
                from_date,
                to_date
            });

            res.json(stats);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/audit/verify/:auditId
     * Verify integrity of an audit record
     */
    router.post('/audit/verify/:auditId', verifyToken, requireRole('admin', 'chief_accountant'), async (req, res) => {
        try {
            const { auditId } = req.params;
            const result = await auditService.verifyAuditIntegrity(auditId);

            // Log this verification action
            await auditService.logAudit({
                entity_type: 'AUDIT_VERIFICATION',
                entity_id: auditId,
                action: 'VERIFY',
                action_category: 'SYSTEM',
                username: req.user.username,
                user_id: req.user.id,
                user_role: req.user.role,
                ip_address: req.ip,
                new_values: result
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ================================================================
    // ANOMALY DETECTION ENDPOINTS
    // ================================================================

    /**
     * GET /api/audit/anomalies
     * Query anomalies with filters
     */
    router.get('/audit/anomalies', sanitizeQuery, verifyToken, async (req, res) => {
        try {
            const {
                anomaly_type,
                severity,
                status,
                from_date,
                to_date,
                fiscal_year,
                limit = 100,
                offset = 0
            } = req.query;

            const results = await auditService.queryAnomalies({
                anomaly_type,
                severity,
                status,
                from_date,
                to_date,
                fiscal_year: fiscal_year ? parseInt(fiscal_year) : undefined,
                limit: Math.min(parseInt(limit) || 100, 1000),
                offset: parseInt(offset) || 0
            });

            res.json({
                data: results,
                count: results.length
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/audit/anomalies/summary
     * Get anomaly summary by type and severity
     */
    router.get('/audit/anomalies/summary', verifyToken, (req, res) => {
        const { fiscal_year } = req.query;
        const year = fiscal_year || new Date().getFullYear();

        const sql = `
            SELECT
                anomaly_type,
                severity,
                status,
                COUNT(*) as count,
                SUM(amount_impact) as total_impact
            FROM audit_anomalies
            WHERE fiscal_year = ? OR fiscal_year IS NULL
            GROUP BY anomaly_type, severity, status
            ORDER BY
                CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
                count DESC
        `;

        db.all(sql, [year], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                fiscal_year: year,
                summary: rows
            });
        });
    });

    /**
     * POST /api/audit/anomalies/:anomalyId/resolve
     * Resolve an anomaly
     */
    router.post('/audit/anomalies/:anomalyId/resolve', verifyToken, requireRole('admin', 'chief_accountant', 'accountant'), async (req, res) => {
        try {
            const { anomalyId } = req.params;
            const { resolution_notes, status = 'RESOLVED' } = req.body;

            const result = await auditService.resolveAnomaly(anomalyId, {
                resolved_by: req.user.username,
                resolution_notes,
                status
            });

            if (result.success) {
                // Log the resolution
                await auditService.logAudit({
                    entity_type: 'AUDIT_ANOMALY',
                    entity_id: anomalyId,
                    action: 'RESOLVE',
                    action_category: 'SYSTEM',
                    username: req.user.username,
                    user_id: req.user.id,
                    user_role: req.user.role,
                    ip_address: req.ip,
                    new_values: { status, resolution_notes },
                    reason: resolution_notes
                });
            }

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/audit/anomalies/:anomalyId/acknowledge
     * Acknowledge an anomaly
     */
    router.post('/audit/anomalies/:anomalyId/acknowledge', verifyToken, async (req, res) => {
        try {
            const { anomalyId } = req.params;
            const { notes } = req.body;

            const sql = `UPDATE audit_anomalies
                SET status = 'ACKNOWLEDGED', acknowledged_by = ?, acknowledged_at = ?
                WHERE id = ? AND status = 'OPEN'`;

            db.run(sql, [req.user.username, new Date().toISOString(), anomalyId], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: this.changes > 0 });
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/audit/run-detection
     * Run automated anomaly detection
     */
    router.post('/audit/run-detection', verifyToken, requireRole('admin', 'chief_accountant'), async (req, res) => {
        try {
            const { fiscal_year } = req.body;
            const detected = await auditService.runAnomalyDetection({
                fiscal_year: fiscal_year || new Date().getFullYear()
            });

            // Log this detection run
            await auditService.logAudit({
                entity_type: 'ANOMALY_DETECTION',
                entity_id: `RUN_${Date.now()}`,
                action: 'EXECUTE',
                action_category: 'SYSTEM',
                username: req.user.username,
                user_id: req.user.id,
                ip_address: req.ip,
                new_values: { detected_count: detected.length, fiscal_year }
            });

            res.json({
                message: 'Anomaly detection completed',
                detected_count: detected.length,
                anomalies: detected
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ================================================================
    // RECONCILIATION ENDPOINTS
    // ================================================================

    /**
     * GET /api/audit/reconciliations
     * Get reconciliation records
     */
    router.get('/audit/reconciliations', sanitizeQuery, verifyToken, (req, res) => {
        const { recon_type, fiscal_year, fiscal_period, status, limit = 50 } = req.query;

        let sql = `SELECT * FROM reconciliation_records WHERE 1=1`;
        const params = [];

        if (recon_type) {
            sql += ` AND recon_type = ?`;
            params.push(recon_type);
        }
        if (fiscal_year) {
            sql += ` AND fiscal_year = ?`;
            params.push(parseInt(fiscal_year));
        }
        if (fiscal_period) {
            sql += ` AND fiscal_period = ?`;
            params.push(parseInt(fiscal_period));
        }
        if (status) {
            sql += ` AND status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(parseInt(limit));

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            // Parse JSON fields
            const results = rows.map(row => ({
                ...row,
                outstanding_items: row.outstanding_items ? JSON.parse(row.outstanding_items) : [],
                adjustments: row.adjustments ? JSON.parse(row.adjustments) : []
            }));

            res.json(results);
        });
    });

    /**
     * POST /api/audit/reconciliations
     * Create a new reconciliation record
     */
    router.post('/audit/reconciliations', verifyToken, requireRole('admin', 'chief_accountant', 'accountant'), async (req, res) => {
        try {
            const {
                recon_type,
                fiscal_year,
                fiscal_period,
                period_start,
                period_end,
                account_code,
                bank_account_id,
                partner_code,
                book_balance,
                external_balance,
                outstanding_items = [],
                adjustments = [],
                notes
            } = req.body;

            const id = `RECON_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            const difference = (book_balance || 0) - (external_balance || 0);

            const sql = `INSERT INTO reconciliation_records (
                id, recon_type, fiscal_year, fiscal_period, period_start, period_end,
                account_code, bank_account_id, partner_code,
                book_balance, external_balance, difference,
                outstanding_items, adjustments, status, prepared_by, prepared_at, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`;

            db.run(sql, [
                id, recon_type, fiscal_year, fiscal_period, period_start, period_end,
                account_code, bank_account_id, partner_code,
                book_balance, external_balance, difference,
                JSON.stringify(outstanding_items), JSON.stringify(adjustments),
                req.user.username, new Date().toISOString(), notes
            ], function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Log audit
                auditService.logAudit({
                    entity_type: 'RECONCILIATION',
                    entity_id: id,
                    action: 'CREATE',
                    action_category: 'RECONCILIATION',
                    username: req.user.username,
                    user_id: req.user.id,
                    ip_address: req.ip,
                    new_values: { recon_type, fiscal_year, fiscal_period, difference }
                });

                res.json({ success: true, id, difference });
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/audit/reconciliations/:id/approve
     * Approve a reconciliation
     */
    router.put('/audit/reconciliations/:id/approve', verifyToken, requireRole('admin', 'chief_accountant'), (req, res) => {
        const { id } = req.params;
        const { notes } = req.body;

        const sql = `UPDATE reconciliation_records
            SET status = 'APPROVED', approved_by = ?, approved_at = ?, notes = COALESCE(notes || ' | ', '') || ?
            WHERE id = ? AND status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED')`;

        db.run(sql, [req.user.username, new Date().toISOString(), notes || '', id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            if (this.changes > 0) {
                auditService.logAudit({
                    entity_type: 'RECONCILIATION',
                    entity_id: id,
                    action: 'APPROVE',
                    action_category: 'RECONCILIATION',
                    username: req.user.username,
                    user_id: req.user.id,
                    ip_address: req.ip,
                    approval_status: 'APPROVED'
                });
            }

            res.json({ success: this.changes > 0 });
        });
    });

    // ================================================================
    // USER SESSION AUDIT ENDPOINTS
    // ================================================================

    /**
     * GET /api/audit/sessions
     * Get audit sessions
     */
    router.get('/audit/sessions', verifyToken, requireRole('admin'), (req, res) => {
        const { is_active, user_id, limit = 100 } = req.query;

        let sql = `SELECT * FROM audit_sessions WHERE 1=1`;
        const params = [];

        if (is_active !== undefined) {
            sql += ` AND is_active = ?`;
            params.push(is_active === 'true' ? 1 : 0);
        }
        if (user_id) {
            sql += ` AND user_id = ?`;
            params.push(user_id);
        }

        sql += ` ORDER BY login_at DESC LIMIT ?`;
        params.push(parseInt(limit));

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    // ================================================================
    // EXPORT ENDPOINTS
    // ================================================================

    /**
     * GET /api/audit/export
     * Export audit trail to CSV/JSON
     */
    router.get('/audit/export', verifyToken, requireRole('admin', 'chief_accountant'), async (req, res) => {
        try {
            const {
                format = 'json',
                entity_type,
                from_date,
                to_date,
                fiscal_year
            } = req.query;

            const results = await auditService.queryAuditTrail({
                entity_type,
                from_date,
                to_date,
                fiscal_year: fiscal_year ? parseInt(fiscal_year) : undefined,
                limit: 10000 // Higher limit for exports
            });

            // Log export action
            await auditService.logAudit({
                entity_type: 'AUDIT_EXPORT',
                entity_id: `EXPORT_${Date.now()}`,
                action: 'EXPORT',
                action_category: 'SYSTEM',
                username: req.user.username,
                user_id: req.user.id,
                ip_address: req.ip,
                new_values: { format, record_count: results.length, filters: { entity_type, from_date, to_date, fiscal_year } }
            });

            if (format === 'csv') {
                const headers = [
                    'ID', 'Entity Type', 'Entity ID', 'Doc No', 'Action', 'Category',
                    'Username', 'Role', 'Timestamp', 'Fiscal Year', 'Period',
                    'Amount', 'Account Code', 'Changed Fields', 'Reason'
                ];

                const csvRows = results.map(row => [
                    row.id,
                    row.entity_type,
                    row.entity_id,
                    row.doc_no || '',
                    row.action,
                    row.action_category || '',
                    row.username,
                    row.user_role || '',
                    row.created_at,
                    row.fiscal_year,
                    row.fiscal_period,
                    row.amount || '',
                    row.account_code || '',
                    (row.changed_fields || []).join('; '),
                    row.reason || ''
                ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));

                const csv = [headers.join(','), ...csvRows].join('\n');

                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename=audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
                res.send('\ufeff' + csv); // BOM for Excel UTF-8
            } else {
                res.json({
                    exported_at: new Date().toISOString(),
                    record_count: results.length,
                    data: results
                });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/audit/report/compliance
     * Generate compliance report for TT 24/2024
     */
    router.get('/audit/report/compliance', verifyToken, requireRole('admin', 'chief_accountant'), (req, res) => {
        const { fiscal_year } = req.query;
        const year = parseInt(fiscal_year) || new Date().getFullYear();

        const report = {
            fiscal_year: year,
            generated_at: new Date().toISOString(),
            generated_by: req.user.username,
            sections: {}
        };

        const queries = [
            // Total transactions
            new Promise((resolve, reject) => {
                db.get(`SELECT COUNT(*) as total, SUM(total_amount) as total_amount FROM vouchers
                    WHERE strftime('%Y', doc_date) = ?`, [year.toString()], (err, row) => {
                    if (err) reject(err);
                    else resolve({ transactions: row });
                });
            }),

            // Audit coverage
            new Promise((resolve, reject) => {
                db.all(`SELECT entity_type, action, COUNT(*) as count FROM audit_trail
                    WHERE fiscal_year = ? GROUP BY entity_type, action`, [year], (err, rows) => {
                    if (err) reject(err);
                    else resolve({ auditCoverage: rows });
                });
            }),

            // Open anomalies
            new Promise((resolve, reject) => {
                db.all(`SELECT anomaly_type, severity, COUNT(*) as count FROM audit_anomalies
                    WHERE (fiscal_year = ? OR fiscal_year IS NULL) AND status = 'OPEN'
                    GROUP BY anomaly_type, severity`, [year], (err, rows) => {
                    if (err) reject(err);
                    else resolve({ openAnomalies: rows });
                });
            }),

            // Budget compliance
            new Promise((resolve, reject) => {
                db.all(`SELECT
                    CASE WHEN spent_amount <= allocated_amount THEN 'COMPLIANT' ELSE 'OVERRUN' END as status,
                    COUNT(*) as count,
                    SUM(allocated_amount) as allocated,
                    SUM(spent_amount) as spent
                FROM budget_estimates
                WHERE fiscal_year = ? AND status = 'EXECUTING'
                GROUP BY CASE WHEN spent_amount <= allocated_amount THEN 'COMPLIANT' ELSE 'OVERRUN' END`, [year], (err, rows) => {
                    if (err) reject(err);
                    else resolve({ budgetCompliance: rows });
                });
            }),

            // Period closures
            new Promise((resolve, reject) => {
                db.all(`SELECT period_number, status, is_locked FROM budget_periods
                    WHERE fiscal_year = ? ORDER BY period_number`, [year], (err, rows) => {
                    if (err) reject(err);
                    else resolve({ periodStatus: rows });
                });
            })
        ];

        Promise.all(queries)
            .then(results => {
                results.forEach(r => Object.assign(report.sections, r));
                res.json(report);
            })
            .catch(err => res.status(500).json({ error: err.message }));
    });

    return router;
};
