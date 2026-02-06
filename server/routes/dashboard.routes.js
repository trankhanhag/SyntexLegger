/**
 * Dashboard & Reminders Routes
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

const express = require('express');

const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    /**
     * GET /api/reminders
     * Get all reminders and pending tasks
     */
    router.get('/reminders', verifyToken, (req, res) => {
        const now = new Date().toISOString().split('T')[0];

        const overdueSql = `
            SELECT count(*) as count, IFNULL(sum(remaining), 0) as total
            FROM (
                SELECT v.id, (v.total_amount - IFNULL((SELECT SUM(amount) FROM allocations WHERE invoice_voucher_id = v.id), 0)) as remaining
                FROM vouchers v
                WHERE v.type = 'SALES_INVOICE' AND v.doc_date < ?
            )
            WHERE remaining > 0
        `;

        const incompleteSql = `SELECT count(*) as count FROM staging_transactions WHERE is_valid = 0`;

        const currentMonth = now.substring(0, 7);
        const tasksSql = `
            SELECT 
                (SELECT COUNT(*) FROM vouchers WHERE doc_date LIKE ? AND type = 'CLOSING') as closing_run,
                (SELECT COUNT(*) FROM vouchers WHERE doc_date LIKE ? AND type = 'REVALUATION') as revaluation_run,
                (SELECT COUNT(*) FROM vouchers WHERE doc_date LIKE ? AND type = 'ALLOCATION') as allocation_run,
                (SELECT COUNT(*) FROM vouchers WHERE doc_date LIKE ? AND type = 'PAYROLL') as payroll_run
        `;

        db.get(overdueSql, [now], (err, overdue) => {
            if (err) return res.status(500).json({ error: err.message });

            db.get(incompleteSql, [], (err, incomplete) => {
                if (err) return res.status(500).json({ error: err.message });

                db.get(tasksSql, [`${currentMonth}%`, `${currentMonth}%`, `${currentMonth}%`, `${currentMonth}%`], (err, tasks) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const reminders = [];
                    if (overdue && overdue.count > 0) {
                        reminders.push({
                            id: 'overdue_inv',
                            type: 'critical',
                            title: 'Hóa đơn quá hạn',
                            message: `Có ${overdue.count} hóa đơn quá hạn chưa thu tiền. Tổng cộng: ${new Intl.NumberFormat('vi-VN').format(overdue.total)} VND.`,
                            count: overdue.count
                        });
                    }
                    if (incomplete && incomplete.count > 0) {
                        reminders.push({
                            id: 'incomplete_docs',
                            type: 'warning',
                            title: 'Chứng từ chưa hoàn thiện',
                            message: `Có ${incomplete.count} chứng từ trong hàng đợi đang bị lỗi hoặc chưa được kiểm tra.`,
                            count: incomplete.count
                        });
                    }
                    if (tasks.closing_run === 0) {
                        reminders.push({
                            id: 'task_closing',
                            type: 'info',
                            title: 'Kết chuyển cuối kỳ',
                            message: `Bút toán kết chuyển lãi lỗ tháng ${currentMonth.split('-')[1]} chưa được thực hiện.`,
                        });
                    }
                    if (tasks.revaluation_run === 0) {
                        reminders.push({
                            id: 'task_reval',
                            type: 'info',
                            title: 'Đánh giá lại ngoại tệ',
                            message: `Chưa thực hiện đánh giá lại tỷ giá ngoại tệ cuối tháng ${currentMonth.split('-')[1]}.`,
                        });
                    }
                    if (tasks.allocation_run === 0) {
                        reminders.push({
                            id: 'task_alloc',
                            type: 'info',
                            title: 'Khấu hao & Phân bổ',
                            message: `Chưa trích khấu hao TSCĐ và phân bổ chi phí tháng ${currentMonth.split('-')[1]}.`,
                        });
                    }
                    if (tasks.payroll_run === 0) {
                        reminders.push({
                            id: 'task_payroll',
                            type: 'info',
                            title: 'Tính lương nhân viên',
                            message: `Bảng lương tháng ${currentMonth.split('-')[1]} chưa được duyệt hạch toán.`,
                        });
                    }

                    res.json(reminders);
                });
            });
        });
    });

    /**
     * GET /api/dashboard/stats
     * Dashboard statistics
     */
    router.get('/dashboard/stats', verifyToken, (req, res) => {
        const currentYear = new Date().getFullYear();

        const sqlCash = `
            SELECT 
                SUM(CASE WHEN account_code LIKE '111%' OR account_code LIKE '112%' THEN debit_amount - credit_amount ELSE 0 END) as cash
            FROM general_ledger
        `;

        const sqlFund = `
            SELECT 
                IFNULL(SUM(allocated_amount), 0) as fund_allocated,
                IFNULL(SUM(spent_amount), 0) as fund_spent,
                IFNULL(SUM(remaining_amount), 0) as fund_remaining
            FROM fund_sources 
            WHERE fiscal_year = ?
        `;

        const sqlBudget = `
            SELECT 
                IFNULL(SUM(allocated_amount), 0) as budget_allocated,
                IFNULL(SUM(spent_amount), 0) as budget_spent
            FROM budget_estimates
            WHERE fiscal_year = ?
        `;

        const sqlInfrastructure = `
            SELECT 
                COUNT(*) as count,
                IFNULL(SUM(net_value), 0) as total_value
            FROM infrastructure_assets
        `;

        const sqlHistory = `
            SELECT 
                strftime('%Y-%m', trx_date) as month,
                SUM(CASE WHEN account_code LIKE '5%' THEN credit_amount - debit_amount ELSE 0 END) as thu,
                SUM(CASE WHEN account_code LIKE '6%' OR account_code LIKE '7%' THEN debit_amount - credit_amount ELSE 0 END) as chi,
                SUM(CASE WHEN account_code LIKE '11%' THEN debit_amount - credit_amount ELSE 0 END) as cash_net
            FROM general_ledger
            WHERE trx_date >= date('now', 'start of month', '-11 months')
            GROUP BY month
            ORDER BY month ASC
        `;

        db.get(sqlCash, [], (err, cashData) => {
            if (err) return res.status(500).json({ error: err.message });

            db.get(sqlFund, [currentYear], (err, fundData) => {
                if (err) return res.status(500).json({ error: err.message });

                db.get(sqlBudget, [currentYear], (err, budgetData) => {
                    if (err) return res.status(500).json({ error: err.message });

                    db.get(sqlInfrastructure, [], (err, infraData) => {
                        if (err) return res.status(500).json({ error: err.message });

                        db.all(sqlHistory, [], (err, historyRows) => {
                            if (err) return res.status(500).json({ error: err.message });

                            const months = [];
                            const thu = [];
                            const chi = [];
                            const cashFlow = [];

                            for (let i = 11; i >= 0; i--) {
                                const d = new Date();
                                d.setMonth(d.getMonth() - i);
                                const mStr = d.toISOString().slice(0, 7);
                                const row = historyRows.find(r => r.month === mStr) || { thu: 0, chi: 0, cash_net: 0 };

                                months.push(`T${d.getMonth() + 1}`);
                                thu.push(row.thu);
                                chi.push(row.chi);
                                cashFlow.push(row.cash_net);
                            }

                            res.json({
                                cash: cashData.cash || 0,
                                fund_allocated: fundData.fund_allocated || 0,
                                fund_spent: fundData.fund_spent || 0,
                                fund_remaining: fundData.fund_remaining || 0,
                                budget_allocated: budgetData.budget_allocated || 0,
                                budget_spent: budgetData.budget_spent || 0,
                                infrastructure_count: infraData.count || 0,
                                infrastructure_value: infraData.total_value || 0,
                                history: {
                                    labels: months,
                                    thu,
                                    chi,
                                    cash_flow: cashFlow.slice(-6)
                                }
                            });
                        });
                    });
                });
            });
        });
    });

    /**
     * GET /api/reminders/overdue
     * Get overdue invoices detail
     */
    router.get('/reminders/overdue', verifyToken, (req, res) => {
        const now = new Date().toISOString().split('T')[0];
        const sql = `
            SELECT 
                v.id, 
                v.doc_no as invoice_no, 
                p.partner_name, 
                v.doc_date as due_date, 
                (v.total_amount - IFNULL((SELECT SUM(amount) FROM allocations WHERE invoice_voucher_id = v.id), 0)) as amount,
                (julianday('now') - julianday(v.doc_date)) as days_overdue
            FROM vouchers v
            LEFT JOIN partners p ON p.partner_code = (SELECT partner_code FROM voucher_items WHERE voucher_id = v.id LIMIT 1)
            WHERE v.type = 'SALES_INVOICE' 
            AND v.doc_date < ?
            AND (v.total_amount - IFNULL((SELECT SUM(amount) FROM allocations WHERE invoice_voucher_id = v.id), 0)) > 0
        `;
        db.all(sql, [now], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map(r => ({ ...r, days_overdue: Math.floor(r.days_overdue) })));
        });
    });

    /**
     * GET /api/reminders/incomplete
     * Get incomplete staging documents
     */
    router.get('/reminders/incomplete', verifyToken, (req, res) => {
        const sql = `
            SELECT 
                id, 
                doc_no, 
                trx_date as doc_date, 
                description, 
                error_log, 
                CASE WHEN error_log LIKE '%invalid%' THEN 'critical' ELSE 'warning' END as severity
            FROM staging_transactions 
            WHERE is_valid = 0
        `;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    return router;
};
