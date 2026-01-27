/**
 * Budget Control Service
 * SyntexHCSN - Hệ thống Kiểm soát Ngân sách theo TT 24/2024/TT-BTC
 *
 * Provides comprehensive budget management including:
 * - Budget availability checking
 * - Spending authorization workflow
 * - Budget variance alerts
 * - Period lock/unlock management
 * - Budget transaction tracking
 */

const crypto = require('crypto');
const db = require('../database');
const auditService = require('./audit.service');

/**
 * Generate unique ID for budget entities
 * @param {string} prefix - ID prefix
 * @returns {string}
 */
const generateId = (prefix) => {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

/**
 * Get budget period from date
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {{year: number, period: number, quarter: number}}
 */
const getBudgetPeriod = (dateStr) => {
    const date = new Date(dateStr || new Date());
    const month = date.getMonth() + 1;
    return {
        year: date.getFullYear(),
        period: month,
        quarter: Math.ceil(month / 3)
    };
};

/**
 * Check if a budget period is locked
 * @param {number} fiscalYear - Fiscal year
 * @param {number} period - Period number (1-12)
 * @param {string} companyId - Company ID
 * @returns {Promise<{locked: boolean, reason?: string}>}
 */
const isPeriodLocked = (fiscalYear, period, companyId = '1') => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT is_locked, lock_reason, locked_by, locked_at
            FROM budget_periods
            WHERE fiscal_year = ? AND period_number = ? AND company_id = ? AND period_type = 'MONTHLY'`;

        db.get(sql, [fiscalYear, period, companyId], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                // No period record means not locked
                resolve({ locked: false });
            } else {
                resolve({
                    locked: row.is_locked === 1,
                    reason: row.lock_reason,
                    locked_by: row.locked_by,
                    locked_at: row.locked_at
                });
            }
        });
    });
};

/**
 * Lock a budget period
 * @param {Object} params - Lock parameters
 * @returns {Promise<{success: boolean, message?: string}>}
 */
const lockPeriod = (params) => {
    return new Promise((resolve, reject) => {
        const { fiscal_year, period, company_id = '1', locked_by, reason } = params;

        const sql = `UPDATE budget_periods
            SET is_locked = 1, locked_at = ?, locked_by = ?, lock_reason = ?, status = 'CLOSED', updated_at = ?
            WHERE fiscal_year = ? AND period_number = ? AND company_id = ? AND period_type = 'MONTHLY'`;

        const now = new Date().toISOString();

        db.run(sql, [now, locked_by, reason, now, fiscal_year, period, company_id], function (err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                resolve({ success: false, message: 'Budget period not found' });
            } else {
                // Log audit
                auditService.logAudit({
                    entity_type: 'BUDGET_PERIOD',
                    entity_id: `BP_${fiscal_year}_M${period}`,
                    action: 'LOCK',
                    action_category: 'PERIOD_CLOSE',
                    username: locked_by,
                    new_values: { fiscal_year, period, reason }
                });

                resolve({ success: true });
            }
        });
    });
};

/**
 * Unlock a budget period (requires approval)
 * @param {Object} params - Unlock parameters
 * @returns {Promise<{success: boolean, message?: string}>}
 */
const unlockPeriod = (params) => {
    return new Promise((resolve, reject) => {
        const { fiscal_year, period, company_id = '1', unlocked_by, reason } = params;

        const sql = `UPDATE budget_periods
            SET is_locked = 0, locked_at = NULL, locked_by = NULL, lock_reason = ?, status = 'REOPENED', updated_at = ?
            WHERE fiscal_year = ? AND period_number = ? AND company_id = ? AND period_type = 'MONTHLY'`;

        const now = new Date().toISOString();

        db.run(sql, [reason, now, fiscal_year, period, company_id], function (err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                resolve({ success: false, message: 'Budget period not found' });
            } else {
                // Log audit
                auditService.logAudit({
                    entity_type: 'BUDGET_PERIOD',
                    entity_id: `BP_${fiscal_year}_M${period}`,
                    action: 'UNLOCK',
                    action_category: 'PERIOD_CLOSE',
                    username: unlocked_by,
                    new_values: { fiscal_year, period, reason }
                });

                resolve({ success: true });
            }
        });
    });
};

/**
 * Get budget availability for a specific estimate or fund source
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Budget availability details
 */
const getBudgetAvailability = (params) => {
    return new Promise((resolve, reject) => {
        const { budget_estimate_id, fund_source_id, fiscal_year, item_code } = params;

        let sql, queryParams;

        if (budget_estimate_id) {
            sql = `SELECT
                be.id, be.item_code, be.item_name, be.budget_type,
                be.allocated_amount, be.committed_amount, be.spent_amount,
                (be.allocated_amount - COALESCE(be.committed_amount, 0) - COALESCE(be.spent_amount, 0)) as available_amount,
                be.status, be.fiscal_year,
                fs.name as fund_source_name, fs.type as fund_source_type
            FROM budget_estimates be
            LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
            WHERE be.id = ?`;
            queryParams = [budget_estimate_id];
        } else if (fund_source_id) {
            sql = `SELECT
                fs.id, fs.code, fs.name, fs.type,
                fs.allocated_amount, fs.spent_amount, fs.remaining_amount as available_amount,
                fs.status, fs.fiscal_year
            FROM fund_sources fs
            WHERE fs.id = ?`;
            queryParams = [fund_source_id];
        } else if (fiscal_year && item_code) {
            sql = `SELECT
                be.id, be.item_code, be.item_name, be.budget_type,
                SUM(be.allocated_amount) as allocated_amount,
                SUM(COALESCE(be.committed_amount, 0)) as committed_amount,
                SUM(COALESCE(be.spent_amount, 0)) as spent_amount,
                SUM(be.allocated_amount - COALESCE(be.committed_amount, 0) - COALESCE(be.spent_amount, 0)) as available_amount
            FROM budget_estimates be
            WHERE be.fiscal_year = ? AND be.item_code = ? AND be.status = 'EXECUTING'
            GROUP BY be.item_code`;
            queryParams = [fiscal_year, item_code];
        } else {
            return reject(new Error('Must provide budget_estimate_id, fund_source_id, or fiscal_year + item_code'));
        }

        db.get(sql, queryParams, (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                resolve({
                    found: false,
                    available_amount: 0,
                    message: 'Budget not found'
                });
            } else {
                const utilizationPercent = row.allocated_amount > 0
                    ? ((row.spent_amount + (row.committed_amount || 0)) / row.allocated_amount * 100).toFixed(2)
                    : 0;

                resolve({
                    found: true,
                    ...row,
                    utilization_percent: parseFloat(utilizationPercent),
                    is_over_budget: row.available_amount < 0
                });
            }
        });
    });
};

/**
 * Check budget before spending
 * @param {Object} params - Check parameters
 * @returns {Promise<Object>} Check result with approval requirement
 */
const checkBudgetForSpending = async (params) => {
    const {
        budget_estimate_id,
        fund_source_id,
        amount,
        fiscal_year,
        item_code,
        company_id = '1'
    } = params;

    // Get budget availability
    const availability = await getBudgetAvailability({
        budget_estimate_id,
        fund_source_id,
        fiscal_year,
        item_code
    });

    if (!availability.found) {
        return {
            allowed: false,
            status: 'NO_BUDGET',
            message: 'Không tìm thấy dự toán phù hợp',
            requires_approval: false
        };
    }

    const newUtilization = availability.allocated_amount > 0
        ? ((availability.spent_amount + (availability.committed_amount || 0) + amount) / availability.allocated_amount * 100)
        : 100;

    // Get threshold settings
    const thresholds = await new Promise((resolve, reject) => {
        db.get(`SELECT warning_threshold, block_threshold, allow_override
            FROM budget_periods
            WHERE fiscal_year = ? AND company_id = ? AND period_type = 'MONTHLY'
            LIMIT 1`,
            [fiscal_year || new Date().getFullYear(), company_id], (err, row) => {
                if (err) reject(err);
                else resolve(row || { warning_threshold: 80, block_threshold: 100, allow_override: 1 });
            });
    });

    const result = {
        current_spent: availability.spent_amount,
        current_committed: availability.committed_amount || 0,
        allocated: availability.allocated_amount,
        available: availability.available_amount,
        requested_amount: amount,
        new_utilization: newUtilization.toFixed(2),
        budget_estimate_id: availability.id,
        item_code: availability.item_code,
        item_name: availability.item_name
    };

    // Check against thresholds
    if (amount > availability.available_amount) {
        // Over budget
        if (thresholds.allow_override) {
            return {
                ...result,
                allowed: false,
                status: 'OVER_BUDGET',
                message: `Chi tiêu vượt dự toán ${(amount - availability.available_amount).toLocaleString()} VND. Yêu cầu phê duyệt.`,
                requires_approval: true,
                approval_type: 'BUDGET_OVERRIDE',
                over_amount: amount - availability.available_amount
            };
        } else {
            return {
                ...result,
                allowed: false,
                status: 'BLOCKED',
                message: `Chi tiêu vượt dự toán. Không được phép vượt dự toán.`,
                requires_approval: false
            };
        }
    } else if (newUtilization >= thresholds.block_threshold) {
        // At or above block threshold
        return {
            ...result,
            allowed: false,
            status: 'THRESHOLD_EXCEEDED',
            message: `Sử dụng dự toán đạt ${newUtilization.toFixed(1)}% (ngưỡng chặn: ${thresholds.block_threshold}%). Yêu cầu phê duyệt.`,
            requires_approval: true,
            approval_type: 'BUDGET_THRESHOLD'
        };
    } else if (newUtilization >= thresholds.warning_threshold) {
        // Above warning threshold - allow with warning
        return {
            ...result,
            allowed: true,
            status: 'WARNING',
            message: `Cảnh báo: Sử dụng dự toán đạt ${newUtilization.toFixed(1)}% (ngưỡng cảnh báo: ${thresholds.warning_threshold}%)`,
            requires_approval: false
        };
    } else {
        // Within budget
        return {
            ...result,
            allowed: true,
            status: 'OK',
            message: 'Chi tiêu trong phạm vi dự toán',
            requires_approval: false
        };
    }
};

/**
 * Create a spending authorization request
 * @param {Object} params - Authorization parameters
 * @returns {Promise<Object>} Created authorization
 */
const createSpendingAuthorization = (params) => {
    return new Promise((resolve, reject) => {
        const {
            request_type = 'SPENDING',
            requested_by,
            department_code,
            budget_estimate_id,
            fund_source_id,
            fiscal_year,
            requested_amount,
            budget_available,
            purpose,
            justification,
            supporting_docs = [],
            voucher_id,
            doc_no
        } = params;

        const id = generateId('AUTH');
        const now = new Date().toISOString();

        // Determine required approval level based on amount
        let required_level = 1;
        if (requested_amount > 200000000) required_level = 2;
        else if (requested_amount > 50000000) required_level = 2;

        // Set expiry (48 hours from now)
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

        const sql = `INSERT INTO budget_authorizations (
            id, request_type, request_date, requested_by, department_code,
            budget_estimate_id, fund_source_id, fiscal_year,
            requested_amount, budget_available, purpose, justification, supporting_docs,
            status, approval_level, required_level, voucher_id, doc_no, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 1, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            id, request_type, now, requested_by, department_code,
            budget_estimate_id, fund_source_id, fiscal_year,
            requested_amount, budget_available, purpose, justification, JSON.stringify(supporting_docs),
            required_level, voucher_id, doc_no, expiresAt, now
        ], function (err) {
            if (err) {
                reject(err);
            } else {
                // Log audit
                auditService.logBudgetAudit({
                    budget_type: 'AUTHORIZATION',
                    entity_id: id,
                    action: 'CREATE',
                    new_values: { request_type, requested_amount, purpose },
                    user: { username: requested_by },
                    amount: requested_amount,
                    fiscal_year
                });

                resolve({
                    success: true,
                    authorization_id: id,
                    status: 'PENDING',
                    required_level,
                    expires_at: expiresAt
                });
            }
        });
    });
};

/**
 * Approve a spending authorization
 * @param {Object} params - Approval parameters
 * @returns {Promise<Object>} Approval result
 */
const approveAuthorization = (params) => {
    return new Promise((resolve, reject) => {
        const { authorization_id, approved_by, approved_amount, approval_notes } = params;

        // First get the authorization
        db.get(`SELECT * FROM budget_authorizations WHERE id = ? AND status = 'PENDING'`, [authorization_id], (err, auth) => {
            if (err) {
                return reject(err);
            }
            if (!auth) {
                return resolve({ success: false, message: 'Authorization not found or already processed' });
            }

            // Check if expired
            if (new Date(auth.expires_at) < new Date()) {
                db.run(`UPDATE budget_authorizations SET status = 'EXPIRED' WHERE id = ?`, [authorization_id]);
                return resolve({ success: false, message: 'Authorization has expired' });
            }

            const finalAmount = approved_amount || auth.requested_amount;
            const now = new Date().toISOString();

            const sql = `UPDATE budget_authorizations
                SET status = 'APPROVED', approver_id = ?, approved_by = ?, approved_at = ?,
                    approved_amount = ?, approval_notes = ?, updated_at = ?
                WHERE id = ?`;

            db.run(sql, [null, approved_by, now, finalAmount, approval_notes, now, authorization_id], function (err) {
                if (err) {
                    reject(err);
                } else {
                    // Log audit
                    auditService.logBudgetAudit({
                        budget_type: 'AUTHORIZATION',
                        entity_id: authorization_id,
                        action: 'APPROVE',
                        old_values: { status: 'PENDING' },
                        new_values: { status: 'APPROVED', approved_amount: finalAmount, approved_by },
                        user: { username: approved_by },
                        amount: finalAmount
                    });

                    resolve({
                        success: true,
                        authorization_id,
                        approved_amount: finalAmount,
                        approved_by,
                        approved_at: now
                    });
                }
            });
        });
    });
};

/**
 * Reject a spending authorization
 * @param {Object} params - Rejection parameters
 * @returns {Promise<Object>} Rejection result
 */
const rejectAuthorization = (params) => {
    return new Promise((resolve, reject) => {
        const { authorization_id, rejected_by, rejection_reason } = params;

        const now = new Date().toISOString();

        const sql = `UPDATE budget_authorizations
            SET status = 'REJECTED', approved_by = ?, approved_at = ?, approval_notes = ?, updated_at = ?
            WHERE id = ? AND status = 'PENDING'`;

        db.run(sql, [rejected_by, now, rejection_reason, now, authorization_id], function (err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                resolve({ success: false, message: 'Authorization not found or already processed' });
            } else {
                // Log audit
                auditService.logBudgetAudit({
                    budget_type: 'AUTHORIZATION',
                    entity_id: authorization_id,
                    action: 'REJECT',
                    new_values: { status: 'REJECTED', rejected_by, rejection_reason },
                    user: { username: rejected_by }
                });

                resolve({ success: true, authorization_id });
            }
        });
    });
};

/**
 * Record a budget transaction (commitment or spending)
 * @param {Object} params - Transaction parameters
 * @returns {Promise<Object>} Transaction result
 */
const recordBudgetTransaction = (params) => {
    return new Promise((resolve, reject) => {
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
            authorized_by,
            fiscal_year,
            fiscal_period,
            department_code,
            project_code,
            account_code,
            created_by
        } = params;

        const id = generateId('BTX');

        // Get current budget balances
        getBudgetAvailability({ budget_estimate_id, fund_source_id })
            .then(availability => {
                if (!availability.found) {
                    return resolve({ success: false, message: 'Budget not found' });
                }

                // Calculate new balances
                let newCommitted = availability.committed_amount || 0;
                let newSpent = availability.spent_amount || 0;

                if (transaction_type === 'COMMITMENT') {
                    newCommitted += amount;
                } else if (transaction_type === 'SPENDING') {
                    newSpent += amount;
                    // Release commitment if this was committed
                    newCommitted = Math.max(0, newCommitted - amount);
                } else if (transaction_type === 'REVERSAL') {
                    newSpent -= amount;
                } else if (transaction_type === 'TRANSFER_OUT') {
                    newSpent += amount;
                } else if (transaction_type === 'TRANSFER_IN') {
                    // Increase allocated instead
                }

                const newAvailable = availability.allocated_amount - newCommitted - newSpent;

                // Insert transaction
                const sql = `INSERT INTO budget_transactions (
                    id, budget_estimate_id, fund_source_id, budget_allocation_id,
                    transaction_type, transaction_date, voucher_id, doc_no, description, amount,
                    budget_allocated, budget_committed, budget_spent, budget_available,
                    authorization_id, authorized_by, status,
                    fiscal_year, fiscal_period, department_code, project_code, account_code,
                    created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'POSTED', ?, ?, ?, ?, ?, ?, ?)`;

                const now = new Date().toISOString();

                db.run(sql, [
                    id, budget_estimate_id, fund_source_id, budget_allocation_id,
                    transaction_type, transaction_date, voucher_id, doc_no, description, amount,
                    availability.allocated_amount, newCommitted, newSpent, newAvailable,
                    authorization_id, authorized_by,
                    fiscal_year, fiscal_period, department_code, project_code, account_code,
                    created_by, now
                ], function (err) {
                    if (err) {
                        return reject(err);
                    }

                    // Update budget estimate balances
                    if (budget_estimate_id) {
                        db.run(`UPDATE budget_estimates
                            SET committed_amount = ?, spent_amount = ?, remaining_amount = ?, updated_at = ?
                            WHERE id = ?`,
                            [newCommitted, newSpent, newAvailable, now, budget_estimate_id]);
                    }

                    // Update fund source if applicable
                    if (fund_source_id) {
                        db.run(`UPDATE fund_sources
                            SET spent_amount = spent_amount + ?, remaining_amount = allocated_amount - spent_amount - ?, updated_at = ?
                            WHERE id = ?`,
                            [transaction_type === 'REVERSAL' ? -amount : amount, amount, now, fund_source_id]);
                    }

                    // Log audit
                    auditService.logBudgetAudit({
                        budget_type: 'TRANSACTION',
                        entity_id: id,
                        action: 'CREATE',
                        new_values: { transaction_type, amount, doc_no, voucher_id },
                        user: { username: created_by },
                        amount,
                        fiscal_year
                    });

                    resolve({
                        success: true,
                        transaction_id: id,
                        new_balances: {
                            committed: newCommitted,
                            spent: newSpent,
                            available: newAvailable
                        }
                    });
                });
            })
            .catch(reject);
    });
};

/**
 * Create or update a budget alert
 * @param {Object} params - Alert parameters
 * @returns {Promise<Object>} Created alert
 */
const createBudgetAlert = (params) => {
    return new Promise((resolve, reject) => {
        const {
            alert_type,
            severity = 'MEDIUM',
            budget_estimate_id,
            fund_source_id,
            fiscal_year,
            fiscal_period,
            title,
            message,
            threshold_percent,
            current_percent,
            budget_amount,
            spent_amount,
            remaining_amount,
            triggered_by_voucher,
            triggered_by_user,
            notified_users = []
        } = params;

        const id = generateId('ALERT');
        const now = new Date().toISOString();

        const sql = `INSERT INTO budget_alerts (
            id, alert_type, severity, budget_estimate_id, fund_source_id,
            fiscal_year, fiscal_period, title, message,
            threshold_percent, current_percent, budget_amount, spent_amount, remaining_amount,
            triggered_by_voucher, triggered_by_user, notified_users, notification_sent_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            id, alert_type, severity, budget_estimate_id, fund_source_id,
            fiscal_year, fiscal_period, title, message,
            threshold_percent, current_percent, budget_amount, spent_amount, remaining_amount,
            triggered_by_voucher, triggered_by_user, JSON.stringify(notified_users), now, now
        ], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: true, alert_id: id });
            }
        });
    });
};

/**
 * Get pending authorizations for a user (for approval workflow)
 * @param {Object} params - Query parameters
 * @returns {Promise<Object[]>} Pending authorizations
 */
const getPendingAuthorizations = (params = {}) => {
    return new Promise((resolve, reject) => {
        const { approver_role, fiscal_year, limit = 50 } = params;

        let sql = `SELECT ba.*,
            be.item_name, be.item_code,
            fs.name as fund_source_name
        FROM budget_authorizations ba
        LEFT JOIN budget_estimates be ON ba.budget_estimate_id = be.id
        LEFT JOIN fund_sources fs ON ba.fund_source_id = fs.id
        WHERE ba.status = 'PENDING' AND ba.expires_at > datetime('now')`;

        const queryParams = [];

        if (fiscal_year) {
            sql += ` AND ba.fiscal_year = ?`;
            queryParams.push(fiscal_year);
        }

        sql += ` ORDER BY ba.request_date ASC LIMIT ?`;
        queryParams.push(limit);

        db.all(sql, queryParams, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => ({
                    ...row,
                    supporting_docs: row.supporting_docs ? JSON.parse(row.supporting_docs) : []
                })));
            }
        });
    });
};

/**
 * Get budget utilization report
 * @param {Object} params - Report parameters
 * @returns {Promise<Object>} Utilization report
 */
const getBudgetUtilizationReport = (params) => {
    return new Promise((resolve, reject) => {
        const { fiscal_year, fund_source_id, chapter_code } = params;

        let sql = `SELECT
            be.item_code,
            be.item_name,
            be.budget_type,
            be.chapter_code,
            fs.name as fund_source_name,
            SUM(be.allocated_amount) as total_allocated,
            SUM(COALESCE(be.committed_amount, 0)) as total_committed,
            SUM(COALESCE(be.spent_amount, 0)) as total_spent,
            SUM(be.allocated_amount - COALESCE(be.committed_amount, 0) - COALESCE(be.spent_amount, 0)) as total_available,
            ROUND(SUM(COALESCE(be.spent_amount, 0)) * 100.0 / NULLIF(SUM(be.allocated_amount), 0), 2) as utilization_percent
        FROM budget_estimates be
        LEFT JOIN fund_sources fs ON be.fund_source_id = fs.id
        WHERE be.fiscal_year = ? AND be.status = 'EXECUTING'`;

        const queryParams = [fiscal_year || new Date().getFullYear()];

        if (fund_source_id) {
            sql += ` AND be.fund_source_id = ?`;
            queryParams.push(fund_source_id);
        }

        if (chapter_code) {
            sql += ` AND be.chapter_code = ?`;
            queryParams.push(chapter_code);
        }

        sql += ` GROUP BY be.item_code, be.item_name, be.budget_type, be.chapter_code, fs.name
                 ORDER BY be.chapter_code, be.item_code`;

        db.all(sql, queryParams, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Calculate totals
                const totals = rows.reduce((acc, row) => ({
                    total_allocated: acc.total_allocated + (row.total_allocated || 0),
                    total_committed: acc.total_committed + (row.total_committed || 0),
                    total_spent: acc.total_spent + (row.total_spent || 0),
                    total_available: acc.total_available + (row.total_available || 0)
                }), { total_allocated: 0, total_committed: 0, total_spent: 0, total_available: 0 });

                totals.utilization_percent = totals.total_allocated > 0
                    ? (totals.total_spent / totals.total_allocated * 100).toFixed(2)
                    : 0;

                resolve({
                    fiscal_year: fiscal_year || new Date().getFullYear(),
                    items: rows,
                    totals
                });
            }
        });
    });
};

/**
 * Get active budget alerts
 * @param {Object} params - Query parameters
 * @returns {Promise<Object[]>} Active alerts
 */
const getActiveAlerts = (params = {}) => {
    return new Promise((resolve, reject) => {
        const { fiscal_year, severity, limit = 50 } = params;

        let sql = `SELECT ba.*,
            be.item_name, be.item_code,
            fs.name as fund_source_name
        FROM budget_alerts ba
        LEFT JOIN budget_estimates be ON ba.budget_estimate_id = be.id
        LEFT JOIN fund_sources fs ON ba.fund_source_id = fs.id
        WHERE ba.status = 'ACTIVE'`;

        const queryParams = [];

        if (fiscal_year) {
            sql += ` AND ba.fiscal_year = ?`;
            queryParams.push(fiscal_year);
        }

        if (severity) {
            sql += ` AND ba.severity = ?`;
            queryParams.push(severity);
        }

        sql += ` ORDER BY
            CASE ba.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
            ba.created_at DESC
        LIMIT ?`;
        queryParams.push(limit);

        db.all(sql, queryParams, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => ({
                    ...row,
                    notified_users: row.notified_users ? JSON.parse(row.notified_users) : []
                })));
            }
        });
    });
};

/**
 * Acknowledge or resolve a budget alert
 * @param {Object} params - Resolution parameters
 * @returns {Promise<Object>} Resolution result
 */
const resolveAlert = (params) => {
    return new Promise((resolve, reject) => {
        const { alert_id, action, resolved_by, resolution_notes } = params;

        const status = action === 'acknowledge' ? 'ACKNOWLEDGED' : 'RESOLVED';
        const field = action === 'acknowledge' ? 'acknowledged' : 'resolved';
        const now = new Date().toISOString();

        const sql = `UPDATE budget_alerts
            SET status = ?, ${field}_by = ?, ${field}_at = ?, resolution_notes = ?
            WHERE id = ?`;

        db.run(sql, [status, resolved_by, now, resolution_notes, alert_id], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: this.changes > 0 });
            }
        });
    });
};

module.exports = {
    generateId,
    getBudgetPeriod,
    isPeriodLocked,
    lockPeriod,
    unlockPeriod,
    getBudgetAvailability,
    checkBudgetForSpending,
    createSpendingAuthorization,
    approveAuthorization,
    rejectAuthorization,
    recordBudgetTransaction,
    createBudgetAlert,
    getPendingAuthorizations,
    getBudgetUtilizationReport,
    getActiveAlerts,
    resolveAlert
};
