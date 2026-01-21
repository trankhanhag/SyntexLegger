const { v4: uuidv4 } = require('uuid');

/**
 * Expense Module APIs for HCSN
 * Quản lý Chi sự nghiệp theo TT 24/2024
 */

// ==================== EXPENSE CATEGORIES ====================

/**
 * GET /api/expense/categories
 * Lấy danh sách khoản mục chi
 */
function getCategories(db) {
    return (req, res) => {
        const { expense_type, active } = req.query;

        let sql = 'SELECT * FROM expense_categories WHERE 1=1';
        const params = [];

        if (expense_type) {
            sql += ' AND expense_type = ?';
            params.push(expense_type);
        }

        if (active !== undefined) {
            sql += ' AND active = ?';
            params.push(active === 'true' ? 1 : 0);
        }

        sql += ' ORDER BY expense_type, code';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get expense categories error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

/**
 * POST /api/expense/categories
 * Tạo khoản mục chi mới
 */
function createCategory(db) {
    return (req, res) => {
        const { code, name, expense_type, account_code, description } = req.body;

        if (!code || !name || !expense_type) {
            return res.status(400).json({ error: 'Missing required fields: code, name, expense_type' });
        }

        const id = uuidv4();
        const sql = `INSERT INTO expense_categories 
            (id, code, name, expense_type, account_code, description, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)`;

        db.run(sql, [id, code, name, expense_type, account_code || '611', description, new Date().toISOString()],
            function (err) {
                if (err) {
                    console.error('Create expense category error:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ id, code, name, expense_type });
            }
        );
    };
}

// ==================== EXPENSE VOUCHERS ====================

/**
 * GET /api/expense/vouchers
 * Lấy danh sách phiếu chi
 */
function getVouchers(db) {
    return (req, res) => {
        const { from, to, expense_type, fund_source_id, category_code, fiscal_year } = req.query;

        let sql = `SELECT v.*, c.name as category_display_name, f.name as fund_source_name
                   FROM expense_vouchers v
                   LEFT JOIN expense_categories c ON v.category_code = c.code
                   LEFT JOIN fund_sources f ON v.fund_source_id = f.id
                   WHERE 1=1`;
        const params = [];

        if (from) {
            sql += ' AND v.voucher_date >= ?';
            params.push(from);
        }

        if (to) {
            sql += ' AND v.voucher_date <= ?';
            params.push(to);
        }

        if (expense_type) {
            sql += ' AND v.expense_type = ?';
            params.push(expense_type);
        }

        if (fund_source_id) {
            sql += ' AND v.fund_source_id = ?';
            params.push(fund_source_id);
        }

        if (category_code) {
            sql += ' AND v.category_code = ?';
            params.push(category_code);
        }

        if (fiscal_year) {
            sql += ' AND v.fiscal_year = ?';
            params.push(fiscal_year);
        }

        sql += ' ORDER BY v.voucher_date DESC, v.voucher_no DESC';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get expense vouchers error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

/**
 * GET /api/expense/vouchers/:id
 * Lấy chi tiết phiếu chi
 */
function getVoucherDetail(db) {
    return (req, res) => {
        const { id } = req.params;

        const sql = `SELECT v.*, c.name as category_display_name, f.name as fund_source_name
                     FROM expense_vouchers v
                     LEFT JOIN expense_categories c ON v.category_code = c.code
                     LEFT JOIN fund_sources f ON v.fund_source_id = f.id
                     WHERE v.id = ?`;

        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error('Get expense voucher detail error:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'Voucher not found' });
            }
            res.json(row);
        });
    };
}

/**
 * POST /api/expense/vouchers
 * Tạo phiếu chi mới
 */
function createVoucher(db) {
    return (req, res) => {
        const {
            voucher_no, voucher_date, fiscal_year,
            payee_name, payee_tax_code, payee_address,
            expense_type, category_code, category_name,
            amount, fund_source_id, budget_estimate_id,
            payment_method, bank_account, account_code, notes
        } = req.body;

        // Validate required fields
        if (!voucher_no || !voucher_date || !payee_name || !amount || !category_code) {
            return res.status(400).json({
                error: 'Missing required fields: voucher_no, voucher_date, payee_name, amount, category_code'
            });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        const sql = `INSERT INTO expense_vouchers 
            (id, voucher_no, voucher_date, fiscal_year,
             payee_name, payee_tax_code, payee_address,
             expense_type, category_code, category_name,
             amount, fund_source_id, budget_estimate_id,
             payment_method, bank_account, account_code,
             notes, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            id, voucher_no, voucher_date, fiscal_year || new Date(voucher_date).getFullYear(),
            payee_name, payee_tax_code, payee_address,
            expense_type, category_code, category_name,
            amount, fund_source_id, budget_estimate_id,
            payment_method || 'CASH', bank_account, account_code || '611',
            notes, req.user?.username, now, now
        ], function (err) {
            if (err) {
                console.error('Create expense voucher error:', err);
                return res.status(500).json({ error: err.message });
            }

            // TODO: Auto-create ledger voucher if needed
            // TODO: Update budget_estimates.spent_amount if budget_estimate_id provided

            res.status(201).json({ id, voucher_no, message: 'Expense voucher created successfully' });
        });
    };
}

/**
 * PUT /api/expense/vouchers/:id
 * Cập nhật phiếu chi
 */
function updateVoucher(db) {
    return (req, res) => {
        const { id } = req.params;
        const {
            voucher_date, payee_name, payee_tax_code, payee_address,
            expense_type, category_code, category_name,
            amount, fund_source_id, budget_estimate_id,
            payment_method, bank_account, account_code, notes
        } = req.body;

        const sql = `UPDATE expense_vouchers SET
            voucher_date = COALESCE(?, voucher_date),
            payee_name = COALESCE(?, payee_name),
            payee_tax_code = COALESCE(?, payee_tax_code),
            payee_address = COALESCE(?, payee_address),
            expense_type = COALESCE(?, expense_type),
            category_code = COALESCE(?, category_code),
            category_name = COALESCE(?, category_name),
            amount = COALESCE(?, amount),
            fund_source_id = COALESCE(?, fund_source_id),
            budget_estimate_id = COALESCE(?, budget_estimate_id),
            payment_method = COALESCE(?, payment_method),
            bank_account = COALESCE(?, bank_account),
            account_code = COALESCE(?, account_code),
            notes = COALESCE(?, notes),
            updated_at = ?
            WHERE id = ?`;

        db.run(sql, [
            voucher_date, payee_name, payee_tax_code, payee_address,
            expense_type, category_code, category_name,
            amount, fund_source_id, budget_estimate_id,
            payment_method, bank_account, account_code, notes,
            new Date().toISOString(), id
        ], function (err) {
            if (err) {
                console.error('Update expense voucher error:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Voucher not found' });
            }
            res.json({ message: 'Expense voucher updated successfully' });
        });
    };
}

/**
 * DELETE /api/expense/vouchers/:id
 * Xóa phiếu chi
 */
function deleteVoucher(db) {
    return (req, res) => {
        const { id } = req.params;

        db.run('DELETE FROM expense_vouchers WHERE id = ?', [id], function (err) {
            if (err) {
                console.error('Delete expense voucher error:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Voucher not found' });
            }
            res.json({ message: 'Expense voucher deleted successfully' });
        });
    };
}

// ==================== REPORTS ====================

/**
 * GET /api/expense/report
 * Báo cáo chi sự nghiệp
 */
function getExpenseReport(db) {
    return (req, res) => {
        const { from, to, fiscal_year, group_by } = req.query;

        let sql, params = [];

        if (group_by === 'category') {
            sql = `SELECT 
                v.category_code,
                v.category_name,
                v.expense_type,
                COUNT(*) as voucher_count,
                SUM(v.amount) as total_amount
                FROM expense_vouchers v
                WHERE 1=1`;
        } else if (group_by === 'fund_source') {
            sql = `SELECT 
                v.fund_source_id,
                f.name as fund_source_name,
                COUNT(*) as voucher_count,
                SUM(v.amount) as total_amount
                FROM expense_vouchers v
                LEFT JOIN fund_sources f ON v.fund_source_id = f.id
                WHERE 1=1`;
        } else {
            sql = `SELECT 
                v.expense_type,
                COUNT(*) as voucher_count,
                SUM(v.amount) as total_amount
                FROM expense_vouchers v
                WHERE 1=1`;
        }

        if (from) {
            sql += ' AND v.voucher_date >= ?';
            params.push(from);
        }

        if (to) {
            sql += ' AND v.voucher_date <= ?';
            params.push(to);
        }

        if (fiscal_year) {
            sql += ' AND v.fiscal_year = ?';
            params.push(fiscal_year);
        }

        if (group_by === 'category') {
            sql += ' GROUP BY v.category_code, v.category_name, v.expense_type ORDER BY total_amount DESC';
        } else if (group_by === 'fund_source') {
            sql += ' GROUP BY v.fund_source_id, f.name ORDER BY total_amount DESC';
        } else {
            sql += ' GROUP BY v.expense_type ORDER BY total_amount DESC';
        }

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get expense report error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

/**
 * GET /api/expense/budget-comparison
 * So sánh Dự toán vs Thực hiện (Chi)
 */
function getBudgetComparison(db) {
    return (req, res) => {
        try {
            const { fiscal_year } = req.query;

            if (!fiscal_year) {
                return res.status(400).json({ error: 'fiscal_year is required' });
            }

            const sql = `SELECT 
            be.id as budget_id,
            be.item_name as category_name,
            be.estimate_type,
            be.allocated_amount as budget_amount,
            COALESCE(SUM(v.amount), 0) as actual_amount,
            be.allocated_amount - COALESCE(SUM(v.amount), 0) as variance,
            ROUND(COALESCE(SUM(v.amount), 0) * 100.0 / NULLIF(be.allocated_amount, 0), 2) as completion_percentage
            FROM budget_estimates be
            LEFT JOIN expense_vouchers v ON be.id = v.budget_estimate_id 
                AND v.fiscal_year = be.fiscal_year
            WHERE be.fiscal_year = ? AND be.budget_type = 'EXPENSE'
            GROUP BY be.id, be.item_name, be.estimate_type, be.allocated_amount
            ORDER BY be.estimate_type, be.item_name`;

            db.all(sql, [fiscal_year], (err, rows) => {
                if (err) {
                    console.error('[EXPENSE_BUDGET_COMP_ERROR] SQL Error:', err.message);
                    return res.status(500).json({
                        error: err.message,
                        context: 'db.all callback error',
                        sql: sql,
                        params: [fiscal_year]
                    });
                }
                res.json(rows);
            });
        } catch (fatal) {
            console.error('[EXPENSE_BUDGET_COMP_FATAL]', fatal);
            return res.status(500).json({
                error: fatal.message,
                context: 'Fatal catch block',
                stack: fatal.stack
            });
        }
    };
}

// ==================== EXPORTS ====================

module.exports = {
    // Categories
    getCategories,
    createCategory,

    // Vouchers
    getVouchers,
    getVoucherDetail,
    createVoucher,
    updateVoucher,
    deleteVoucher,

    // Reports
    getExpenseReport,
    getBudgetComparison
};
