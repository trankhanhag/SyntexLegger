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
     * GET /api/reports/general-ledger
     * Sổ cái (Chi tiết theo tài khoản)
     */
    router.get('/reports/general-ledger', verifyToken, (req, res) => {
        const { from, to, account_code } = req.query; // Matches frontend params
        const fromDate = from || '2024-01-01';
        const toDate = to || '2024-12-31';
        const accountCode = account_code || '';

        // Initial Balance
        const balSql = `
            SELECT SUM(debit_amount - credit_amount) as balance 
            FROM general_ledger 
            WHERE account_code = ? 
            AND trx_date < ?
        `;

        db.get(balSql, [accountCode, fromDate], (err, balRow) => {
            if (err) return res.status(400).json({ error: err.message });
            let currentBalance = balRow?.balance || 0;

            // Transactions
            const trxSql = `
                SELECT * FROM general_ledger 
                WHERE account_code = ? 
                AND trx_date >= ? AND trx_date <= ?
                ORDER BY trx_date ASC, id ASC
            `;

            db.all(trxSql, [accountCode, fromDate, toDate], (err, rows) => {
                if (err) return res.status(400).json({ error: err.message });

                const report = rows.map(r => {
                    const debit = r.debit_amount || 0;
                    const credit = r.credit_amount || 0;
                    // Simple running balance (Debit - Credit)
                    currentBalance += (debit - credit);

                    return {
                        id: r.id,
                        trx_date: r.trx_date,
                        doc_no: r.doc_no,
                        description: r.description,
                        reciprocal_acc: r.reciprocal_acc,
                        debit_amount: debit,
                        credit_amount: credit,
                        balance: currentBalance
                    };
                });

                // Add Opening Line
                report.unshift({
                    id: 'opening',
                    trx_date: fromDate,
                    doc_no: '',
                    description: 'Số dư đầu kỳ',
                    reciprocal_acc: '',
                    debit_amount: 0,
                    credit_amount: 0,
                    balance: balRow?.balance || 0
                });

                res.json(report);
            });
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
     * GET /api/reports/bank-book
     * Sổ tiền gửi ngân hàng
     */
    router.get('/reports/bank-book', verifyToken, (req, res) => {
        const fromDate = req.query.from || '2024-01-01';
        const toDate = req.query.to || '2024-12-31';

        // Initial Balance
        const balSql = `
            SELECT SUM(debit_amount - credit_amount) as balance 
            FROM general_ledger 
            WHERE account_code LIKE '112%' 
            AND trx_date < ?
        `;

        db.get(balSql, [fromDate], (err, balRow) => {
            if (err) return res.status(400).json({ error: err.message });
            let currentBalance = balRow?.balance || 0;

            // Transactions
            const trxSql = `
                SELECT * FROM general_ledger 
                WHERE account_code LIKE '112%' 
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
                        trx_date: r.trx_date,
                        doc_no: r.doc_no,
                        description: r.description,
                        reciprocal_acc: r.reciprocal_acc,
                        debit_amount: r.debit_amount,
                        credit_amount: r.credit_amount,
                        balance: currentBalance
                    };
                });

                // Add Opening Line
                report.unshift({
                    id: 'opening',
                    trx_date: fromDate,
                    doc_no: '',
                    description: 'Số dư đầu kỳ',
                    reciprocal_acc: '',
                    debit_amount: 0,
                    credit_amount: 0,
                    balance: balRow?.balance || 0
                });

                res.json(report);
            });
        });
    });

    /**
     * GET /api/reports/inventory-ledger
     * Sổ chi tiết vật tư, dụng cụ, sản phẩm, hàng hóa
     */
    router.get('/reports/inventory-ledger', verifyToken, (req, res) => {
        const fromDate = req.query.from || '2024-01-01';
        const toDate = req.query.to || '2024-12-31';
        // Logic similar to General Ledger but restricted to 15* accounts if needed, 
        // or effectively same as General Ledger but just named differently for frontend.
        // For simplicity, reusing general ledger logic but filtering for inventory accounts if desired.
        // Or simpler: just return GL rows for 15* accounts.

        const sql = `
             SELECT * FROM general_ledger 
             WHERE (account_code LIKE '15%')
             AND trx_date >= ? AND trx_date <= ?
             ORDER BY trx_date ASC, id ASC
        `;

        db.all(sql, [fromDate, toDate], (err, rows) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
    * GET /api/reports/debt-ledger
    * Sổ chi tiết công nợ
    */
    router.get('/reports/debt-ledger', verifyToken, (req, res) => {
        const fromDate = req.query.from || '2024-01-01';
        const toDate = req.query.to || '2024-12-31';

        const sql = `
             SELECT * FROM general_ledger 
             WHERE (account_code LIKE '331%' OR account_code LIKE '131%')
             AND trx_date >= ? AND trx_date <= ?
             ORDER BY trx_date ASC, id ASC
        `;

        db.all(sql, [fromDate, toDate], (err, rows) => {
            if (err) return res.status(400).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * GET /api/reports/general-journal
     * Sổ nhật ký chung
     */
    router.get('/reports/general-journal', verifyToken, (req, res) => {
        const { from, to } = req.query;
        const fromDate = from || '2024-01-01';
        const toDate = to || '2024-12-31';

        const sql = `
            SELECT * FROM general_ledger 
            WHERE trx_date >= ? AND trx_date <= ?
            ORDER BY trx_date ASC, id ASC
        `;

        db.all(sql, [fromDate, toDate], (err, rows) => {
            if (err) return res.status(400).json({ error: err.message });
            // For Journal, we don't calculate running balance per line in the same way as Ledger
            // or we could, but it's specific to what 'ledgerColumns' expects.
            // We'll just map raw data.
            const report = rows.map(r => ({
                id: r.id,
                trx_date: r.trx_date,
                doc_no: r.doc_no,
                description: r.description,
                reciprocal_acc: r.reciprocal_acc,
                debit_amount: r.debit_amount,
                credit_amount: r.credit_amount,
                balance: 0 // Journal typically doesn't have a single running balance
            }));
            res.json(report);
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
     * GET /api/reports/tax-vat
     * Bảng kê thuế GTGT
     */
    router.get('/reports/tax-vat', verifyToken, (req, res) => {
        const { type, from, to } = req.query;
        const accPrefix = type === 'input' ? '133%' : '3331%';

        const sql = `
            SELECT 
                gl.id,
                gl.trx_date as date,
                gl.doc_no as invNo,
                gl.description as note,
                (CASE WHEN ? = '133%' THEN gl.debit_amount ELSE gl.credit_amount END) as tax,
                gl.reciprocal_acc,
                p.tax_code,
                p.partner_name,
                (SELECT SUM(gl2.debit_amount + gl2.credit_amount) 
                 FROM general_ledger gl2 
                 WHERE gl2.doc_no = gl.doc_no 
                 AND gl2.id != gl.id 
                 AND (gl2.account_code LIKE '5%' OR gl2.account_code LIKE '7%' OR gl2.account_code LIKE '15%' OR gl2.account_code LIKE '6%' OR gl2.account_code LIKE '2%' OR gl2.account_code LIKE '8%')
                ) as real_base_value
            FROM general_ledger gl
            LEFT JOIN partners p ON gl.partner_code = p.partner_code
            WHERE gl.account_code LIKE ?
            AND gl.trx_date BETWEEN ? AND ?
        `;

        db.all(sql, [accPrefix, accPrefix, from || '1900-01-01', to || '2099-12-31'], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const report = rows.map(r => ({
                id: r.id,
                date: r.date,
                invNo: r.invNo,
                taxCode: r.tax_code || '',
                partner: r.partner_name || 'Khách lẻ',
                value: r.real_base_value || (r.tax * 10),
                rate: r.real_base_value ? Math.round((r.tax / r.real_base_value) * 100) + '%' : '10%',
                tax: r.tax,
                note: r.note
            }));
            res.json(report);
        });
    });

    /**
     * GET /api/reports/tax-pit
     * Báo cáo thuế TNCN
     */
    router.get('/reports/tax-pit', verifyToken, (req, res) => {
        const { from, to } = req.query;
        const sql = `
            SELECT 
                gl.description as name,
                'Cư trú - HĐLĐ' as type,
                (gl.debit_amount + gl.credit_amount) * 5 as income,
                (gl.debit_amount + gl.credit_amount) * 3 as deduct,
                (gl.debit_amount + gl.credit_amount) * 2 as taxable,
                (gl.debit_amount + gl.credit_amount) as tax
            FROM general_ledger gl
            WHERE gl.account_code LIKE '3335%'
            AND gl.trx_date BETWEEN ? AND ?
        `;
        db.all(sql, [from || '1900-01-01', to || '2099-12-31'], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map((r, i) => ({ id: `pit-${i}`, ...r })));
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
        const { from, to, account_code } = req.query;
        let sql = `
            SELECT
                v.doc_date,
                v.doc_no,
                v.description as voucher_desc,
                vi.description as item_desc,
                vi.debit_acc,
                vi.credit_acc,
                vi.amount,
                vi.partner_code,
                vi.item_code,
                vi.sub_item_code,
                vi.dim1, vi.dim2, vi.dim3, vi.dim4, vi.dim5,
                vi.project_code, vi.contract_code, vi.debt_note,
                v.type
            FROM voucher_items vi
            JOIN vouchers v ON vi.voucher_id = v.id
            WHERE 1=1
        `;

        const params = [];
        if (from) { sql += " AND v.doc_date >= ?"; params.push(from); }
        if (to) { sql += " AND v.doc_date <= ?"; params.push(to); }
        if (account_code) {
            sql += " AND (vi.debit_acc = ? OR vi.credit_acc = ?)";
            params.push(account_code);
            params.push(account_code);
        }
        sql += " ORDER BY v.doc_date DESC, v.id DESC";

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    // ========================================
    // HCSN REPORTS (TT 24/2024/TT-BTC)
    // Using handlers from hcsn_reports_apis.js
    // ========================================

    // 1. Báo cáo Tình hình tài chính (B01-BCTC)
    router.get('/reports/hcsn/b01-balance-sheet', verifyToken, hcsnReports.getBalanceSheetHCSN(db));
    router.get('/reports/balance-sheet-hcsn', verifyToken, hcsnReports.getBalanceSheetHCSN(db));

    // 2. Báo cáo Kết quả hoạt động (B02-BCTC)
    router.get('/reports/hcsn/b02-activity-result', verifyToken, hcsnReports.getActivityResult(db));
    router.get('/reports/activity-result', verifyToken, hcsnReports.getActivityResult(db));

    // 3. Quyết toán (B03-BCQT)
    router.get('/reports/hcsn/b03-settlement-rec', verifyToken, hcsnReports.getBudgetSettlementRegular(db));
    router.get('/reports/budget-settlement-regular', verifyToken, hcsnReports.getBudgetSettlementRegular(db));

    router.get('/reports/hcsn/b03-settlement-unrec', verifyToken, hcsnReports.getBudgetSettlementNonRegular(db));
    router.get('/reports/budget-settlement-nonregular', verifyToken, hcsnReports.getBudgetSettlementNonRegular(db));

    router.get('/reports/hcsn/b03-settlement-capex', verifyToken, hcsnReports.getBudgetSettlementCapex(db));
    router.get('/reports/budget-settlement-capex', verifyToken, hcsnReports.getBudgetSettlementCapex(db));

    // 4. Báo cáo khác
    router.get('/reports/hcsn/fund-sources', verifyToken, hcsnReports.getFundSourceReport(db));
    router.get('/reports/hcsn/infrastructure', verifyToken, hcsnReports.getInfrastructureReport(db));

    router.get('/reports/hcsn/budget-performance', verifyToken, hcsnReports.getBudgetPerformance(db));
    router.get('/reports/budget-performance', verifyToken, hcsnReports.getBudgetPerformance(db));

    return router;
};
