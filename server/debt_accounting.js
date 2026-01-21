// ========================================
// DEBT MANAGEMENT ACCOUNTING INTEGRATION - HCSN (TT 24/2024)
// ========================================
// Module tự động tạo chứng từ kế toán cho nghiệp vụ công nợ và tạm ứng

const { v4: uuidv4 } = require('uuid');

/**
 * Tạo chứng từ khi Tạm ứng
 * Nợ TK 141 (Tạm ứng)
 * Có TK 111/112 (Tiền)
 */
exports.createTemporaryAdvanceVoucher = (db, advance, req) => {
    const voucherId = uuidv4();
    const fiscal_year = new Date(advance.doc_date).getFullYear();
    const voucherNo = `PC-TU-${advance.doc_no}`;

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PC', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        advance.doc_date,
        `Tạm ứng: ${advance.employee_name} - ${advance.purpose || ''}`,
        advance.amount,
        fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating temporary advance voucher:', err);
            return;
        }

        // Định khoản: Nợ TK 141, Có TK 111
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description)
            VALUES (?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            '141',  // Tạm ứng
            '111',  // Tiền mặt (có thể là 112 nếu chuyển khoản)
            advance.amount,
            `TƯ ${advance.employee_name}`
        ], (err) => {
            if (err) console.error('Error creating voucher item:', err);
            else console.log(`✓ Created advance voucher ${voucherNo}`);
        });
    });

    return voucherId;
};

/**
 * Tạo chứng từ khi Quyết toán Tạm ứng
 * Nợ TK 111/112 (Tiền hoàn lại)
 * Có TK 141 (Giảm tạm ứng)
 */
exports.createAdvanceSettlementVoucher = (db, advance, settlementAmount, settlementDate, settlementDocNo, req) => {
    const voucherId = uuidv4();
    const fiscal_year = new Date(settlementDate).getFullYear();
    const voucherNo = `PC-QT-${settlementDocNo || advance.doc_no}`;

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PC', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        settlementDate,
        `Quyết toán tạm ứng: ${advance.employee_name}`,
        settlementAmount,
        fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating settlement voucher:', err);
            return;
        }

        // Định khoản: Nợ TK 111 (Thu hoàn), Có TK 141
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description)
            VALUES (?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            '111',  // Thu hoàn lại
            '141',  // Giảm tạm ứng
            settlementAmount,
            `Hoàn TƯ ${advance.employee_name}`
        ], (err) => {
            if (err) console.error('Error creating voucher item:', err);
            else console.log(`✓ Created settlement voucher ${voucherNo}`);
        });
    });

    return voucherId;
};

/**
 * Tạo chứng từ khi Ứng trước NSNN
 * Nợ TK 111/112 (Tiền nhận ứng)
 * Có TK 161 (Ứng trước NSNN)
 */
exports.createBudgetAdvanceVoucher = (db, advance, req) => {
    const voucherId = uuidv4();
    const voucherNo = `PC-UNS-${advance.doc_no}`;

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PT', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        advance.disbursement_date,
        `Ứng trước NSNN ${advance.fiscal_year}: ${advance.advance_type}`,
        advance.amount,
        advance.fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating budget advance voucher:', err);
            return;
        }

        // Định khoản: Nợ TK 111, Có TK 161
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description)
            VALUES (?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            '111',  // Tiền nhận ứng
            '161',  // Ứng trước NSNN
            advance.amount,
            `Ứng NSNN năm ${advance.fiscal_year}`
        ], (err) => {
            if (err) console.error('Error creating voucher item:', err);
            else console.log(`✓ Created budget advance voucher ${voucherNo}`);
        });
    });

    return voucherId;
};

/**
 * Tạo chứng từ khi Hoàn ứng NSNN
 * Nợ TK 161 (Giảm ứng trước)
 * Có TK 111/112 (Trả lại tiền ứng)
 */
exports.createBudgetRepaymentVoucher = (db, advance, repaymentAmount, repaymentDate, req) => {
    const voucherId = uuidv4();
    const voucherNo = `PC-HU-${advance.doc_no}`;

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PC', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        repaymentDate,
        `Hoàn ứng NSNN ${advance.fiscal_year}`,
        repaymentAmount,
        advance.fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating budget repayment voucher:', err);
            return;
        }

        // Định khoản: Nợ TK 161, Có TK 111
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description)
            VALUES (?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            '161',  // Giảm ứng trước
            '111',  // Chi trả
            repaymentAmount,
            `Hoàn ứng NSNN năm ${advance.fiscal_year}`
        ], (err) => {
            if (err) console.error('Error creating voucher item:', err);
            else console.log(`✓ Created budget repayment voucher ${voucherNo}`);
        });
    });

    return voucherId;
};

/**
 * Tạo chứng từ khi phát sinh Công nợ phải thu
 * Nợ TK 136/138 (Phải thu)
 * Có TK 5xx (Doanh thu)
 */
exports.createReceivableVoucher = (db, receivable, revenueAccount, req) => {
    const voucherId = uuidv4();
    const fiscal_year = new Date(receivable.doc_date).getFullYear();
    const voucherNo = `PT-${receivable.doc_no}`;

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PT', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        receivable.doc_date,
        `Phải thu: ${receivable.partner_name} - ${receivable.description || ''}`,
        receivable.original_amount,
        fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating receivable voucher:', err);
            return;
        }

        // Định khoản: Nợ TK 136/138, Có TK 5xx
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description, partner_code)
            VALUES (?, ?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            receivable.account_code || '136',
            revenueAccount || '511',  // Mặc định TK 511 - Doanh thu hoạt động
            receivable.original_amount,
            receivable.description,
            receivable.partner_code
        ], (err) => {
            if (err) console.error('Error creating voucher item:', err);
            else console.log(`✓ Created receivable voucher ${voucherNo}`);
        });
    });

    return voucherId;
};

/**
 * Tạo chứng từ khi Thu tiền công nợ
 * Nợ TK 111/112 (Thu tiền)
 * Có TK 136/138 (Giảm phải thu)
 */
exports.createReceivablePaymentVoucher = (db, receivable, paymentAmount, paymentDate, paymentMethod, req) => {
    const voucherId = uuidv4();
    const fiscal_year = new Date(paymentDate).getFullYear();
    const voucherNo = `PT-TT-${receivable.doc_no}`;

    const cashAccount = paymentMethod === 'BANK' ? '112' : '111';

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PT', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        paymentDate,
        `Thu tiền: ${receivable.partner_name}`,
        paymentAmount,
        fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating receivable payment voucher:', err);
            return;
        }

        // Định khoản: Nợ TK 111/112, Có TK 136/138
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description, partner_code)
            VALUES (?, ?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            cashAccount,
            receivable.account_code || '136',
            paymentAmount,
            `Thu ${receivable.partner_name}`,
            receivable.partner_code
        ], (err) => {
            if (err) console.error('Error creating voucher item:', err);
            else console.log(`✓ Created receivable payment voucher ${voucherNo}`);
        });
    });

    return voucherId;
};

/**
 * Tạo chứng từ khi phát sinh Công nợ phải trả
 * Nợ TK 6xx (Chi phí)
 * Có TK 331/336/338 (Phải trả)
 */
exports.createPayableVoucher = (db, payable, expenseAccount, req) => {
    const voucherId = uuidv4();
    const fiscal_year = new Date(payable.doc_date).getFullYear();
    const voucherNo = `PC-${payable.doc_no}`;

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PC', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        payable.doc_date,
        `Phải trả: ${payable.partner_name} - ${payable.description || ''}`,
        payable.original_amount,
        fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating payable voucher:', err);
            return;
        }

        // Định khoản: Nợ TK 6xx, Có TK 331/336/338
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description, partner_code)
            VALUES (?, ?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            expenseAccount || '642',  // Mặc định TK 642 - Chi phí quản lý
            payable.account_code || '331',
            payable.original_amount,
            payable.description,
            payable.partner_code
        ], (err) => {
            if (err) console.error('Error creating voucher item:', err);
            else console.log(`✓ Created payable voucher ${voucherNo}`);
        });
    });

    return voucherId;
};

/**
 * Tạo chứng từ khi Trả tiền công nợ
 * Nợ TK 331/336/338 (Giảm phải trả)
 * Có TK 111/112 (Chi tiền)
 */
exports.createPayablePaymentVoucher = (db, payable, paymentAmount, paymentDate, paymentMethod, req) => {
    const voucherId = uuidv4();
    const fiscal_year = new Date(paymentDate).getFullYear();
    const voucherNo = `PC-TT-${payable.doc_no}`;

    const cashAccount = paymentMethod === 'BANK' ? '112' : '111';

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PC', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        paymentDate,
        `Trả tiền: ${payable.partner_name}`,
        paymentAmount,
        fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating payable payment voucher:', err);
            return;
        }

        // Định khoản: Nợ TK 331/336/338, Có TK 111/112
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description, partner_code)
            VALUES (?, ?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            payable.account_code || '331',
            cashAccount,
            paymentAmount,
            `Trả ${payable.partner_name}`,
            payable.partner_code
        ], (err) => {
            if (err) console.error('Error creating voucher item:', err);
            else console.log(`✓ Created payable payment voucher ${voucherNo}`);
        });
    });

    return voucherId;
};

module.exports = exports;
