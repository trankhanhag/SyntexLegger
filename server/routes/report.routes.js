/**
 * Reporting Routes
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');
const hcsnReports = require('../hcsn_reports_apis');

const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    // ========================================
    // STANDARD ACCOUNTING REPORTS
    // ========================================

    /**
     * GET /api/reports/trial-balance
     * Bảng cân đối phát sinh
     */
    router.get('/reports/trial-balance', verifyToken, (req, res) => {
        const fromDate = req.query.fromDate || new Date().getFullYear() + '-01-01';
        const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

        const sql = `
            SELECT 
                c.account_code, 
                c.account_name,
                -- Opening
                COALESCE(SUM(CASE WHEN gl.trx_date < ? THEN gl.debit_amount ELSE 0 END), 0) as op_debit,
                COALESCE(SUM(CASE WHEN gl.trx_date < ? THEN gl.credit_amount ELSE 0 END), 0) as op_credit,
                -- Period
                COALESCE(SUM(CASE WHEN gl.trx_date >= ? AND gl.trx_date <= ? THEN gl.debit_amount ELSE 0 END), 0) as p_debit,
                COALESCE(SUM(CASE WHEN gl.trx_date >= ? AND gl.trx_date <= ? THEN gl.credit_amount ELSE 0 END), 0) as p_credit
            FROM chart_of_accounts c
            LEFT JOIN general_ledger gl ON c.account_code = gl.account_code
            GROUP BY c.account_code
            ORDER BY c.account_code
        `;

        db.all(sql, [fromDate, fromDate, fromDate, toDate, fromDate, toDate], (err, rows) => {
            if (err) return res.status(400).json({ error: err.message });
            const result = rows.map(r => {
                const op_bal = r.op_debit - r.op_credit;
                const closing_bal = op_bal + (r.p_debit - r.p_credit);
                return {
                    id: r.account_code,
                    account_code: r.account_code,
                    account_name: r.account_name,
                    opening_debit: op_bal > 0 ? op_bal : 0,
                    opening_credit: op_bal < 0 ? Math.abs(op_bal) : 0,
                    period_debit: r.p_debit,
                    period_credit: r.p_credit,
                    closing_debit: closing_bal > 0 ? closing_bal : 0,
                    closing_credit: closing_bal < 0 ? Math.abs(closing_bal) : 0
                };
            }).filter(r => r.opening_debit !== 0 || r.opening_credit !== 0 || r.period_debit !== 0 || r.period_credit !== 0);
            res.json(result);
        });
    });

    /**
     * GET /api/reports/cash-book
     * Sổ quỹ tiền mặt/tiền gửi
     */
    router.get('/reports/cash-book', verifyToken, (req, res) => {
        const fromDate = req.query.fromDate || '2024-01-01';
        const toDate = req.query.toDate || '2024-12-31';

        // Initial Balance
        const balSql = `
            SELECT SUM(debit_amount - credit_amount) as balance 
            FROM general_ledger 
            WHERE (account_code LIKE '111%' OR account_code LIKE '112%') 
            AND trx_date < ?
        `;

        db.get(balSql, [fromDate], (err, balRow) => {
            if (err) return res.status(400).json({ error: err.message });
            let currentBalance = balRow?.balance || 0;

            // Transactions
            const trxSql = `
                SELECT * FROM general_ledger 
                WHERE (account_code LIKE '111%' OR account_code LIKE '112%') 
                AND trx_date >= ? AND trx_date <= ?
                ORDER BY trx_date ASC
            `;

            db.all(trxSql, [fromDate, toDate], (err, rows) => {
                if (err) return res.status(400).json({ error: err.message });

                const report = rows.map(r => {
                    const amount = r.debit_amount > 0 ? r.debit_amount : -r.credit_amount;
                    currentBalance += amount;
                    return {
                        id: r.id,
                        date: r.trx_date,
                        booking_no: r.doc_no,
                        description: r.description,
                        account: r.reciprocal_acc,
                        cash_in: r.debit_amount,
                        cash_out: r.credit_amount,
                        balance: currentBalance
                    };
                });

                // Add Opening Line
                report.unshift({
                    id: 'opening',
                    date: fromDate,
                    booking_no: '',
                    description: 'Số dư đầu kỳ',
                    account: '',
                    cash_in: 0,
                    cash_out: 0,
                    balance: balRow?.balance || 0
                });

                res.json(report);
            });
        });
    });

    /**
     * GET /api/reports/inventory
     * Báo cáo tồn kho
     */
    router.get('/reports/inventory', verifyToken, (req, res) => {
        const fromDate = req.query.fromDate || new Date().getFullYear() + '-01-01';
        const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

        const sql = `
            SELECT 
                account_code, 
                account_code as item_name, 
                SUM(CASE WHEN trx_date < ? THEN debit_amount - credit_amount ELSE 0 END) as opening_val,
                SUM(CASE WHEN trx_date >= ? AND trx_date <= ? THEN debit_amount ELSE 0 END) as in_val,
                SUM(CASE WHEN trx_date >= ? AND trx_date <= ? THEN credit_amount ELSE 0 END) as out_val
            FROM general_ledger
            WHERE account_code LIKE '15%'
            GROUP BY account_code
            HAVING opening_val <> 0 OR in_val <> 0 OR out_val <> 0
        `;

        db.all(sql, [fromDate, fromDate, toDate, fromDate, toDate], (err, rows) => {
            if (err) return res.status(400).json({ error: err.message });

            const result = rows.map(r => {
                const closing = r.opening_val + r.in_val - r.out_val;
                return {
                    id: r.account_code,
                    item_code: r.account_code,
                    item_name: `Mặt hàng ${r.account_code}`,
                    unit: 'VND',
                    opening_qty: 0,
                    opening_value: r.opening_val,
                    in_qty: 0,
                    in_value: r.in_val,
                    out_qty: 0,
                    out_value: r.out_val,
                    closing_qty: 0,
                    closing_value: closing
                };
            });
            res.json(result);
        });
    });

    /**
     * GET /api/reports/balance-sheet
     * Bảng cân đối kế toán (Standard - Simplified)
     */
    router.get('/reports/balance-sheet', verifyToken, (req, res) => {
        const toDate = req.query.toDate || new Date().toISOString().split('T')[0];
        const sql = `
            SELECT account_code, SUM(debit_amount) - SUM(credit_amount) as balance
            FROM general_ledger
            WHERE trx_date <= ?
            GROUP BY account_code
        `;
        db.all(sql, [toDate], (err, rows) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json(rows); // Frontend tự handle format cho mẫu báo cáo này
        });
    });

    /**
     * GET /api/reports/transaction-details
     * Sổ chi tiết
     */
    router.get('/reports/transaction-details', verifyToken, (req, res) => {
        const fromDate = req.query.fromDate || '2024-01-01';
        const toDate = req.query.toDate || '2024-12-31';

        const sql = `
            SELECT * FROM general_ledger 
            WHERE trx_date >= ? AND trx_date <= ?
            ORDER BY trx_date ASC, doc_no ASC
        `;
        db.all(sql, [fromDate, toDate], (err, rows) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json(rows);
        });
    });

    // ========================================
    // HCSN REPORTS (TT 24/2024/TT-BTC)
    // Using handlers from hcsn_reports_apis.js
    // ========================================

    // 1. Báo cáo Tình hình tài chính (B01-BCTC)
    router.get('/reports/hcsn/b01-balance-sheet', verifyToken, hcsnReports.getBalanceSheetHCSN(db));

    // 2. Báo cáo Kết quả hoạt động (B02-BCTC)
    router.get('/reports/hcsn/b02-activity-result', verifyToken, hcsnReports.getActivityResult(db));

    // 3. Quyết toán
    router.get('/reports/hcsn/b03-settlement-rec', verifyToken, hcsnReports.getBudgetSettlementRegular(db));
    router.get('/reports/hcsn/b03-settlement-unrec', verifyToken, hcsnReports.getBudgetSettlementNonRegular(db));
    router.get('/reports/hcsn/b03-settlement-capex', verifyToken, hcsnReports.getBudgetSettlementCapex(db));

    // 4. Báo cáo khác
    router.get('/reports/hcsn/fund-sources', verifyToken, hcsnReports.getFundSourceReport(db));
    router.get('/reports/hcsn/infrastructure', verifyToken, hcsnReports.getInfrastructureReport(db));
    router.get('/reports/hcsn/budget-performance', verifyToken, hcsnReports.getBudgetPerformance(db));

    return router;
};
