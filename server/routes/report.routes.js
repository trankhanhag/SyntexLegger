/**
 * Reporting Routes
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

const express = require('express');
const dnReports = require('../dn_reports_apis');
// Legacy HCSN reports (kept for reference)
// const hcsnReports = require('../hcsn_reports_apis');

const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    // ========================================
    // TAX REPORTS
    // ========================================

    /**
     * GET /api/reports/tax-declaration
     * Tờ khai thuế (GTGT, TNCN, TNDN)
     */
    router.get('/reports/tax-declaration', verifyToken, (req, res) => {
        const { type, from, to } = req.query;
        const fromDate = from || new Date().toISOString().slice(0, 8) + '01';
        const toDate = to || new Date().toISOString().slice(0, 10);

        // Basic aggregation queries based on Account Codes
        // Note: This is an approximation. Real tax reports need Invoice details.

        if (type === 'vat') {
            // VAT Calculation (01/GTGT)
            // Input VAT: 133 (or 3113 in HCSN mapping if applicable, usually 133/333 in commercial view)
            // Output VAT: 3331
            const sql = `
                SELECT 
                    SUM(CASE WHEN account_code LIKE '133%' THEN debit_amount ELSE 0 END) as input_vat,
                    SUM(CASE WHEN account_code LIKE '3331%' THEN credit_amount ELSE 0 END) as output_vat,
                    SUM(CASE WHEN account_code LIKE '511%' OR account_code LIKE '531%' THEN credit_amount ELSE 0 END) as revenue
                FROM general_ledger
                WHERE trx_date >= ? AND trx_date <= ?
            `;

            db.get(sql, [fromDate, toDate], (err, row) => {
                if (err) return res.status(400).json({ error: err.message });

                const inputVAT = row?.input_vat || 0;
                const outputVAT = row?.output_vat || 0;
                const revenue = row?.revenue || 0;

                res.json({
                    // Input
                    v23: revenue * 0.8, // Rough estimate of purchase value based on input VAT? No, just placeholder.
                    v24: inputVAT,
                    v25: inputVAT, // Assume all deductible

                    // Output (All assumed 10% for simplicity if tax exists, ensuring balanced math)
                    v32a: 0,
                    v33: revenue + outputVAT,
                    v34: revenue,
                    v35: outputVAT,

                    // Detailed breakdown (Put all in 10% [32] for now)
                    v26: 0, v27: 0, v28: 0, v29: 0, v30: 0,
                    v31: revenue,
                    v32: outputVAT,

                    // Adjustments
                    v37: 0, v38: 0, v39: 0, v40a: 0, v42: 0
                });
            });

        } else if (type === 'pit') {
            // PIT Calculation (05/KK-TNCN)
            // Tax: 3335
            const sql = `
                SELECT 
                    SUM(CASE WHEN account_code LIKE '3335%' THEN credit_amount ELSE 0 END) as pit_tax
                FROM general_ledger
                WHERE trx_date >= ? AND trx_date <= ?
            `;

            db.get(sql, [fromDate, toDate], (err, row) => {
                if (err) return res.status(400).json({ error: err.message });
                const pit = row?.pit_tax || 0;

                res.json({
                    v21: 10, // Mock employee count
                    v24: pit * 10, // Mock income (10% rate reverse calc)
                    v30: pit
                });
            });

        } else if (type === 'cit') {
            // CIT Calculation (03/TNDN)
            // Tax: 3334
            const sql = `
                SELECT 
                    SUM(CASE WHEN account_code LIKE '3334%' THEN credit_amount ELSE 0 END) as cit_tax,
                    SUM(CASE WHEN account_code LIKE '511%' OR account_code LIKE '531%' THEN credit_amount ELSE 0 END) as revenue,
                    SUM(CASE WHEN account_code LIKE '6%' OR account_code LIKE '8%' THEN debit_amount ELSE 0 END) as expenses
                FROM general_ledger
                WHERE trx_date >= ? AND trx_date <= ?
            `;

            db.get(sql, [fromDate, toDate], (err, row) => {
                if (err) return res.status(400).json({ error: err.message });
                const revenue = row?.revenue || 0;
                const expenses = row?.expenses || 0;
                const profit = revenue - expenses;
                const cit = row?.cit_tax || 0;

                res.json({
                    a1: revenue,
                    b1: profit,
                    b13: 0,
                    b14: 0,
                    c2: 0,
                    c7: cit, // Standard rate tax
                    c10: cit,
                    g2: cit // Paid same as calculated for now
                });
            });
        } else {
            res.json({});
        }
    });

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
                vi.id as id,
                v.id as voucher_id,
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
    // BALANCE VERIFICATION REPORT
    // Kiểm tra cân đối Nợ = Có theo kỳ
    // ========================================

    /**
     * GET /api/reports/balance-verification
     * Check that total debits = total credits for a period
     * Excludes off-balance sheet accounts (accounts starting with "0")
     */
    router.get('/reports/balance-verification', verifyToken, (req, res) => {
        const { fromDate, toDate, period } = req.query;

        // Build date conditions
        let dateConditions = '';
        const params = [];

        if (period) {
            // Format: YYYY-MM
            const [year, month] = period.split('-').map(Number);
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
            dateConditions = ' AND trx_date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else if (fromDate && toDate) {
            dateConditions = ' AND trx_date BETWEEN ? AND ?';
            params.push(fromDate, toDate);
        }

        // Query 1: Overall balance check (excluding off-balance sheet accounts starting with "0")
        const overallSql = `
            SELECT
                SUM(debit_amount) as total_debit,
                SUM(credit_amount) as total_credit,
                SUM(debit_amount) - SUM(credit_amount) as difference,
                COUNT(*) as entry_count
            FROM general_ledger
            WHERE account_code NOT LIKE '0%' ${dateConditions}
        `;

        // Query 2: Balance by voucher (to find unbalanced vouchers)
        const byVoucherSql = `
            SELECT
                doc_no,
                MIN(trx_date) as doc_date,
                SUM(debit_amount) as total_debit,
                SUM(credit_amount) as total_credit,
                ABS(SUM(debit_amount) - SUM(credit_amount)) as difference
            FROM general_ledger
            WHERE account_code NOT LIKE '0%' ${dateConditions}
            GROUP BY doc_no
            HAVING ABS(SUM(debit_amount) - SUM(credit_amount)) > 0.01
            ORDER BY difference DESC
        `;

        // Query 3: Off-balance sheet summary
        const offBalanceSql = `
            SELECT
                account_code,
                SUM(debit_amount) as total_debit,
                SUM(credit_amount) as total_credit,
                COUNT(*) as entry_count
            FROM general_ledger
            WHERE account_code LIKE '0%' ${dateConditions}
            GROUP BY account_code
            ORDER BY account_code
        `;

        db.get(overallSql, params, (err, overall) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(byVoucherSql, params, (err, unbalancedVouchers) => {
                if (err) return res.status(500).json({ error: err.message });

                db.all(offBalanceSql, params, (err, offBalanceSheet) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const tolerance = 0.01;
                    const isBalanced = Math.abs(overall?.difference || 0) <= tolerance;

                    res.json({
                        period: period || `${fromDate || 'all'} - ${toDate || 'all'}`,
                        summary: {
                            is_balanced: isBalanced,
                            total_debit: overall?.total_debit || 0,
                            total_credit: overall?.total_credit || 0,
                            difference: overall?.difference || 0,
                            entry_count: overall?.entry_count || 0,
                            status: isBalanced ? 'CÂN ĐỐI' : 'KHÔNG CÂN ĐỐI',
                            message: isBalanced
                                ? 'Tổng phát sinh Nợ = Tổng phát sinh Có (TK trong bảng)'
                                : `Chênh lệch: ${Math.abs(overall?.difference || 0).toLocaleString('vi-VN')} VNĐ`
                        },
                        unbalanced_vouchers: unbalancedVouchers || [],
                        off_balance_sheet: {
                            note: 'Tài khoản ngoài bảng (TK bắt đầu bằng 0) - Ghi đơn, không áp dụng nguyên tắc Nợ = Có',
                            accounts: offBalanceSheet || []
                        }
                    });
                });
            });
        });
    });

    /**
     * GET /api/reports/voucher-balance/:docNo
     * Check balance for a specific voucher
     */
    router.get('/reports/voucher-balance/:docNo', verifyToken, (req, res) => {
        const { docNo } = req.params;

        const sql = `
            SELECT
                doc_no,
                trx_date,
                description,
                account_code,
                reciprocal_acc,
                debit_amount,
                credit_amount
            FROM general_ledger
            WHERE doc_no = ?
            ORDER BY id
        `;

        const summarySql = `
            SELECT
                SUM(CASE WHEN account_code NOT LIKE '0%' THEN debit_amount ELSE 0 END) as total_debit,
                SUM(CASE WHEN account_code NOT LIKE '0%' THEN credit_amount ELSE 0 END) as total_credit,
                SUM(CASE WHEN account_code LIKE '0%' THEN debit_amount ELSE 0 END) as off_balance_debit,
                SUM(CASE WHEN account_code LIKE '0%' THEN credit_amount ELSE 0 END) as off_balance_credit
            FROM general_ledger
            WHERE doc_no = ?
        `;

        db.all(sql, [docNo], (err, entries) => {
            if (err) return res.status(500).json({ error: err.message });

            db.get(summarySql, [docNo], (err, summary) => {
                if (err) return res.status(500).json({ error: err.message });

                const tolerance = 0.01;
                const difference = (summary?.total_debit || 0) - (summary?.total_credit || 0);
                const isBalanced = Math.abs(difference) <= tolerance;

                res.json({
                    doc_no: docNo,
                    is_balanced: isBalanced,
                    on_balance_sheet: {
                        total_debit: summary?.total_debit || 0,
                        total_credit: summary?.total_credit || 0,
                        difference: difference,
                        status: isBalanced ? 'CÂN ĐỐI' : 'KHÔNG CÂN ĐỐI'
                    },
                    off_balance_sheet: {
                        total_debit: summary?.off_balance_debit || 0,
                        total_credit: summary?.off_balance_credit || 0,
                        note: 'TK ngoài bảng - Ghi đơn'
                    },
                    entries: entries || []
                });
            });
        });
    });

    // ========================================
    // DN REPORTS (TT 99/2025/TT-BTC)
    // Using handlers from dn_reports_apis.js
    // ========================================

    // 1. Bảng Cân đối Kế toán (B01-DN)
    router.get('/reports/balance-sheet-dn', verifyToken, dnReports.getBalanceSheetDN(db));
    router.get('/reports/dn/b01-balance-sheet', verifyToken, dnReports.getBalanceSheetDN(db));

    // 2. Báo cáo Kết quả Kinh doanh (B02-DN)
    router.get('/reports/profit-loss', verifyToken, dnReports.getProfitLossStatement(db));
    router.get('/reports/dn/b02-profit-loss', verifyToken, dnReports.getProfitLossStatement(db));

    // 3. Báo cáo Lưu chuyển Tiền tệ (B03-DN)
    router.get('/reports/cash-flow-dn', verifyToken, dnReports.getCashFlowStatement(db));
    router.get('/reports/dn/b03-cash-flow', verifyToken, dnReports.getCashFlowStatement(db));

    // 4. Thuyết minh Báo cáo Tài chính (B09-DN)
    router.get('/reports/notes-fs', verifyToken, dnReports.getNotesToFinancialStatements(db));
    router.get('/reports/dn/b09-notes-financial', verifyToken, dnReports.getNotesToFinancialStatements(db));

    // 5. Phân tích Chi phí
    router.get('/reports/cost-analysis', verifyToken, dnReports.getCostAnalysis(db));

    // Phân tích Lợi nhuận
    router.get('/reports/profitability-analysis', verifyToken, dnReports.getProfitabilityAnalysis(db));

    // Báo cáo Thực hiện Kế hoạch/Ngân sách
    router.get('/reports/budget-performance', verifyToken, dnReports.getBudgetPerformance(db));

    // ========================================
    // Legacy HCSN REPORTS (TT 24/2024/TT-BTC)
    // REMOVED - Không còn sử dụng cho Doanh nghiệp
    // ========================================
    // router.get('/reports/balance-sheet-hcsn', verifyToken, hcsnReports.getBalanceSheetHCSN(db));
    // router.get('/reports/activity-result', verifyToken, hcsnReports.getActivityResult(db));
    // router.get('/reports/budget-settlement-*', verifyToken, ...);

    return router;
};
