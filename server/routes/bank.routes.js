/**
 * Bank Routes
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');
const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    /**
     * GET /api/bank/accounts
     * Get all bank accounts
     */
    router.get('/accounts', verifyToken, (req, res) => {
        const sql = "SELECT * FROM bank_accounts ORDER BY created_at DESC";
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/bank/accounts
     * Create or update bank account
     */
    router.post('/accounts', verifyToken, (req, res) => {
        const { id, bank_name, acc_no, api_key, status } = req.body;

        if (!acc_no || !bank_name) {
            return res.status(400).json({ error: "Bank name and Account number are required." });
        }

        const accountId = id || `bank_${Date.now()}`;
        const now = new Date().toISOString();

        if (id) {
            // Update
            const sql = `UPDATE bank_accounts SET bank_name = ?, acc_no = ?, api_key = ?, status = ? WHERE id = ?`;
            db.run(sql, [bank_name, acc_no, api_key, status || 'active', id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Bank account updated", id });
            });
        } else {
            // Create
            const sql = `INSERT INTO bank_accounts (id, bank_name, acc_no, api_key, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
            db.run(sql, [accountId, bank_name, acc_no, api_key, status || 'active', now], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Bank account created", id: accountId });
            });
        }
    });

    /**
     * DELETE /api/bank/accounts/:id
     * Delete bank account
     */
    router.delete('/accounts/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM bank_accounts WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Bank account deleted", changes: this.changes });
        });
    });

    return router;
};
