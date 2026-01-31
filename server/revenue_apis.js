const { v4: uuidv4 } = require('uuid');

/**
 * Revenue Module APIs for HCSN
 * Quản lý Thu sự nghiệp theo TT 24/2024
 */

// ==================== REVENUE CATEGORIES ====================

/**
 * GET /api/revenue/categories
 * Lấy danh sách loại thu sự nghiệp
 */
function getCategories(db) {
    return (req, res) => {
        const { revenue_type, active } = req.query;

        let sql = 'SELECT * FROM revenue_categories WHERE 1=1';
        const params = [];

        if (revenue_type) {
            sql += ' AND revenue_type = ?';
            params.push(revenue_type);
        }

        if (active !== undefined) {
            sql += ' AND active = ?';
            params.push(active === 'true' ? 1 : 0);
        }

        sql += ' ORDER BY revenue_type, code';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get revenue categories error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

/**
 * POST /api/revenue/categories
 * Tạo loại thu mới
 */
function createCategory(db) {
    return (req, res) => {
        const { code, name, revenue_type, account_code, description } = req.body;

        if (!code || !name || !revenue_type) {
            return res.status(400).json({ error: 'Missing required fields: code, name, revenue_type' });
        }

        const id = uuidv4();
        const sql = `INSERT INTO revenue_categories 
            (id, code, name, revenue_type, account_code, description, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)`;

        db.run(sql, [id, code, name, revenue_type, account_code || '511', description, new Date().toISOString()],
            function (err) {
                if (err) {
                    console.error('Create revenue category error:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ id, code, name, revenue_type });
            }
        );
    };
}

// ==================== REVENUE RECEIPTS ====================

/**
 * GET /api/revenue/receipts
 * Lấy danh sách biên lai thu tiền
 */
function getReceipts(db) {
    return (req, res) => {
        const { from, to, revenue_type, fund_source_id, category_code, fiscal_year, type } = req.query;

        let sql = `SELECT r.*, c.name as category_display_name, f.name as fund_source_name
                   FROM revenue_receipts r
                   LEFT JOIN revenue_categories c ON r.category_code = c.code
                   LEFT JOIN fund_sources f ON r.fund_source_id = f.id
                   WHERE 1=1`;
        const params = [];

        if (type) {
            sql += ' AND r.document_type = ?';
            params.push(type);
        }

        if (from) {
            sql += ' AND r.receipt_date >= ?';
            params.push(from);
        }

        if (to) {
            sql += ' AND r.receipt_date <= ?';
            params.push(to);
        }

        if (revenue_type) {
            sql += ' AND r.revenue_type = ?';
            params.push(revenue_type);
        }

        if (fund_source_id) {
            sql += ' AND r.fund_source_id = ?';
            params.push(fund_source_id);
        }

        if (category_code) {
            sql += ' AND r.category_code = ?';
            params.push(category_code);
        }

        if (fiscal_year) {
            sql += ' AND r.fiscal_year = ?';
            params.push(fiscal_year);
        }

        sql += ' ORDER BY r.receipt_date DESC, r.receipt_no DESC';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get receipts error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

/**
 * GET /api/revenue/receipts/:id
 * Lấy chi tiết biên lai
 */
function getReceiptDetail(db) {
    return (req, res) => {
        const { id } = req.params;

        const sql = `SELECT r.*, c.name as category_display_name, f.name as fund_source_name
                     FROM revenue_receipts r
                     LEFT JOIN revenue_categories c ON r.category_code = c.code
                     LEFT JOIN fund_sources f ON r.fund_source_id = f.id
                     WHERE r.id = ?`;

        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error('Get receipt detail error:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'Receipt not found' });
            }
            res.json(row);
        });
    };
}

/**
 * POST /api/revenue/receipts
 * Tạo biên lai thu tiền mới
 */
function createReceipt(db) {
    return (req, res) => {
        const {
            receipt_no, receipt_date, fiscal_year,
            payer_name, payer_id_card, payer_address,
            revenue_type, category_code, category_name,
            amount, fund_source_id, budget_estimate_id,
            item_code, sub_item_code,
            payment_method, bank_account, account_code, notes,
            document_type
        } = req.body;

        // Validate required fields
        if (!receipt_no || !receipt_date || !payer_name || !amount || !category_code) {
            return res.status(400).json({
                error: 'Missing required fields: receipt_no, receipt_date, payer_name, amount, category_code'
            });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        const sql = `INSERT INTO revenue_receipts 
            (id, receipt_no, receipt_date, fiscal_year,
             payer_name, payer_id_card, payer_address,
             revenue_type, category_code, category_name,
             amount, fund_source_id, budget_estimate_id,
             item_code, sub_item_code,
             payment_method, bank_account, account_code,
             notes, document_type, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            id, receipt_no, receipt_date, fiscal_year || new Date(receipt_date).getFullYear(),
            payer_name, payer_id_card, payer_address,
            revenue_type, category_code, category_name,
            amount, fund_source_id, budget_estimate_id,
            item_code || null, sub_item_code || null,
            payment_method || 'CASH', bank_account, account_code || '511',
            notes, document_type || 'RECEIPT', req.user?.username, now, now
        ], function (err) {
            if (err) {
                console.error('Create receipt error:', err);
                return res.status(500).json({ error: err.message });
            }

            const ledgerId = uuidv4();
            const debitAcc = payment_method === 'BANK' ? '112' : '111'; // Tiền gửi NH hoặc Tiền mặt
            const creditAcc = account_code || '511'; // Doanh thu

            // Auto-create ledger entry
            const ledgerSql = `INSERT INTO general_ledger
                (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc,
                 debit_amount, credit_amount, partner_code, origin_staging_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`;

            db.run(ledgerSql, [
                ledgerId, receipt_date, now, receipt_no,
                `Thu: ${payer_name} - ${category_name || category_code}`,
                debitAcc, creditAcc, amount, payer_id_card || null, id
            ], (ledgerErr) => {
                if (ledgerErr) {
                    console.error('Auto-create ledger error:', ledgerErr);
                }
            });

            // Update budget_estimates if budget_estimate_id provided (for revenue tracking)
            if (budget_estimate_id) {
                const budgetSql = `UPDATE budget_estimates
                    SET spent_amount = spent_amount + ?,
                        remaining_amount = allocated_amount - (spent_amount + ?),
                        updated_at = ?
                    WHERE id = ?`;

                db.run(budgetSql, [amount, amount, now, budget_estimate_id], (budgetErr) => {
                    if (budgetErr) {
                        console.error('Update budget estimate error:', budgetErr);
                    }
                });
            }

            res.status(201).json({ id, receipt_no, message: 'Receipt created successfully' });
        });
    };
}

/**
 * PUT /api/revenue/receipts/:id
 * Cập nhật biên lai
 */
function updateReceipt(db) {
    return (req, res) => {
        const { id } = req.params;
        const {
            receipt_date, payer_name, payer_id_card, payer_address,
            revenue_type, category_code, category_name,
            amount, fund_source_id, budget_estimate_id,
            item_code, sub_item_code,
            payment_method, bank_account, account_code, notes
        } = req.body;

        const sql = `UPDATE revenue_receipts SET
            receipt_date = COALESCE(?, receipt_date),
            payer_name = COALESCE(?, payer_name),
            payer_id_card = COALESCE(?, payer_id_card),
            payer_address = COALESCE(?, payer_address),
            revenue_type = COALESCE(?, revenue_type),
            category_code = COALESCE(?, category_code),
            category_name = COALESCE(?, category_name),
            amount = COALESCE(?, amount),
            fund_source_id = COALESCE(?, fund_source_id),
            budget_estimate_id = COALESCE(?, budget_estimate_id),
            item_code = COALESCE(?, item_code),
            sub_item_code = COALESCE(?, sub_item_code),
            payment_method = COALESCE(?, payment_method),
            bank_account = COALESCE(?, bank_account),
            account_code = COALESCE(?, account_code),
            notes = COALESCE(?, notes),
            updated_at = ?
            WHERE id = ?`;

        db.run(sql, [
            receipt_date, payer_name, payer_id_card, payer_address,
            revenue_type, category_code, category_name,
            amount, fund_source_id, budget_estimate_id,
            item_code, sub_item_code,
            payment_method, bank_account, account_code, notes,
            new Date().toISOString(), id
        ], function (err) {
            if (err) {
                console.error('Update receipt error:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Receipt not found' });
            }
            res.json({ message: 'Receipt updated successfully' });
        });
    };
}

/**
 * DELETE /api/revenue/receipts/:id
 * Xóa biên lai
 */
function deleteReceipt(db) {
    return (req, res) => {
        const { id } = req.params;

        db.run('DELETE FROM revenue_receipts WHERE id = ?', [id], function (err) {
            if (err) {
                console.error('Delete receipt error:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Receipt not found' });
            }
            res.json({ message: 'Receipt deleted successfully' });
        });
    };
}

// ==================== REPORTS ====================

/**
 * GET /api/revenue/report
 * Báo cáo thu sự nghiệp
 */
function getRevenueReport(db) {
    return (req, res) => {
        const { from, to, fiscal_year, group_by } = req.query;

        let sql, params = [];

        if (group_by === 'category') {
            sql = `SELECT 
                r.category_code,
                r.category_name,
                r.revenue_type,
                COUNT(*) as receipt_count,
                SUM(r.amount) as total_amount
                FROM revenue_receipts r
                WHERE 1=1`;
        } else if (group_by === 'fund_source') {
            sql = `SELECT 
                r.fund_source_id,
                f.name as fund_source_name,
                COUNT(*) as receipt_count,
                SUM(r.amount) as total_amount
                FROM revenue_receipts r
                LEFT JOIN fund_sources f ON r.fund_source_id = f.id
                WHERE 1=1`;
        } else {
            sql = `SELECT 
                r.revenue_type,
                COUNT(*) as receipt_count,
                SUM(r.amount) as total_amount
                FROM revenue_receipts r
                WHERE 1=1`;
        }

        if (from) {
            sql += ' AND r.receipt_date >= ?';
            params.push(from);
        }

        if (to) {
            sql += ' AND r.receipt_date <= ?';
            params.push(to);
        }

        if (fiscal_year) {
            sql += ' AND r.fiscal_year = ?';
            params.push(fiscal_year);
        }

        if (group_by === 'category') {
            sql += ' GROUP BY r.category_code, r.category_name, r.revenue_type ORDER BY total_amount DESC';
        } else if (group_by === 'fund_source') {
            sql += ' GROUP BY r.fund_source_id, f.name ORDER BY total_amount DESC';
        } else {
            sql += ' GROUP BY r.revenue_type ORDER BY total_amount DESC';
        }

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Get revenue report error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    };
}

/**
 * GET /api/revenue/budget-comparison
 * So sánh Dự toán vs Thực hiện
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
                COALESCE(SUM(r.amount), 0) as actual_amount,
                be.allocated_amount - COALESCE(SUM(r.amount), 0) as variance,
                ROUND(COALESCE(SUM(r.amount), 0) * 100.0 / NULLIF(be.allocated_amount, 0), 2) as completion_percentage
                FROM budget_estimates be
                LEFT JOIN revenue_receipts r ON be.id = r.budget_estimate_id 
                    AND r.fiscal_year = be.fiscal_year
                WHERE be.fiscal_year = ? AND be.budget_type = 'REVENUE'
                GROUP BY be.id, be.item_name, be.estimate_type, be.allocated_amount
                ORDER BY be.estimate_type, be.item_name`;

            db.all(sql, [fiscal_year], (err, rows) => {
                if (err) {
                    console.error('[BUDGET_COMP_ERROR] SQL Error:', err.message);
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
            console.error('[BUDGET_COMP_FATAL]', fatal);
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

    // Receipts
    getReceipts,
    getReceiptDetail,
    createReceipt,
    updateReceipt,
    deleteReceipt,

    // Reports
    getRevenueReport,
    getBudgetComparison
};
