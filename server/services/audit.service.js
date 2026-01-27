/**
 * Audit Trail Service
 * SyntexHCSN - Hệ thống Dấu vết Kiểm toán theo TT 24/2024/TT-BTC
 *
 * Provides comprehensive audit logging for all accounting transactions
 * with change tracking, anomaly detection, and compliance reporting.
 */

const crypto = require('crypto');
const db = require('../database');

/**
 * Generate unique audit trail ID
 */
const generateAuditId = () => {
    return `AUD_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

/**
 * Calculate checksum for tamper detection
 * @param {Object} data - Critical audit data
 * @returns {string} SHA256 hash
 */
const calculateChecksum = (data) => {
    const content = JSON.stringify({
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        action: data.action,
        username: data.username,
        created_at: data.created_at,
        old_values: data.old_values,
        new_values: data.new_values
    });
    return crypto.createHash('sha256').update(content).digest('hex');
};

/**
 * Get fiscal period from date
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {{year: number, period: number}}
 */
const getFiscalPeriod = (dateStr) => {
    const date = new Date(dateStr || new Date());
    return {
        year: date.getFullYear(),
        period: date.getMonth() + 1
    };
};

/**
 * Detect changed fields between old and new values
 * @param {Object} oldValues - Previous state
 * @param {Object} newValues - New state
 * @returns {string[]} Array of changed field names
 */
const detectChangedFields = (oldValues, newValues) => {
    const changes = [];
    const allKeys = new Set([
        ...Object.keys(oldValues || {}),
        ...Object.keys(newValues || {})
    ]);

    allKeys.forEach(key => {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push(key);
        }
    });

    return changes;
};

/**
 * Log an audit trail entry
 * @param {Object} params - Audit parameters
 * @returns {Promise<{success: boolean, auditId?: string, error?: string}>}
 */
const logAudit = (params) => {
    return new Promise((resolve, reject) => {
        const {
            entity_type,
            entity_id,
            doc_no,
            action,
            action_category = 'DATA_ENTRY',
            old_values = null,
            new_values = null,
            user_id,
            username,
            user_role,
            ip_address,
            user_agent,
            session_id,
            approval_status,
            approved_by,
            approval_notes,
            amount,
            account_code,
            fund_source_id,
            budget_estimate_id,
            department_code,
            project_code,
            source = 'MANUAL',
            reason
        } = params;

        const auditId = generateAuditId();
        const created_at = new Date().toISOString();
        const { year, period } = getFiscalPeriod(created_at);

        const changedFields = detectChangedFields(old_values, new_values);

        const auditData = {
            entity_type,
            entity_id,
            action,
            username,
            created_at,
            old_values: old_values ? JSON.stringify(old_values) : null,
            new_values: new_values ? JSON.stringify(new_values) : null
        };

        const checksum = calculateChecksum(auditData);

        const sql = `INSERT INTO audit_trail (
            id, entity_type, entity_id, doc_no, action, action_category,
            old_values, new_values, changed_fields,
            user_id, username, user_role, ip_address, user_agent, session_id,
            created_at, fiscal_year, fiscal_period,
            approval_status, approved_by, approval_notes,
            amount, account_code, fund_source_id, budget_estimate_id,
            department_code, project_code, source, reason, checksum
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            auditId,
            entity_type,
            entity_id,
            doc_no || null,
            action,
            action_category,
            old_values ? JSON.stringify(old_values) : null,
            new_values ? JSON.stringify(new_values) : null,
            JSON.stringify(changedFields),
            user_id || null,
            username,
            user_role || null,
            ip_address || null,
            user_agent || null,
            session_id || null,
            created_at,
            year,
            period,
            approval_status || null,
            approved_by || null,
            approval_notes || null,
            amount || null,
            account_code || null,
            fund_source_id || null,
            budget_estimate_id || null,
            department_code || null,
            project_code || null,
            source,
            reason || null,
            checksum
        ];

        db.run(sql, values, function (err) {
            if (err) {
                console.error('Audit logging failed:', err);
                resolve({ success: false, error: err.message });
            } else {
                resolve({ success: true, auditId });
            }
        });
    });
};

/**
 * Log voucher-specific audit entry
 * @param {Object} params - Voucher audit parameters
 */
const logVoucherAudit = (params) => {
    const {
        voucher,
        items,
        action,
        old_voucher,
        old_items,
        user,
        ip_address,
        reason
    } = params;

    return logAudit({
        entity_type: 'VOUCHER',
        entity_id: voucher.id,
        doc_no: voucher.doc_no,
        action,
        action_category: action === 'POST' ? 'PERIOD_CLOSE' : 'DATA_ENTRY',
        old_values: old_voucher ? { voucher: old_voucher, items: old_items } : null,
        new_values: { voucher, items },
        user_id: user?.id,
        username: user?.username || 'system',
        user_role: user?.role,
        ip_address,
        amount: voucher.total_amount,
        account_code: items?.[0]?.debit_acc,
        fund_source_id: items?.[0]?.fund_source_id,
        budget_estimate_id: items?.[0]?.budget_estimate_id,
        source: 'MANUAL',
        reason
    });
};

/**
 * Log budget-related audit entry
 * @param {Object} params - Budget audit parameters
 */
const logBudgetAudit = (params) => {
    const {
        budget_type, // 'ESTIMATE', 'ALLOCATION', 'AUTHORIZATION', 'TRANSACTION'
        entity_id,
        action,
        old_values,
        new_values,
        user,
        ip_address,
        amount,
        fiscal_year,
        reason
    } = params;

    return logAudit({
        entity_type: `BUDGET_${budget_type}`,
        entity_id,
        action,
        action_category: 'DATA_ENTRY',
        old_values,
        new_values,
        user_id: user?.id,
        username: user?.username || 'system',
        user_role: user?.role,
        ip_address,
        amount,
        source: 'MANUAL',
        reason
    });
};

/**
 * Query audit trail with filters
 * @param {Object} filters - Query filters
 * @returns {Promise<Object[]>}
 */
const queryAuditTrail = (filters = {}) => {
    return new Promise((resolve, reject) => {
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
        } = filters;

        let sql = `SELECT * FROM audit_trail WHERE 1=1`;
        const params = [];

        if (entity_type) {
            sql += ` AND entity_type = ?`;
            params.push(entity_type);
        }
        if (entity_id) {
            sql += ` AND entity_id = ?`;
            params.push(entity_id);
        }
        if (doc_no) {
            sql += ` AND doc_no LIKE ?`;
            params.push(`%${doc_no}%`);
        }
        if (action) {
            sql += ` AND action = ?`;
            params.push(action);
        }
        if (username) {
            sql += ` AND username = ?`;
            params.push(username);
        }
        if (from_date) {
            sql += ` AND created_at >= ?`;
            params.push(from_date);
        }
        if (to_date) {
            sql += ` AND created_at <= ?`;
            params.push(to_date + 'T23:59:59');
        }
        if (fiscal_year) {
            sql += ` AND fiscal_year = ?`;
            params.push(fiscal_year);
        }
        if (fiscal_period) {
            sql += ` AND fiscal_period = ?`;
            params.push(fiscal_period);
        }
        if (approval_status) {
            sql += ` AND approval_status = ?`;
            params.push(approval_status);
        }

        sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Parse JSON fields
                const results = rows.map(row => ({
                    ...row,
                    old_values: row.old_values ? JSON.parse(row.old_values) : null,
                    new_values: row.new_values ? JSON.parse(row.new_values) : null,
                    changed_fields: row.changed_fields ? JSON.parse(row.changed_fields) : []
                }));
                resolve(results);
            }
        });
    });
};

/**
 * Get audit trail for a specific entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @returns {Promise<Object[]>}
 */
const getEntityAuditHistory = (entityType, entityId) => {
    return queryAuditTrail({ entity_type: entityType, entity_id: entityId, limit: 1000 });
};

/**
 * Log an anomaly detection
 * @param {Object} params - Anomaly parameters
 * @returns {Promise<{success: boolean, anomalyId?: string}>}
 */
const logAnomaly = (params) => {
    return new Promise((resolve, reject) => {
        const {
            anomaly_type,
            severity = 'MEDIUM',
            entity_type,
            entity_id,
            doc_no,
            description,
            detected_value,
            expected_value,
            threshold_value,
            detected_by = 'SYSTEM',
            detection_rule,
            fiscal_year,
            amount_impact,
            risk_score
        } = params;

        const anomalyId = `ANOM_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        const sql = `INSERT INTO audit_anomalies (
            id, anomaly_type, severity, entity_type, entity_id, doc_no,
            description, detected_value, expected_value, threshold_value,
            detected_by, detection_rule, fiscal_year, amount_impact, risk_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            anomalyId, anomaly_type, severity, entity_type, entity_id, doc_no,
            description, detected_value, expected_value, threshold_value,
            detected_by, detection_rule, fiscal_year, amount_impact, risk_score
        ], function (err) {
            if (err) {
                console.error('Anomaly logging failed:', err);
                resolve({ success: false, error: err.message });
            } else {
                resolve({ success: true, anomalyId });
            }
        });
    });
};

/**
 * Query anomalies with filters
 * @param {Object} filters - Query filters
 * @returns {Promise<Object[]>}
 */
const queryAnomalies = (filters = {}) => {
    return new Promise((resolve, reject) => {
        const {
            anomaly_type,
            severity,
            status = 'OPEN',
            from_date,
            to_date,
            fiscal_year,
            limit = 100,
            offset = 0
        } = filters;

        let sql = `SELECT * FROM audit_anomalies WHERE 1=1`;
        const params = [];

        if (anomaly_type) {
            sql += ` AND anomaly_type = ?`;
            params.push(anomaly_type);
        }
        if (severity) {
            sql += ` AND severity = ?`;
            params.push(severity);
        }
        if (status) {
            sql += ` AND status = ?`;
            params.push(status);
        }
        if (from_date) {
            sql += ` AND detected_at >= ?`;
            params.push(from_date);
        }
        if (to_date) {
            sql += ` AND detected_at <= ?`;
            params.push(to_date + 'T23:59:59');
        }
        if (fiscal_year) {
            sql += ` AND fiscal_year = ?`;
            params.push(fiscal_year);
        }

        sql += ` ORDER BY detected_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

/**
 * Resolve an anomaly
 * @param {string} anomalyId - Anomaly ID
 * @param {Object} resolution - Resolution details
 * @returns {Promise<{success: boolean}>}
 */
const resolveAnomaly = (anomalyId, resolution) => {
    return new Promise((resolve, reject) => {
        const { resolved_by, resolution_notes, status = 'RESOLVED' } = resolution;

        const sql = `UPDATE audit_anomalies
            SET status = ?, resolved_by = ?, resolved_at = ?, resolution_notes = ?
            WHERE id = ?`;

        db.run(sql, [status, resolved_by, new Date().toISOString(), resolution_notes, anomalyId], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: this.changes > 0 });
            }
        });
    });
};

/**
 * Get audit statistics for dashboard
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>}
 */
const getAuditStatistics = (params = {}) => {
    return new Promise((resolve, reject) => {
        const { fiscal_year, from_date, to_date } = params;
        const currentYear = fiscal_year || new Date().getFullYear();

        const queries = [
            // Total actions by type
            new Promise((res, rej) => {
                db.all(`SELECT action, COUNT(*) as count FROM audit_trail
                    WHERE fiscal_year = ? GROUP BY action`, [currentYear], (err, rows) => {
                    if (err) rej(err);
                    else res({ actionCounts: rows });
                });
            }),

            // Total by user
            new Promise((res, rej) => {
                db.all(`SELECT username, COUNT(*) as count FROM audit_trail
                    WHERE fiscal_year = ? GROUP BY username ORDER BY count DESC LIMIT 10`, [currentYear], (err, rows) => {
                    if (err) rej(err);
                    else res({ userActivity: rows });
                });
            }),

            // Anomalies by type and status
            new Promise((res, rej) => {
                db.all(`SELECT anomaly_type, severity, status, COUNT(*) as count FROM audit_anomalies
                    WHERE fiscal_year = ? GROUP BY anomaly_type, severity, status`, [currentYear], (err, rows) => {
                    if (err) rej(err);
                    else res({ anomalySummary: rows });
                });
            }),

            // Open anomalies count
            new Promise((res, rej) => {
                db.get(`SELECT COUNT(*) as count FROM audit_anomalies
                    WHERE status = 'OPEN'`, (err, row) => {
                    if (err) rej(err);
                    else res({ openAnomalies: row?.count || 0 });
                });
            }),

            // Recent activity (last 7 days)
            new Promise((res, rej) => {
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                db.all(`SELECT DATE(created_at) as date, COUNT(*) as count FROM audit_trail
                    WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY date`, [sevenDaysAgo], (err, rows) => {
                    if (err) rej(err);
                    else res({ recentActivity: rows });
                });
            })
        ];

        Promise.all(queries)
            .then(results => {
                const stats = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                resolve(stats);
            })
            .catch(reject);
    });
};

/**
 * Verify checksum integrity for an audit record
 * @param {string} auditId - Audit trail ID
 * @returns {Promise<{valid: boolean, details?: string}>}
 */
const verifyAuditIntegrity = (auditId) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM audit_trail WHERE id = ?`, [auditId], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                resolve({ valid: false, details: 'Record not found' });
            } else {
                const auditData = {
                    entity_type: row.entity_type,
                    entity_id: row.entity_id,
                    action: row.action,
                    username: row.username,
                    created_at: row.created_at,
                    old_values: row.old_values,
                    new_values: row.new_values
                };
                const calculatedChecksum = calculateChecksum(auditData);
                const valid = calculatedChecksum === row.checksum;
                resolve({
                    valid,
                    details: valid ? 'Checksum verified' : 'Checksum mismatch - possible tampering detected'
                });
            }
        });
    });
};

/**
 * Create a session record for audit tracking
 * @param {Object} params - Session parameters
 * @returns {Promise<{success: boolean, sessionId?: string}>}
 */
const createAuditSession = (params) => {
    return new Promise((resolve, reject) => {
        const { user_id, username, ip_address, user_agent } = params;
        const sessionId = `SES_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        const sql = `INSERT INTO audit_sessions (id, user_id, username, ip_address, user_agent, last_activity)
            VALUES (?, ?, ?, ?, ?, ?)`;

        db.run(sql, [sessionId, user_id, username, ip_address, user_agent, new Date().toISOString()], function (err) {
            if (err) {
                resolve({ success: false, error: err.message });
            } else {
                resolve({ success: true, sessionId });
            }
        });
    });
};

/**
 * End an audit session
 * @param {string} sessionId - Session ID
 * @returns {Promise<{success: boolean}>}
 */
const endAuditSession = (sessionId) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE audit_sessions SET logout_at = ?, is_active = 0 WHERE id = ?`;

        db.run(sql, [new Date().toISOString(), sessionId], function (err) {
            if (err) {
                resolve({ success: false, error: err.message });
            } else {
                resolve({ success: this.changes > 0 });
            }
        });
    });
};

/**
 * Run automated anomaly detection checks
 * @param {Object} params - Check parameters
 * @returns {Promise<Object[]>} Detected anomalies
 */
const runAnomalyDetection = async (params = {}) => {
    const { fiscal_year = new Date().getFullYear() } = params;
    const detected = [];

    // Check 1: Budget overruns
    const budgetOverruns = await new Promise((resolve, reject) => {
        db.all(`SELECT be.*, fs.name as fund_source_name
            FROM budget_estimates be
            LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
            WHERE be.fiscal_year = ? AND be.spent_amount > be.allocated_amount AND be.status = 'EXECUTING'`,
            [fiscal_year], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
    });

    for (const overrun of budgetOverruns) {
        const anomaly = await logAnomaly({
            anomaly_type: 'BUDGET_OVERRUN',
            severity: 'HIGH',
            entity_type: 'BUDGET_ESTIMATE',
            entity_id: overrun.id,
            description: `Dự toán ${overrun.item_name} (${overrun.item_code}) vượt mức phân bổ`,
            detected_value: overrun.spent_amount.toString(),
            expected_value: overrun.allocated_amount.toString(),
            threshold_value: '100%',
            detection_rule: 'BUDGET_OVERRUN_CHECK',
            fiscal_year,
            amount_impact: overrun.spent_amount - overrun.allocated_amount,
            risk_score: 80
        });
        detected.push(anomaly);
    }

    // Check 2: Duplicate document numbers
    const duplicates = await new Promise((resolve, reject) => {
        db.all(`SELECT doc_no, COUNT(*) as count FROM vouchers
            WHERE strftime('%Y', doc_date) = ? GROUP BY doc_no HAVING count > 1`,
            [fiscal_year.toString()], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
    });

    for (const dup of duplicates) {
        const anomaly = await logAnomaly({
            anomaly_type: 'DUPLICATE_DOC',
            severity: 'MEDIUM',
            entity_type: 'VOUCHER',
            doc_no: dup.doc_no,
            description: `Số chứng từ "${dup.doc_no}" xuất hiện ${dup.count} lần`,
            detected_value: dup.count.toString(),
            expected_value: '1',
            detection_rule: 'DUPLICATE_DOC_CHECK',
            fiscal_year,
            risk_score: 50
        });
        detected.push(anomaly);
    }

    // Check 3: Risky partner transactions
    const riskyPartners = await new Promise((resolve, reject) => {
        db.all(`SELECT vi.partner_code, p.partner_name, SUM(vi.amount) as total_amount, COUNT(*) as trx_count
            FROM voucher_items vi
            JOIN partners p ON vi.partner_code = p.partner_code
            JOIN vouchers v ON vi.voucher_id = v.id
            WHERE p.partner_code LIKE '%RISK%' OR p.partner_name LIKE '%rủi ro%' OR p.partner_name LIKE '%bỏ trốn%'
            AND strftime('%Y', v.doc_date) = ?
            GROUP BY vi.partner_code`,
            [fiscal_year.toString()], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
    });

    for (const risky of riskyPartners) {
        const anomaly = await logAnomaly({
            anomaly_type: 'RISKY_PARTNER',
            severity: 'HIGH',
            entity_type: 'PARTNER',
            entity_id: risky.partner_code,
            description: `Giao dịch với đối tác rủi ro "${risky.partner_name}": ${risky.trx_count} giao dịch, tổng ${risky.total_amount.toLocaleString()} VND`,
            detected_value: risky.total_amount.toString(),
            detection_rule: 'RISKY_PARTNER_CHECK',
            fiscal_year,
            amount_impact: risky.total_amount,
            risk_score: 90
        });
        detected.push(anomaly);
    }

    return detected;
};

module.exports = {
    generateAuditId,
    logAudit,
    logVoucherAudit,
    logBudgetAudit,
    queryAuditTrail,
    getEntityAuditHistory,
    logAnomaly,
    queryAnomalies,
    resolveAnomaly,
    getAuditStatistics,
    verifyAuditIntegrity,
    createAuditSession,
    endAuditSession,
    runAnomalyDetection,
    detectChangedFields,
    calculateChecksum
};
