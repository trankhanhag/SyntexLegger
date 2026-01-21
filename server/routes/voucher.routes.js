/**
 * Voucher Routes (General Vouchers, Staging, Receipt/Payment)
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');
const fs = require('fs');

const { verifyToken, requireRole, checkDateLock, logAction } = require('../middleware');

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
    router.get('/vouchers', verifyToken, (req, res) => {
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
     * Create or update voucher
     */
    router.post('/vouchers', verifyToken, async (req, res) => {
        const { id, doc_no, doc_date, post_date, description, type, items, total_amount, org_doc_no, org_doc_date } = req.body;

        // Check date lock
        try {
            const lockStatus = await checkDateLock(post_date);
            if (lockStatus.locked) {
                return res.status(403).json({ error: `Kỳ kế toán đã khóa đến ngày ${lockStatus.lockedUntil}. Không thể ghi sổ.` });
            }
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }

        const voucherId = id || `V${Date.now()}`;
        const now = new Date().toISOString();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            if (id) {
                // Update
                db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [id]);
                const sql = `UPDATE vouchers SET doc_no=?, doc_date=?, post_date=?, description=?, type=?, total_amount=?, org_doc_no=?, org_doc_date=? WHERE id=?`;
                db.run(sql, [doc_no, doc_date, post_date, description, type, total_amount, org_doc_no, org_doc_date, id], (err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                });
            } else {
                // Create
                const sql = `INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, org_doc_no, org_doc_date, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`;
                db.run(sql, [voucherId, doc_no, doc_date, post_date, description, type, total_amount, org_doc_no, org_doc_date, now], (err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                });
            }

            // Insert Items
            const stmt = db.prepare("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount, partner_code, project_code, contract_code, dim1, dim2, dim3, dim4, dim5) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
            items.forEach(item => {
                stmt.run(voucherId, item.description, item.debit_acc, item.credit_acc, item.amount,
                    item.partner_code, item.project_code, item.contract_code,
                    item.dim1, item.dim2, item.dim3, item.dim4, item.dim5);
            });
            stmt.finalize((err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }

                // Post to GL immediately (Simplified)
                // In real system, this might be a separate step or background job
                // For now, we assume simple posting

                db.run("DELETE FROM general_ledger WHERE doc_no = ?", [doc_no]);

                const glStmt = db.prepare(`
                    INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, partner_code, project_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                items.forEach((item, idx) => {
                    // Debit Entry
                    glStmt.run(
                        `GL_${voucherId}_${idx}_D`, post_date, now, doc_no, item.description,
                        item.debit_acc, item.credit_acc, item.amount, 0, item.partner_code, item.project_code
                    );
                    // Credit Entry
                    glStmt.run(
                        `GL_${voucherId}_${idx}_C`, post_date, now, doc_no, item.description,
                        item.credit_acc, item.debit_acc, 0, item.amount, item.partner_code, item.project_code
                    );
                });

                glStmt.finalize();

                db.run("COMMIT");
                logAction(req.user.username, id ? 'UPDATE_VOUCHER' : 'CREATE_VOUCHER', doc_no, `Amount: ${total_amount}`);
                res.json({ message: "Voucher saved and posted", id: voucherId });
            });
        });
    });

    /**
     * DELETE /api/vouchers/:id
     */
    router.delete('/vouchers/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.get("SELECT doc_no, post_date FROM vouchers WHERE id = ?", [id], async (err, row) => {
            if (err || !row) return res.status(404).json({ error: "Voucher not found" });

            try {
                const lockStatus = await checkDateLock(row.post_date);
                if (lockStatus.locked) {
                    return res.status(403).json({ error: `Kỳ kế toán đã khóa. Không thể xóa chứng từ.` });
                }
            } catch (e) {
                return res.status(500).json({ error: e.message });
            }

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                db.run("DELETE FROM voucher_items WHERE voucher_id = ?", [id]);
                db.run("DELETE FROM general_ledger WHERE doc_no = ?", [row.doc_no]);
                db.run("DELETE FROM vouchers WHERE id = ?", [id], function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                    db.run("COMMIT");
                    logAction(req.user.username, 'DELETE_VOUCHER', row.doc_no, '');
                    res.json({ message: "Voucher deleted" });
                });
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
                (trx_date, doc_no, description, debit_acc, credit_acc, amount, currency, partner_code, project_code, is_valid, error_log)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            data.forEach(row => {
                // Simple Validation Logic
                let isValid = 1;
                let error = '';
                if (!row.doc_no) { isValid = 0; error += 'Missing Doc No; '; }
                if (!row.debit_acc) { isValid = 0; error += 'Missing Debit Acc; '; }
                if (!row.credit_acc) { isValid = 0; error += 'Missing Credit Acc; '; }

                stmt.run(row.trx_date, row.doc_no, row.description, row.debit_acc, row.credit_acc, row.amount, row.currency, row.partner_code, row.project_code, isValid, error);
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
                        db.run("INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount, partner_code, project_code) VALUES (?,?,?,?,?,?,?)",
                            [voucherId, item.description, item.debit_acc, item.credit_acc, item.amount, item.partner_code, item.project_code]);

                        const glId = `GL_${voucherId}_${idx}`;
                        // Post GL (Simplified - normally requires separate Debit/Credit lines)
                        db.run(`INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, partner_code, project_code) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                            [glId + '_D', item.trx_date, new Date().toISOString(), docNo, item.description, item.debit_acc, item.credit_acc, item.amount, 0, item.partner_code, item.project_code]);

                        db.run(`INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, partner_code, project_code) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                            [glId + '_C', item.trx_date, new Date().toISOString(), docNo, item.description, item.credit_acc, item.debit_acc, 0, item.amount, item.partner_code, item.project_code]);
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

    return router;
};
