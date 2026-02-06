/**
 * Voucher Routes (General Vouchers, Staging, Receipt/Payment)
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

const express = require('express');
const fs = require('fs');

const logger = require('../src/utils/logger');
const { verifyToken, requireRole, checkDateLock, logAction, sanitizeBody, sanitizeQuery, validateVoucher, validateVoucherBalance, isOffBalanceSheetAccount, validateDateRange } = require('../middleware');
const auditService = require('../services/audit.service');
const budgetService = require('../services/budget.service');

// Helper to check for circular reference (Simplified)
const hasCircularReference = (obj) => {
    try {
        JSON.stringify(obj);
        return false;
    } catch (e) {
        return true;
    }
};

module.exports = (db) => {
    const router = express.Router();

    /**
     * GET /api/vouchers
     * Get vouchers with filters
     */
    router.get('/vouchers', sanitizeQuery, validateDateRange, verifyToken, (req, res) => {
        const { type, fromDate, toDate } = req.query;
        let sql = "SELECT * FROM vouchers";
        const params = [];
        const conditions = [];

        if (type) {
            conditions.push("type = ?");
            params.push(type);
        }
        if (fromDate) {
            conditions.push("doc_date >= ?");
            params.push(fromDate);
        }
        if (toDate) {
            conditions.push("doc_date <= ?");
            params.push(toDate);
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }
        sql += " ORDER BY doc_date DESC, created_at DESC LIMIT 100";

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * GET /api/vouchers/:id
     * Get single voucher with items
     */
    router.get('/vouchers/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.get("SELECT * FROM vouchers WHERE id = ?", [id], (err, voucher) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!voucher) return res.status(404).json({ error: "Voucher not found" });

            db.all("SELECT * FROM voucher_items WHERE voucher_id = ?", [id], (err, items) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ ...voucher, items });
            });
        });
    });

    /**
     * POST /api/vouchers
     * Create or update voucher with comprehensive audit logging and budget checking
     */
    router.post('/vouchers', sanitizeBody, validateVoucher, verifyToken, async (req, res) => {
        const { id, doc_no, doc_date, post_date, description, type, items, total_amount, org_doc_no, org_doc_date, budget_estimate_id, fund_source_id, skip_budget_check } = req.body;

        // Check date lock
        try {
            const lockStatus = await checkDateLock(post_date);
            if (lockStatus.locked) {
                return res.status(403).json({ error: `Kỳ kế toán đã khóa đến ngày ${lockStatus.lockedUntil}. Không thể ghi sổ.` });
            }
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }

        // Check budget period lock
        try {
            const postDateObj = new Date(post_date);
            const fiscalYear = postDateObj.getFullYear();
            const period = postDateObj.getMonth() + 1;

            const periodLock = await budgetService.isPeriodLocked(fiscalYear, period);
            if (periodLock.locked) {
                return res.status(403).json({
                    error: `Kỳ ngân sách tháng ${period}/${fiscalYear} đã khóa. Lý do: ${periodLock.reason || 'N/A'}`
                });
            }
        } catch (e) {
            // Budget period check is optional, continue if table doesn't exist
            logger.warn('Budget period check skipped:', e.message);
        }

        // Budget checking for expense vouchers
        let budgetCheckResult = null;
        const expenseTypes = ['CASH_OUT', 'PURCHASE_INVOICE', 'EXPENSE'];
        const needsBudgetCheck = expenseTypes.includes(type) && (budget_estimate_id || fund_source_id) && !skip_budget_check;

        if (needsBudgetCheck) {
            try {
                budgetCheckResult = await budgetService.checkBudgetForSpending({
                    budget_estimate_id,
                    fund_source_id,
                    amount: total_amount,
                    fiscal_year: new Date(post_date).getFullYear()
                });

                // If budget check fails and requires approval
                if (!budgetCheckResult.allowed && budgetCheckResult.requires_approval) {
                    return res.status(400).json({
                        error: budgetCheckResult.message,
                        budget_check: budgetCheckResult,
                        requires_authorization: true
                    });
                }

                // If blocked completely
                if (!budgetCheckResult.allowed && !budgetCheckResult.requires_approval) {
                    return res.status(403).json({
                        error: budgetCheckResult.message,
                        budget_check: budgetCheckResult
                    });
                }
            } catch (e) {
                logger.warn('Budget check skipped:', e.message);
            }
        }

        const voucherId = id || `V${Date.now()}`;
        const now = new Date().toISOString();

        // Fetch old voucher data for audit trail (if updating)
        let oldVoucher = null;
        let oldItems = null;
        if (id) {
            try {
                oldVoucher = await new Promise((resolve, reject) => {
                    db.get("SELECT * FROM vouchers WHERE id = ?", [id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                oldItems = await new Promise((resolve, reject) => {
                    db.all("SELECT * FROM voucher_items WHERE voucher_id = ?", [id], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
            } catch (e) {
                logger.warn('Failed to fetch old voucher for audit:', e.message);
            }
        }

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            if (id) {
                // Update
                db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [id]);
                const sql = `UPDATE vouchers SET doc_no=?, doc_date=?, post_date=?, description=?, type=?, total_amount=?, org_doc_no=?, org_doc_date=?, budget_check_status=?, budget_check_message=? WHERE id=?`;
                db.run(sql, [doc_no, doc_date, post_date, description, type, total_amount, org_doc_no, org_doc_date,
                    budgetCheckResult?.status || 'NOT_REQUIRED', budgetCheckResult?.message || null, id], (err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                });
            } else {
                // Create
                const sql = `INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, org_doc_no, org_doc_date, budget_check_status, budget_check_message, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`;
                db.run(sql, [voucherId, doc_no, doc_date, post_date, description, type, total_amount, org_doc_no, org_doc_date,
                    budgetCheckResult?.status || 'NOT_REQUIRED', budgetCheckResult?.message || null, now], (err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                });
            }

            // Insert Items with budget info
            const stmt = db.prepare("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount, partner_code, project_code, contract_code, dim1, dim2, dim3, dim4, dim5, fund_source_id, item_code, sub_item_code, budget_estimate_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            items.forEach(item => {
                const debitAcc = item.debit_acc ?? item.debitAcc ?? '';
                const creditAcc = item.credit_acc ?? item.creditAcc ?? '';
                const partnerCode = item.partner_code ?? item.partnerCode ?? null;
                const projectCode = item.project_code ?? item.projectCode ?? null;
                const contractCode = item.contract_code ?? item.contractCode ?? null;
                const itemCode = item.item_code ?? item.itemCode ?? null;
                const subItemCode = item.sub_item_code ?? item.subItemCode ?? null;
                stmt.run(
                    voucherId,
                    item.description,
                    debitAcc,
                    creditAcc,
                    item.amount,
                    partnerCode,
                    projectCode,
                    contractCode,
                    item.dim1,
                    item.dim2,
                    item.dim3,
                    item.dim4,
                    item.dim5,
                    item.fund_source_id || item.fundSourceId || fund_source_id || null,
                    itemCode,
                    subItemCode,
                    item.budget_estimate_id || item.budgetEstimateId || budget_estimate_id || null
                );
            });
            stmt.finalize((err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }

                // Post to GL immediately
                db.run("DELETE FROM general_ledger WHERE doc_no = ?", [doc_no]);

                const glStmt = db.prepare(`
                    INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, partner_code, project_code, item_code, sub_item_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                items.forEach((item, idx) => {
                    const debitAcc = item.debit_acc ?? item.debitAcc ?? '';
                    const creditAcc = item.credit_acc ?? item.creditAcc ?? '';
                    const partnerCode = item.partner_code ?? item.partnerCode ?? null;
                    const projectCode = item.project_code ?? item.projectCode ?? null;
                    const itemCode = item.item_code ?? item.itemCode ?? null;
                    const subItemCode = item.sub_item_code ?? item.subItemCode ?? null;
                    // Debit Entry
                    glStmt.run(
                        `GL_${voucherId}_${idx}_D`, post_date, now, doc_no, item.description,
                        debitAcc, creditAcc, item.amount, 0, partnerCode, projectCode, itemCode, subItemCode
                    );
                    // Credit Entry
                    glStmt.run(
                        `GL_${voucherId}_${idx}_C`, post_date, now, doc_no, item.description,
                        creditAcc, debitAcc, 0, item.amount, partnerCode, projectCode, itemCode, subItemCode
                    );
                });

                glStmt.finalize();

                db.run("COMMIT");

                // Record budget transaction for expense vouchers
                if (needsBudgetCheck && budgetCheckResult && budgetCheckResult.budget_estimate_id) {
                    budgetService.recordBudgetTransaction({
                        budget_estimate_id: budgetCheckResult.budget_estimate_id,
                        fund_source_id,
                        transaction_type: 'SPENDING',
                        transaction_date: post_date,
                        voucher_id: voucherId,
                        doc_no,
                        description,
                        amount: total_amount,
                        fiscal_year: new Date(post_date).getFullYear(),
                        fiscal_period: new Date(post_date).getMonth() + 1,
                        account_code: items[0]?.debit_acc,
                        created_by: req.user.username
                    }).catch(e => logger.warn('Budget transaction recording failed:', e.message));
                }

                // Create budget alert if warning
                if (budgetCheckResult?.status === 'WARNING') {
                    budgetService.createBudgetAlert({
                        alert_type: 'APPROACHING_LIMIT',
                        severity: 'MEDIUM',
                        budget_estimate_id: budgetCheckResult.budget_estimate_id,
                        fund_source_id,
                        fiscal_year: new Date(post_date).getFullYear(),
                        fiscal_period: new Date(post_date).getMonth() + 1,
                        title: `Cảnh báo sử dụng dự toán`,
                        message: budgetCheckResult.message,
                        threshold_percent: 80,
                        current_percent: parseFloat(budgetCheckResult.new_utilization),
                        budget_amount: budgetCheckResult.allocated,
                        spent_amount: budgetCheckResult.current_spent + total_amount,
                        remaining_amount: budgetCheckResult.available - total_amount,
                        triggered_by_voucher: voucherId,
                        triggered_by_user: req.user.username
                    }).catch(e => logger.warn('Budget alert creation failed:', e.message));
                }

                // Comprehensive audit logging
                auditService.logVoucherAudit({
                    voucher: { id: voucherId, doc_no, doc_date, post_date, description, type, total_amount },
                    items,
                    action: id ? 'UPDATE' : 'CREATE',
                    old_voucher: oldVoucher,
                    old_items: oldItems,
                    user: req.user,
                    ip_address: req.ip,
                    reason: description
                }).catch(e => logger.warn('Audit logging failed:', e.message));

                // Legacy log action (for backwards compatibility)
                logAction(req.user.username, id ? 'UPDATE_VOUCHER' : 'CREATE_VOUCHER', doc_no, `Amount: ${total_amount}`);

                res.json({
                    message: "Voucher saved and posted",
                    id: voucherId,
                    budget_check: budgetCheckResult
                });
            });
        });
    });

    /**
     * DELETE /api/vouchers/:id
     * Delete voucher with comprehensive audit logging
     */
    router.delete('/vouchers/:id', verifyToken, async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body || {};

        // Fetch voucher and items before deletion for audit
        let voucher, items;
        try {
            voucher = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM vouchers WHERE id = ?", [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!voucher) {
                return res.status(404).json({ error: "Voucher not found" });
            }

            items = await new Promise((resolve, reject) => {
                db.all("SELECT * FROM voucher_items WHERE voucher_id = ?", [id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }

        // Check date lock
        try {
            const lockStatus = await checkDateLock(voucher.post_date);
            if (lockStatus.locked) {
                return res.status(403).json({ error: `Kỳ kế toán đã khóa. Không thể xóa chứng từ.` });
            }
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }

        // Check budget period lock
        try {
            const postDateObj = new Date(voucher.post_date);
            const fiscalYear = postDateObj.getFullYear();
            const period = postDateObj.getMonth() + 1;

            const periodLock = await budgetService.isPeriodLocked(fiscalYear, period);
            if (periodLock.locked) {
                return res.status(403).json({
                    error: `Kỳ ngân sách tháng ${period}/${fiscalYear} đã khóa.`
                });
            }
        } catch (e) {
            logger.warn('Budget period check skipped:', e.message);
        }

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [id]);
            db.run("DELETE FROM general_ledger WHERE doc_no = ?", [voucher.doc_no]);
            db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }
                db.run("COMMIT");

                // Reverse budget transaction if applicable
                const hasBudgetInfo = items.some(item => item.budget_estimate_id || item.fund_source_id);
                if (hasBudgetInfo) {
                    const firstItem = items.find(item => item.budget_estimate_id);
                    if (firstItem) {
                        budgetService.recordBudgetTransaction({
                            budget_estimate_id: firstItem.budget_estimate_id,
                            fund_source_id: firstItem.fund_source_id,
                            transaction_type: 'REVERSAL',
                            transaction_date: voucher.post_date,
                            voucher_id: id,
                            doc_no: voucher.doc_no,
                            description: `Reversal: ${voucher.description}`,
                            amount: voucher.total_amount,
                            fiscal_year: new Date(voucher.post_date).getFullYear(),
                            fiscal_period: new Date(voucher.post_date).getMonth() + 1,
                            created_by: req.user.username
                        }).catch(e => logger.warn('Budget reversal failed:', e.message));
                    }
                }

                // Comprehensive audit logging
                auditService.logVoucherAudit({
                    voucher,
                    items,
                    action: 'DELETE',
                    old_voucher: voucher,
                    old_items: items,
                    user: req.user,
                    ip_address: req.ip,
                    reason: reason || 'Xóa chứng từ'
                }).catch(e => logger.warn('Audit logging failed:', e.message));

                logAction(req.user.username, 'DELETE_VOUCHER', voucher.doc_no, `Amount: ${voucher.total_amount}`);
                res.json({ message: "Voucher deleted" });
            });
        });
    });

    // ========================================
    // STAGING (Grid Import)
    // ========================================

    router.get('/staging', verifyToken, (req, res) => {
        db.all("SELECT * FROM staging_transactions ORDER BY id DESC LIMIT 500", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    router.post('/staging/import', verifyToken, (req, res) => {
        const { data } = req.body; // Array of objects matching staging schema
        if (!data || !Array.isArray(data)) return res.status(400).json({ error: "Invalid data format" });

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare(`
                INSERT INTO staging_transactions 
                (trx_date, doc_no, description, debit_acc, credit_acc, amount, currency, partner_code, project_code, item_code, sub_item_code, is_valid, error_log)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            data.forEach(row => {
                // Simple Validation Logic
                let isValid = 1;
                let error = '';
                if (!row.doc_no) { isValid = 0; error += 'Missing Doc No; '; }
                if (!row.debit_acc) { isValid = 0; error += 'Missing Debit Acc; '; }
                if (!row.credit_acc) { isValid = 0; error += 'Missing Credit Acc; '; }

                stmt.run(
                    row.trx_date,
                    row.doc_no,
                    row.description,
                    row.debit_acc,
                    row.credit_acc,
                    row.amount,
                    row.currency,
                    row.partner_code,
                    row.project_code,
                    row.item_code,
                    row.sub_item_code,
                    isValid,
                    error
                );
            });

            stmt.finalize(err => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }
                db.run("COMMIT");
                res.json({ message: `Imported ${data.length} rows to staging.` });
            });
        });
    });

    router.post('/staging/post', verifyToken, (req, res) => {
        // Post valid staging rows to Vouchers & GL
        db.all("SELECT * FROM staging_transactions WHERE is_valid = 1", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (rows.length === 0) return res.status(400).json({ error: "No valid rows to post." });

            const grouped = {};
            rows.forEach(r => {
                if (!grouped[r.doc_no]) grouped[r.doc_no] = [];
                grouped[r.doc_no].push(r);
            });

            // === BALANCE VALIDATION (Nợ = Có) for each voucher group ===
            const balanceErrors = [];
            Object.keys(grouped).forEach(docNo => {
                const items = grouped[docNo];
                const balanceResult = validateVoucherBalance(items);
                if (!balanceResult.isValid) {
                    balanceErrors.push(`Chứng từ ${docNo}: ${balanceResult.error}`);
                }
            });

            if (balanceErrors.length > 0) {
                return res.status(400).json({
                    error: 'Validation failed - Chứng từ không cân đối',
                    details: balanceErrors
                });
            }

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                Object.keys(grouped).forEach(docNo => {
                    const items = grouped[docNo];
                    const first = items[0];
                    const total = items.reduce((sum, i) => sum + i.amount, 0);
                    const voucherId = `V_IMP_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

                    // Create Voucher
                    db.run("INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?,?,?,?,?,?,?,?)",
                        [voucherId, docNo, first.trx_date, first.trx_date, first.description, 'IMPORT', total, new Date().toISOString()]);

                    // Create Items & GL
                    items.forEach((item, idx) => {
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount, partner_code, project_code, item_code, sub_item_code) VALUES (?,?,?,?,?,?,?,?,?)",
                            [voucherId, item.description, item.debit_acc, item.credit_acc, item.amount, item.partner_code, item.project_code, item.item_code, item.sub_item_code]);

                        const glId = `GL_${voucherId}_${idx}`;
                        // Post GL (Simplified - normally requires separate Debit/Credit lines)
                        db.run(`INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, partner_code, project_code, item_code, sub_item_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                            [glId + '_D', item.trx_date, new Date().toISOString(), docNo, item.description, item.debit_acc, item.credit_acc, item.amount, 0, item.partner_code, item.project_code, item.item_code, item.sub_item_code]);

                        db.run(`INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, partner_code, project_code, item_code, sub_item_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                            [glId + '_C', item.trx_date, new Date().toISOString(), docNo, item.description, item.credit_acc, item.debit_acc, 0, item.amount, item.partner_code, item.project_code, item.item_code, item.sub_item_code]);
                    });
                });

                // Clear Staging
                db.run("DELETE FROM staging_transactions WHERE is_valid = 1", (err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                    db.run("COMMIT");
                    res.json({ message: `Posted ${Object.keys(grouped).length} vouchers successfully.` });
                });
            });
        });
    });

    router.delete('/staging', verifyToken, (req, res) => {
        db.run("DELETE FROM staging_transactions", [], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Staging cleared" });
        });
    });

    /**
     * POST /api/vouchers/:id/duplicate
     * Recurring Entries (Duplicate as Draft)
     */
    router.post('/vouchers/:id/duplicate', verifyToken, (req, res) => {
        const { id } = req.params;

        db.get("SELECT * FROM vouchers WHERE id = ?", [id], (err, voucher) => {
            if (err || !voucher) return res.status(404).json({ error: "Voucher not found" });

            let oldDate = new Date(voucher.doc_date);
            if (isNaN(oldDate.getTime())) oldDate = new Date();

            let newDate = new Date(oldDate);
            newDate.setMonth(newDate.getMonth() + 1);
            const newDocDate = newDate.toISOString().split('T')[0];

            const newId = `v_${Date.now()}`;
            const newDocNo = `${voucher.doc_no}-COPY-${Math.floor(Math.random() * 1000)}`;
            const now = new Date().toISOString();

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                const insertVoucher = `INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, status, created_at) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`;

                db.run(insertVoucher,
                    [newId, newDocNo, newDocDate, newDocDate, voucher.description, voucher.type, voucher.total_amount, now],
                    function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: "Failed to create new voucher header" });
                        }

                        db.all("SELECT * FROM voucher_items WHERE voucher_id = ?", [id], (err, items) => {
                            if (err) {
                                db.run("ROLLBACK");
                                return res.status(500).json({ error: "Failed to read items" });
                            }

                            if (items && items.length > 0) {
                                const itemStmt = db.prepare(`INSERT INTO voucher_items 
                                    (voucher_id, description, debit_acc, credit_acc, amount, partner_code, project_code, contract_code, dim1, dim2, dim3, dim4, dim5, item_code, sub_item_code) 
                                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
                                items.forEach(item => {
                                    itemStmt.run(newId, item.description, item.debit_acc, item.credit_acc, item.amount,
                                        item.partner_code, item.project_code, item.contract_code,
                                        item.dim1, item.dim2, item.dim3, item.dim4, item.dim5,
                                        item.item_code, item.sub_item_code);
                                });
                                itemStmt.finalize(err => {
                                    if (err) {
                                        db.run("ROLLBACK");
                                        return res.status(500).json({ error: "Failed to insert items" });
                                    }
                                    db.run("COMMIT");
                                    res.json({ success: true, message: "Voucher duplicated as DRAFT", id: newId });
                                });
                            } else {
                                db.run("COMMIT");
                                res.json({ success: true, message: "Voucher duplicated (no items)", id: newId });
                            }
                        });
                    }
                );
            });
        });
    });

    return router;
};
