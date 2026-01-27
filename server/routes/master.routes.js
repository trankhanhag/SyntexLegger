/**
 * Master Data Routes (Accounts, Partners, Products)
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');

const { verifyToken, requireRole, sanitizeBody, sanitizeQuery, validatePartner, validateAccount } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    // ========================================
    // CHART OF ACCOUNTS
    // ========================================

    /**
     * GET /api/accounts
     * Get all accounts
     */
    router.get('/accounts', verifyToken, (req, res) => {
        const sql = "SELECT * FROM chart_of_accounts ORDER BY account_code ASC";
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/master/accounts
     * Save/update chart of accounts
     */
    router.post('/master/accounts', sanitizeBody, validateAccount, verifyToken, (req, res) => {
        const { accounts } = req.body;
        if (!accounts || !Array.isArray(accounts)) return res.status(400).json({ error: "Invalid data" });

        db.serialize(() => {
            const stmt = db.prepare("INSERT OR REPLACE INTO chart_of_accounts (account_code, account_name, parent_account, level, type, is_parent) VALUES (?, ?, ?, ?, ?, ?)");
            accounts.forEach(acc => {
                stmt.run(acc.account_code, acc.account_name, acc.parent_account, acc.level, acc.type, acc.is_parent);
            });
            stmt.finalize(err => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Chart of Accounts updated" });
            });
        });
    });

    /**
     * DELETE /api/accounts/:code
     * Delete an account (Admin only)
     */
    router.delete('/accounts/:code', verifyToken, requireRole('admin'), (req, res) => {
        const { code } = req.params;

        db.get("SELECT account_code FROM chart_of_accounts WHERE account_code = ?", [code], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: "Account not found" });

            // Check if account is used in general ledger
            const glSql = "SELECT COUNT(*) as count FROM general_ledger WHERE account_code = ? OR reciprocal_acc = ?";
            db.get(glSql, [code, code], (glErr, glRow) => {
                if (glErr) return res.status(500).json({ error: glErr.message });
                if (glRow && glRow.count > 0) {
                    return res.status(409).json({ error: "Account is used in general ledger." });
                }

                // Check if account is used in vouchers
                const voucherSql = "SELECT COUNT(*) as count FROM voucher_items WHERE debit_acc = ? OR credit_acc = ?";
                db.get(voucherSql, [code, code], (vErr, vRow) => {
                    if (vErr) return res.status(500).json({ error: vErr.message });
                    if (vRow && vRow.count > 0) {
                        return res.status(409).json({ error: "Account is used in vouchers." });
                    }

                    // Check if account is used in staging
                    const stagingSql = "SELECT COUNT(*) as count FROM staging_transactions WHERE debit_acc = ? OR credit_acc = ?";
                    db.get(stagingSql, [code, code], (sErr, sRow) => {
                        if (sErr) return res.status(500).json({ error: sErr.message });
                        if (sRow && sRow.count > 0) {
                            return res.status(409).json({ error: "Account is used in staging." });
                        }

                        db.run("DELETE FROM chart_of_accounts WHERE account_code = ?", [code], function (delErr) {
                            if (delErr) return res.status(500).json({ error: delErr.message });
                            res.json({ message: "Account deleted", changes: this.changes });
                        });
                    });
                });
            });
        });
    });

    /**
     * GET /api/accounts/balances
     * Get account balances
     */
    router.get('/accounts/balances', verifyToken, (req, res) => {
        const sql = `
            SELECT account_code, SUM(debit_amount) as total_debit, SUM(credit_amount) as total_credit,
                   SUM(debit_amount) - SUM(credit_amount) as balance
            FROM general_ledger
            GROUP BY account_code
            ORDER BY account_code
        `;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * GET /api/accounts/balance/:code
     * Get balance for a specific account
     */
    router.get('/accounts/balance/:code', verifyToken, (req, res) => {
        const code = req.params.code;
        const sql = `SELECT SUM(debit_amount) - SUM(credit_amount) as balance 
                     FROM general_ledger 
                     WHERE account_code = ?`;
        db.get(sql, [code], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ account_code: code, balance: row.balance || 0 });
        });
    });

    // ========================================
    // PARTNERS
    // ========================================

    /**
     * GET /api/partners
     * Get all partners
     */
    router.get('/partners', verifyToken, (req, res) => {
        const sql = "SELECT * FROM partners ORDER BY partner_code ASC";
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/partners
     * Create or update partner
     */
    router.post('/partners', sanitizeBody, validatePartner, verifyToken, (req, res) => {
        const { partner_code, partner_name, tax_code, address } = req.body;
        if (!partner_code || !partner_name) {
            return res.status(400).json({ error: "Partner code and name are required." });
        }

        db.get("SELECT partner_code FROM partners WHERE partner_code = ?", [partner_code], (err, row) => {
            if (row) {
                const sql = `UPDATE partners SET partner_name=?, tax_code=?, address=? WHERE partner_code=?`;
                db.run(sql, [partner_name, tax_code, address, partner_code], function (err) {
                    if (err) return res.status(400).json({ error: err.message });
                    res.json({ message: "Partner updated", id: partner_code });
                });
            } else {
                const sql = `INSERT INTO partners (partner_code, partner_name, tax_code, address) VALUES (?, ?, ?, ?)`;
                db.run(sql, [partner_code, partner_name, tax_code, address], function (err) {
                    if (err) return res.status(400).json({ error: err.message });
                    res.json({ message: "Partner created", id: partner_code });
                });
            }
        });
    });

    /**
     * DELETE /api/partners/:id
     * Delete a partner
     */
    router.delete('/partners/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM partners WHERE partner_code = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Partner deleted", changes: this.changes });
        });
    });

    /**
     * POST /api/master/partners
     * Bulk import partners from Excel
     */
    router.post('/master/partners', sanitizeBody, verifyToken, (req, res) => {
        const { partners } = req.body;
        if (!partners || !Array.isArray(partners)) {
            return res.status(400).json({ error: "Invalid data format" });
        }

        let inserted = 0;
        let updated = 0;
        let errors = [];

        db.serialize(() => {
            const selectStmt = db.prepare("SELECT partner_code FROM partners WHERE partner_code = ?");
            const insertStmt = db.prepare("INSERT INTO partners (partner_code, partner_name, tax_code, address, phone, email, contact_person, partner_type, bank_account, bank_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            const updateStmt = db.prepare("UPDATE partners SET partner_name=?, tax_code=?, address=?, phone=?, email=?, contact_person=?, partner_type=?, bank_account=?, bank_name=? WHERE partner_code=?");

            partners.forEach((p, index) => {
                if (!p.partner_code || !p.partner_name) {
                    errors.push({ row: index + 1, error: "Missing partner_code or partner_name" });
                    return;
                }

                selectStmt.get([p.partner_code], (err, row) => {
                    if (err) {
                        errors.push({ row: index + 1, error: err.message });
                        return;
                    }

                    if (row) {
                        // Update existing
                        updateStmt.run([
                            p.partner_name,
                            p.tax_code || null,
                            p.address || null,
                            p.phone || null,
                            p.email || null,
                            p.contact_person || null,
                            p.partner_type || 'CUSTOMER',
                            p.bank_account || null,
                            p.bank_name || null,
                            p.partner_code
                        ], (updateErr) => {
                            if (updateErr) errors.push({ row: index + 1, error: updateErr.message });
                            else updated++;
                        });
                    } else {
                        // Insert new
                        insertStmt.run([
                            p.partner_code,
                            p.partner_name,
                            p.tax_code || null,
                            p.address || null,
                            p.phone || null,
                            p.email || null,
                            p.contact_person || null,
                            p.partner_type || 'CUSTOMER',
                            p.bank_account || null,
                            p.bank_name || null
                        ], (insertErr) => {
                            if (insertErr) errors.push({ row: index + 1, error: insertErr.message });
                            else inserted++;
                        });
                    }
                });
            });

            selectStmt.finalize();
            insertStmt.finalize();
            updateStmt.finalize((finalErr) => {
                if (finalErr) return res.status(500).json({ error: finalErr.message });
                res.json({
                    message: "Partners imported successfully",
                    inserted,
                    updated,
                    errors: errors.length > 0 ? errors : undefined
                });
            });
        });
    });

    // ========================================
    // PRODUCTS
    // ========================================

    /**
     * GET /api/products
     * Get all products
     */
    router.get('/products', verifyToken, (req, res) => {
        const sql = "SELECT id, code as product_code, name as product_name, unit, price as unit_price, tax, type as category, conversion_units FROM products ORDER BY code ASC";
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/products
     * Create a product
     */
    router.post('/products', verifyToken, (req, res) => {
        const { product_code, product_name, unit, category, unit_price } = req.body;
        const sql = `INSERT INTO products (code, name, unit, type, price) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [product_code, product_name, unit, category, unit_price || 0], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Product created", id: this.lastID });
        });
    });

    /**
     * DELETE /api/products/:id
     * Delete a product
     */
    router.delete('/products/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Product deleted", changes: this.changes });
        });
    });

    /**
     * POST /api/master/products
     * Bulk import products from Excel
     */
    router.post('/master/products', sanitizeBody, verifyToken, (req, res) => {
        const { products } = req.body;
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ error: "Invalid data format" });
        }

        let inserted = 0;
        let updated = 0;
        let errors = [];

        db.serialize(() => {
            const selectStmt = db.prepare("SELECT id FROM products WHERE code = ?");
            const insertStmt = db.prepare("INSERT INTO products (code, name, unit, type, price, tax, conversion_units, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            const updateStmt = db.prepare("UPDATE products SET name=?, unit=?, type=?, price=?, tax=?, conversion_units=?, description=? WHERE code=?");

            products.forEach((p, index) => {
                if (!p.product_code || !p.product_name) {
                    errors.push({ row: index + 1, error: "Missing product_code or product_name" });
                    return;
                }

                selectStmt.get([p.product_code], (err, row) => {
                    if (err) {
                        errors.push({ row: index + 1, error: err.message });
                        return;
                    }

                    if (row) {
                        // Update existing
                        updateStmt.run([
                            p.product_name,
                            p.unit || 'Cái',
                            p.category || 'GOODS',
                            p.unit_price || 0,
                            p.tax || 0,
                            p.conversion_units || null,
                            p.description || null,
                            p.product_code
                        ], (updateErr) => {
                            if (updateErr) errors.push({ row: index + 1, error: updateErr.message });
                            else updated++;
                        });
                    } else {
                        // Insert new
                        insertStmt.run([
                            p.product_code,
                            p.product_name,
                            p.unit || 'Cái',
                            p.category || 'GOODS',
                            p.unit_price || 0,
                            p.tax || 0,
                            p.conversion_units || null,
                            p.description || null
                        ], (insertErr) => {
                            if (insertErr) errors.push({ row: index + 1, error: insertErr.message });
                            else inserted++;
                        });
                    }
                });
            });

            selectStmt.finalize();
            insertStmt.finalize();
            updateStmt.finalize((finalErr) => {
                if (finalErr) return res.status(500).json({ error: finalErr.message });
                res.json({
                    message: "Products imported successfully",
                    inserted,
                    updated,
                    errors: errors.length > 0 ? errors : undefined
                });
            });
        });
    });

    /**
     * GET /api/balances
     * Get cash and bank balances and history
     */
    router.get('/balances', verifyToken, (req, res) => {
        // 1. Calculate Balances
        const balanceSql = `
            SELECT 
                SUM(CASE WHEN account_code LIKE '111%' THEN debit_amount - credit_amount ELSE 0 END) as cash_balance,
                SUM(CASE WHEN account_code LIKE '112%' THEN debit_amount - credit_amount ELSE 0 END) as bank_balance
            FROM general_ledger
        `;

        // 2. Get Transaction History
        const historySql = `
            SELECT * 
            FROM general_ledger 
            WHERE account_code LIKE '111%' OR account_code LIKE '112%' OR account_code LIKE '113%'
            ORDER BY trx_date DESC
            LIMIT 100
        `;

        db.get(balanceSql, [], (err, balanceRow) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(historySql, [], (err2, historyRows) => {
                if (err2) return res.status(500).json({ error: err2.message });

                res.json({
                    cash: balanceRow ? balanceRow.cash_balance || 0 : 0,
                    bank: balanceRow ? balanceRow.bank_balance || 0 : 0,
                    history: historyRows || []
                });
            });
        });
    });

    return router;
};
