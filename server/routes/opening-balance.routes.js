/**
 * Opening Balance Routes
 * Handles initialization and management of opening account balances
 */

const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');

module.exports = (db) => {
    const router = express.Router();

    // 1. Get Summary Opening Balances for a year
    router.get('/opening-balance', verifyToken, (req, res) => {
        const { period } = req.query; // Expect YYYY
        if (!period) return res.status(400).json({ error: "Missing period (YYYY)" });

        const docNo = `OPN-${period}`;
        const sql = `
            SELECT 
                account_code, 
                partner_code,
                debit_amount as debit, 
                credit_amount as credit
            FROM general_ledger 
            WHERE doc_no = ?
        `;

        db.all(sql, [docNo], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    // 2. Get Details (by Partner) for a specific account
    router.get('/opening-balance/details', verifyToken, (req, res) => {
        const { period, account_code } = req.query;
        if (!period || !account_code) return res.status(400).json({ error: "Missing period or account_code" });

        const docNo = `OPN-${period}`;
        const sql = `
            SELECT 
                id, partner_code, 
                debit_amount as debit, 
                credit_amount as credit
            FROM general_ledger 
            WHERE doc_no = ? AND account_code = ?
            AND (partner_code IS NOT NULL AND partner_code != '')
        `;

        db.all(sql, [docNo, account_code], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    // 3. Save Opening Balances
    router.post('/opening-balance/save', verifyToken, (req, res) => {
        const { period, balances } = req.body;
        if (!period || !balances || !Array.isArray(balances)) {
            return res.status(400).json({ error: "Invalid payload" });
        }

        const docNo = `OPN-${period}`;
        const voucherId = `OPN_${period}_${Date.now()}`;
        const trxDate = `${period}-01-01`;
        const now = new Date().toISOString();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // Clear old Opening Balances for this period
            db.run("DELETE FROM vouchers WHERE doc_no = ?", [docNo]);
            db.run("DELETE FROM general_ledger WHERE doc_no = ?", [docNo]);
            db.run("DELETE FROM voucher_items WHERE voucher_id IN (SELECT id FROM vouchers WHERE doc_no = ?)", [docNo]);

            // Insert Header
            const totalAmount = balances.reduce((sum, b) => sum + (b.debit || 0), 0);

            db.run(`INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [voucherId, docNo, trxDate, trxDate, `Số dư đầu kỳ ${period}`, 'OPENING_BALANCE', totalAmount, now, 'POSTED']);

            // Insert Items & GL
            const stmtItem = db.prepare(`INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount, dim1, dim2, partner_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            const stmtGL = db.prepare(`INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id, partner_code) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

            balances.forEach((item, index) => {
                if (item.details && Array.isArray(item.details) && item.details.length > 0) {
                    item.details.forEach((detail, dIdx) => {
                        const dDebit = detail.debit || 0;
                        const dCredit = detail.credit || 0;
                        const amount = dDebit > 0 ? dDebit : dCredit;
                        const partner = detail.partner_code || '';

                        if (amount > 0) {
                            const glId = `gl_${voucherId}_${index}_${dIdx}`;
                            stmtItem.run(voucherId, `Số dư chi tiết ${item.account_code}`, dDebit > 0 ? item.account_code : null, dDebit > 0 ? null : item.account_code, amount, '', '', partner);
                            stmtGL.run(glId, trxDate, now, docNo, `Số dư đầu kỳ ${item.account_code} - ${partner}`, item.account_code, 'OPN', dDebit, dCredit, 'opening', partner);
                        }
                    });
                } else {
                    const debit = item.debit || 0;
                    const credit = item.credit || 0;

                    if (debit > 0 || credit > 0) {
                        const amount = debit > 0 ? debit : credit;
                        const glId = `gl_${voucherId}_${index}`;
                        stmtItem.run(voucherId, `Số dư chi tiết ${item.account_code}`, debit > 0 ? item.account_code : null, debit > 0 ? null : item.account_code, amount, '', '', '');
                        stmtGL.run(glId, trxDate, now, docNo, `Số dư đầu kỳ ${item.account_code}`, item.account_code, 'OPN', debit, credit, 'opening', '');
                    }
                }
            });

            stmtItem.finalize();
            stmtGL.finalize();

            db.run("COMMIT", (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: "Saved opening balances." });
            });
        });
    });

    // 4. Transfer Balances from Previous Year
    router.post('/opening-balance/transfer', verifyToken, (req, res) => {
        const { fromPeriod, toPeriod } = req.body;
        if (!fromPeriod || !toPeriod) return res.status(400).json({ error: "Missing periods" });

        const endDate = `${fromPeriod}-12-31`;
        const sql = `
            SELECT 
                account_code,
                SUM(debit_amount - credit_amount) as balance
            FROM general_ledger
            WHERE trx_date <= ?
            AND (account_code LIKE '1%' OR account_code LIKE '2%' OR account_code LIKE '3%' OR account_code LIKE '4%')
            GROUP BY account_code
            HAVING balance != 0
        `;

        db.all(sql, [endDate], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            if (rows.length === 0) {
                return res.json({ success: false, message: `Không tìm thấy số dư cuối kỳ ${fromPeriod} để chuyển.` });
            }

            const balances = rows.map(r => ({
                account_code: r.account_code,
                debit: r.balance > 0 ? r.balance : 0,
                credit: r.balance < 0 ? Math.abs(r.balance) : 0
            }));

            const period = toPeriod;
            const docNo = `OPN-${period}`;
            const voucherId = `OPN_${period}_${Date.now()}`;
            const trxDate = `${period}-01-01`;
            const now = new Date().toISOString();

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                db.run("DELETE FROM vouchers WHERE doc_no = ?", [docNo]);
                db.run("DELETE FROM general_ledger WHERE doc_no = ?", [docNo]);
                db.run("DELETE FROM voucher_items WHERE voucher_id IN (SELECT id FROM vouchers WHERE doc_no = ?)", [docNo]);

                const totalAmount = balances.reduce((sum, b) => sum + b.debit, 0);

                db.run(`INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'POSTED')`,
                    [voucherId, docNo, trxDate, trxDate, `Số dư đầu kỳ ${period} (Kết chuyển từ ${fromPeriod})`, 'OPENING_BALANCE', totalAmount, now]);

                const stmtItem = db.prepare(`INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount) VALUES (?, ?, ?, ?, ?)`);
                const stmtGL = db.prepare(`INSERT INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)`);

                balances.forEach((item, index) => {
                    if (item.debit > 0) {
                        stmtItem.run(voucherId, 'Số dư đầu kỳ', item.account_code, '', item.debit);
                        stmtGL.run(`gl_opn_${period}_${index}_d`, trxDate, now, docNo, 'Số dư đầu kỳ', item.account_code, '', item.debit, 0, voucherId);
                    }
                    if (item.credit > 0) {
                        stmtItem.run(voucherId, 'Số dư đầu kỳ', '', item.account_code, item.credit);
                        stmtGL.run(`gl_opn_${period}_${index}_c`, trxDate, now, docNo, 'Số dư đầu kỳ', item.account_code, '', 0, item.credit, voucherId);
                    }
                });

                stmtItem.finalize();
                stmtGL.finalize();

                db.run("COMMIT", (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, message: `Đã kết chuyển thành công ${balances.length} tài khoản sang năm ${toPeriod}.` });
                });
            });
        });
    });

    return router;
};
