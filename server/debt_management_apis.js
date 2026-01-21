// ========================================
// QUẢN LÝ CÔNG NỢ VÀ TẠM ỨNG - HCSN (TT 24/2024)
// ========================================
// Module xử lý 4 loại nghiệp vụ:
// 1. Tạm ứng (TK 141)
// 2. Ứng trước NSNN (TK 161)
// 3. Công nợ phải thu (TK 136, 138)
// 4. Công nợ phải trả (TK 331, 336, 338)

const { v4: uuidv4 } = require('uuid');
const debtAccounting = require('./debt_accounting');

// ========================================
// 1. TẠM ỨNG (TK 141) - TEMPORARY ADVANCES
// ========================================

/**
 * GET /api/debt/temporary-advances - Danh sách Tạm ứng
 */
exports.getTemporaryAdvances = (db) => (req, res) => {
    const { status, employee_id, fiscal_year } = req.query;

    let query = 'SELECT * FROM temporary_advances WHERE 1=1';
    const params = [];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    if (employee_id) {
        query += ' AND employee_id = ?';
        params.push(employee_id);
    }
    if (fiscal_year) {
        query += ' AND fiscal_year = ?';
        params.push(fiscal_year);
    }

    query += ' ORDER BY doc_date DESC, doc_no DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * POST /api/debt/temporary-advances - Tạo mới Tạm ứng
 */
exports.createTemporaryAdvance = (db) => (req, res) => {
    const {
        doc_no, doc_date, employee_id, employee_name, employee_dept,
        purpose, amount, approval_no, notes
    } = req.body;

    if (!doc_no || !doc_date || !employee_name || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const fiscal_year = new Date(doc_date).getFullYear();
    const remaining = amount;
    const now = new Date().toISOString();

    const sql = `
        INSERT INTO temporary_advances (
            id, doc_no, doc_date, fiscal_year, employee_id, employee_name, employee_dept,
            purpose, amount, settled_amount, remaining, status, approval_no, notes,
            created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'PENDING', ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        id, doc_no, doc_date, fiscal_year, employee_id, employee_name, employee_dept,
        purpose, amount, remaining, approval_no, notes,
        req.user?.username, now, now
    ], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(409).json({ error: 'Số chứng từ đã tồn tại' });
            }
            return res.status(500).json({ error: err.message });
        }

        // Tạo bút toán tự động: Nợ 141 / Có 111
        debtAccounting.createTemporaryAdvanceVoucher(db, { ...req.body, id }, req);

        res.json({ success: true, id, message: 'Đã tạo tạm ứng thành công' });
    });
};

/**
 * POST /api/debt/temporary-advances/:id/settle - Quyết toán Tạm ứng
 */
exports.settleTemporaryAdvance = (db) => (req, res) => {
    const { id } = req.params;
    const { settlement_amount, settlement_date, settlement_doc_no, notes } = req.body;

    db.get('SELECT * FROM temporary_advances WHERE id = ?', [id], (err, advance) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!advance) return res.status(404).json({ error: 'Không tìm thấy tạm ứng' });

        const new_settled = (advance.settled_amount || 0) + settlement_amount;
        const new_remaining = advance.amount - new_settled;
        const new_status = new_remaining <= 0 ? 'SETTLED' : 'PARTIAL';

        db.run(`
            UPDATE temporary_advances
            SET settled_amount = ?, remaining = ?, status = ?, settlement_date = ?, settlement_doc_no = ?, notes = ?, updated_at = datetime('now')
            WHERE id = ?
        `, [new_settled, new_remaining, new_status, settlement_date, settlement_doc_no, notes, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Tạo bút toán hoàn ứng: Nợ 111 / Có 141
            debtAccounting.createAdvanceSettlementVoucher(db, advance, settlement_amount, settlement_date, settlement_doc_no, req);

            res.json({ success: true, message: 'Đã quyết toán tạm ứng' });
        });
    });
};

/**
 * DELETE /api/debt/temporary-advances/:id - Xóa Tạm ứng
 */
exports.deleteTemporaryAdvance = (db) => (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM temporary_advances WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy tạm ứng' });

        res.json({ success: true, message: 'Đã xóa tạm ứng' });
    });
};

// ========================================
// 2. ỨNG TRƯỚC NSNN (TK 161) - BUDGET ADVANCES
// ========================================

/**
 * GET /api/debt/budget-advances - Danh sách Ứng trước NSNN
 */
exports.getBudgetAdvances = (db) => (req, res) => {
    const { fiscal_year, status } = req.query;

    let query = `
        SELECT ba.*, fs.name as fund_source_name
        FROM budget_advances ba
        LEFT JOIN fund_sources fs ON ba.fund_source_id = fs.id
        WHERE 1=1
    `;
    const params = [];

    if (fiscal_year) {
        query += ' AND ba.fiscal_year = ?';
        params.push(fiscal_year);
    }
    if (status) {
        query += ' AND ba.status = ?';
        params.push(status);
    }

    query += ' ORDER BY ba.disbursement_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * POST /api/debt/budget-advances - Tạo mới Ứng trước NSNN
 */
exports.createBudgetAdvance = (db) => (req, res) => {
    const {
        doc_no, fiscal_year, advance_type, amount, approval_doc, approval_date,
        disbursement_date, repayment_deadline, fund_source_id, notes
    } = req.body;

    if (!doc_no || !fiscal_year || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const remaining = amount;
    const now = new Date().toISOString();

    const sql = `
        INSERT INTO budget_advances (
            id, doc_no, fiscal_year, advance_type, amount, approval_doc, approval_date,
            disbursement_date, repayment_deadline, repaid_amount, remaining, status,
            fund_source_id, notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'ACTIVE', ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        id, doc_no, fiscal_year, advance_type, amount, approval_doc, approval_date,
        disbursement_date, repayment_deadline, remaining,
        fund_source_id, notes, req.user?.username, now, now
    ], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(409).json({ error: 'Số chứng từ đã tồn tại' });
            }
            return res.status(500).json({ error: err.message });
        }

        // Tạo bút toán ứng: Nợ 111 / Có 161
        debtAccounting.createBudgetAdvanceVoucher(db, { ...req.body, id }, req);

        res.json({ success: true, id, message: 'Đã tạo ứng trước NSNN thành công' });
    });
};

/**
 * POST /api/debt/budget-advances/:id/repay - Hoàn ứng NSNN
 */
exports.repayBudgetAdvance = (db) => (req, res) => {
    const { id } = req.params;
    const { repayment_amount, repayment_date, notes } = req.body;

    db.get('SELECT * FROM budget_advances WHERE id = ?', [id], (err, advance) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!advance) return res.status(404).json({ error: 'Không tìm thấy ứng trước NSNN' });

        const new_repaid = (advance.repaid_amount || 0) + repayment_amount;
        const new_remaining = advance.amount - new_repaid;
        const new_status = new_remaining <= 0 ? 'REPAID' : 'ACTIVE';

        db.run(`
            UPDATE budget_advances
            SET repaid_amount = ?, remaining = ?, status = ?, notes = ?, updated_at = datetime('now')
            WHERE id = ?
        `, [new_repaid, new_remaining, new_status, notes, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Tạo bút toán hoàn ứng: Nợ 161 / Có 111
            debtAccounting.createBudgetRepaymentVoucher(db, advance, repayment_amount, repayment_date, req);

            res.json({ success: true, message: 'Đã hoàn ứng NSNN' });
        });
    });
};

/**
 * DELETE /api/debt/budget-advances/:id - Xóa Ứng trước NSNN
 */
exports.deleteBudgetAdvance = (db) => (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM budget_advances WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy ứng trước NSNN' });

        res.json({ success: true, message: 'Đã xóa ứng trước NSNN' });
    });
};

// ========================================
// 3. CÔNG NỢ PHẢI THU (TK 136, 138) - RECEIVABLES
// ========================================

/**
 * GET /api/debt/receivables - Danh sách Công nợ phải thu
 */
exports.getReceivables = (db) => (req, res) => {
    const { status, partner_code, account_code } = req.query;

    let query = 'SELECT * FROM receivables WHERE 1=1';
    const params = [];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    if (partner_code) {
        query += ' AND partner_code = ?';
        params.push(partner_code);
    }
    if (account_code) {
        query += ' AND account_code = ?';
        params.push(account_code);
    }

    query += ' ORDER BY doc_date DESC, doc_no DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * POST /api/debt/receivables - Tạo mới Công nợ phải thu
 */
exports.createReceivable = (db) => (req, res) => {
    const {
        doc_no, doc_date, partner_code, partner_name, account_code,
        description, original_amount, due_date, revenue_category_id, notes
    } = req.body;

    if (!doc_no || !doc_date || !original_amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const fiscal_year = new Date(doc_date).getFullYear();
    const remaining = original_amount;
    const now = new Date().toISOString();

    const sql = `
        INSERT INTO receivables (
            id, doc_no, doc_date, fiscal_year, partner_code, partner_name, account_code, account_name,
            description, original_amount, received_amount, remaining, due_date, status,
            revenue_category_id, notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'UNPAID', ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        id, doc_no, doc_date, fiscal_year, partner_code, partner_name, account_code || '136', '',
        description, original_amount, remaining, due_date,
        revenue_category_id, notes, req.user?.username, now, now
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Tạo bút toán phát sinh nợ: Nợ 136 / Có 5xx
        debtAccounting.createReceivableVoucher(db, { ...req.body, id }, req.body.revenue_account, req);

        res.json({ success: true, id, message: 'Đã tạo công nợ phải thu' });
    });
};

/**
 * POST /api/debt/receivables/:id/record-payment - Ghi nhận thu tiền
 */
exports.recordReceivablePayment = (db) => (req, res) => {
    const { id } = req.params;
    const { payment_date, amount, payment_method, voucher_id, notes } = req.body;

    db.get('SELECT * FROM receivables WHERE id = ?', [id], (err, receivable) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!receivable) return res.status(404).json({ error: 'Không tìm thấy công nợ phải thu' });

        const new_received = (receivable.received_amount || 0) + amount;
        const new_remaining = receivable.original_amount - new_received;
        const new_status = new_remaining <= 0 ? 'PAID' : 'PARTIAL';

        const payment_id = uuidv4();
        const now = new Date().toISOString();

        db.serialize(() => {
            // Update receivable
            db.run(`
                UPDATE receivables
                SET received_amount = ?, remaining = ?, status = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [new_received, new_remaining, new_status, id]);

            // Record payment history
            db.run(`
                INSERT INTO receivable_payments (id, receivable_id, payment_date, amount, payment_method, voucher_id, notes, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [payment_id, id, payment_date, amount, payment_method, voucher_id, notes, req.user?.username, now]);

            // Tạo bút toán thu tiền: Nợ 111 / Có 136
            debtAccounting.createReceivablePaymentVoucher(db, receivable, amount, payment_date, payment_method, req);

            res.json({ success: true, payment_id, message: 'Đã ghi nhận thu tiền' });
        });
    });
};

/**
 * DELETE /api/debt/receivables/:id - Xóa Công nợ phải thu
 */
exports.deleteReceivable = (db) => (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM receivables WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy công nợ phải thu' });

        res.json({ success: true, message: 'Đã xóa công nợ phải thu' });
    });
};

// ========================================
// 4. CÔNG NỢ PHẢI TRẢ (TK 331, 336, 338) - PAYABLES
// ========================================

/**
 * GET /api/debt/payables - Danh sách Công nợ phải trả
 */
exports.getPayables = (db) => (req, res) => {
    const { status, partner_code, account_code } = req.query;

    let query = 'SELECT * FROM payables WHERE 1=1';
    const params = [];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    if (partner_code) {
        query += ' AND partner_code = ?';
        params.push(partner_code);
    }
    if (account_code) {
        query += ' AND account_code = ?';
        params.push(account_code);
    }

    query += ' ORDER BY doc_date DESC, doc_no DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * POST /api/debt/payables - Tạo mới Công nợ phải trả
 */
exports.createPayable = (db) => (req, res) => {
    const {
        doc_no, doc_date, partner_code, partner_name, account_code,
        description, original_amount, due_date, expense_category_id,
        fund_source_id, budget_estimate_id, notes
    } = req.body;

    if (!doc_no || !doc_date || !original_amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const fiscal_year = new Date(doc_date).getFullYear();
    const remaining = original_amount;
    const now = new Date().toISOString();

    const sql = `
        INSERT INTO payables (
            id, doc_no, doc_date, fiscal_year, partner_code, partner_name, account_code, account_name,
            description, original_amount, paid_amount, remaining, due_date, status,
            expense_category_id, fund_source_id, budget_estimate_id, notes,
            created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'UNPAID', ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        id, doc_no, doc_date, fiscal_year, partner_code, partner_name, account_code || '331', '',
        description, original_amount, remaining, due_date,
        expense_category_id, fund_source_id, budget_estimate_id, notes,
        req.user?.username, now, now
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Tạo bút toán phát sinh nợ: Nợ 6xx / Có 331
        debtAccounting.createPayableVoucher(db, { ...req.body, id }, req.body.expense_account, req);

        res.json({ success: true, id, message: 'Đã tạo công nợ phải trả' });
    });
};

/**
 * POST /api/debt/payables/:id/record-payment - Ghi nhận trả tiền
 */
exports.recordPayablePayment = (db) => (req, res) => {
    const { id } = req.params;
    const { payment_date, amount, payment_method, voucher_id, notes } = req.body;

    db.get('SELECT * FROM payables WHERE id = ?', [id], (err, payable) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!payable) return res.status(404).json({ error: 'Không tìm thấy công nợ phải trả' });

        const new_paid = (payable.paid_amount || 0) + amount;
        const new_remaining = payable.original_amount - new_paid;
        const new_status = new_remaining <= 0 ? 'PAID' : 'PARTIAL';

        const payment_id = uuidv4();
        const now = new Date().toISOString();

        db.serialize(() => {
            // Update payable
            db.run(`
                UPDATE payables
                SET paid_amount = ?, remaining = ?, status = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [new_paid, new_remaining, new_status, id]);

            // Record payment history
            db.run(`
                INSERT INTO payable_payments (id, payable_id, payment_date, amount, payment_method, voucher_id, notes, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [payment_id, id, payment_date, amount, payment_method, voucher_id, notes, req.user?.username, now]);

            // Tạo bút toán trả tiền: Nợ 331 / Có 111
            debtAccounting.createPayablePaymentVoucher(db, payable, amount, payment_date, payment_method, req);

            res.json({ success: true, payment_id, message: 'Đã ghi nhận trả tiền' });
        });
    });
};

/**
 * DELETE /api/debt/payables/:id - Xóa Công nợ phải trả
 */
exports.deletePayable = (db) => (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM payables WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy công nợ phải trả' });

        res.json({ success: true, message: 'Đã xóa công nợ phải trả' });
    });
};

// ========================================
// 5. BÁO CÁO CÔNG NỢ - REPORTS
// ========================================

/**
 * GET /api/debt/aging-report - Báo cáo phân tích công nợ theo tuổi
 */
exports.getAgingReport = (db) => (req, res) => {
    const { type } = req.query; // 'receivables' or 'payables'

    const table = type === 'payables' ? 'payables' : 'receivables';
    const amount_field = type === 'payables' ? 'paid_amount' : 'received_amount';

    const sql = `
        SELECT 
            partner_code,
            partner_name,
            SUM(original_amount) as total_original,
            SUM(${amount_field}) as total_paid,
            SUM(remaining) as total_remaining,
            SUM(CASE WHEN overdue_days BETWEEN 0 AND 30 THEN remaining ELSE 0 END) as current,
            SUM(CASE WHEN overdue_days BETWEEN 31 AND 60 THEN remaining ELSE 0 END) as overdue_30,
            SUM(CASE WHEN overdue_days BETWEEN 61 AND 90 THEN remaining ELSE 0 END) as overdue_60,
            SUM(CASE WHEN overdue_days > 90 THEN remaining ELSE 0 END) as overdue_90_plus
        FROM ${table}
        WHERE status != 'PAID'
        GROUP BY partner_code, partner_name
        ORDER BY total_remaining DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};
