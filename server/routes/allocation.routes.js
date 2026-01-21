/**
 * Allocation Routes (Payment vs Invoice matching)
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');

const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    /**
     * GET /api/partners/:code/unpaid-invoices
     * Get unpaid invoices for a partner
     */
    router.get('/partners/:code/unpaid-invoices', verifyToken, (req, res) => {
        const partnerCode = req.params.code;
        const sql = `
            SELECT v.id, v.doc_no, v.doc_date, v.total_amount,
            (v.total_amount - IFNULL((SELECT SUM(amount) FROM allocations WHERE invoice_voucher_id = v.id), 0)) as remaining_amount
            FROM vouchers v
            WHERE v.id IN (SELECT voucher_id FROM voucher_items WHERE partner_code = ?)
            AND (v.total_amount - IFNULL((SELECT SUM(amount) FROM allocations WHERE invoice_voucher_id = v.id), 0)) > 0
        `;
        db.all(sql, [partnerCode], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/allocations
     * Create payment allocations
     */
    router.post('/allocations', verifyToken, (req, res) => {
        const { payment_id, items } = req.body;
        const now = new Date().toISOString();

        db.serialize(() => {
            const stmt = db.prepare("INSERT INTO allocations (id, payment_voucher_id, invoice_voucher_id, amount, allocated_at) VALUES (?, ?, ?, ?, ?)");
            items.forEach(item => {
                stmt.run(`${payment_id}_${item.invoice_id}_${Date.now()}`, payment_id, item.invoice_id, item.amount, now);
            });
            stmt.finalize((err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ status: 'success' });
            });
        });
    });

    /**
     * GET /api/allocations/payment/:id
     * Get allocations for a payment
     */
    router.get('/allocations/payment/:id', verifyToken, (req, res) => {
        const paymentId = req.params.id;
        const sql = `
            SELECT v.id as invoice_id, v.doc_no, v.doc_date, v.total_amount,
                   SUM(a.amount) as allocated_amount
            FROM allocations a
            JOIN vouchers v ON v.id = a.invoice_voucher_id
            WHERE a.payment_voucher_id = ?
            GROUP BY v.id, v.doc_no, v.doc_date, v.total_amount
            HAVING SUM(a.amount) > 0
        `;
        db.all(sql, [paymentId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/allocations/reverse
     * Reverse allocations
     */
    router.post('/allocations/reverse', verifyToken, (req, res) => {
        const { payment_id, items } = req.body;
        const now = new Date().toISOString();

        db.serialize(() => {
            const stmt = db.prepare("INSERT INTO allocations (id, payment_voucher_id, invoice_voucher_id, amount, allocated_at) VALUES (?, ?, ?, ?, ?)");
            items.forEach(item => {
                const reverseAmount = -Math.abs(item.amount);
                stmt.run(`${payment_id}_${item.invoice_id}_${Date.now()}`, payment_id, item.invoice_id, reverseAmount, now);
            });
            stmt.finalize((err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ status: 'success' });
            });
        });
    });

    return router;
};
