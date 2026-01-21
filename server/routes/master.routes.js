/**
 * Master Data Routes (Accounts, Partners, Products)
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');

const { verifyToken, requireRole } = require('../middleware');

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
    router.post('/master/accounts', verifyToken, (req, res) => {
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
    router.post('/partners', verifyToken, (req, res) => {
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

    // ========================================
    // PRODUCTS
    // ========================================

    /**
     * GET /api/products
     * Get all products
     */
    router.get('/products', verifyToken, (req, res) => {
        const sql = "SELECT * FROM products ORDER BY product_code ASC";
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
        const id = `prod_${Date.now()}`;
        const sql = `INSERT INTO products (id, product_code, product_name, unit, category, unit_price) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sql, [id, product_code, product_name, unit, category, unit_price || 0], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Product created", id });
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

    return router;
};
