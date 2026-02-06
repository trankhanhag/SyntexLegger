/**
 * Closing Routes - Quy trình khóa sổ cuối kỳ
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */
const express = require('express');
const router = express.Router();
const logger = require('../src/utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Lấy ngày cuối tháng của period (YYYY-MM)
 */
function getLastDayOfMonth(period) {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month, 0).toISOString().split('T')[0];
}

/**
 * Helper: Tạo voucher và voucher_items
 * Sử dụng đúng schema của bảng: doc_no, doc_date, post_date, type, debit_acc, credit_acc
 */
function createVoucher(db, data) {
    return new Promise((resolve, reject) => {
        const voucherId = uuidv4();
        const voucherSql = `INSERT INTO vouchers
            (id, doc_no, doc_date, post_date, type, description, total_amount, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'POSTED', datetime('now'))`;

        db.run(voucherSql, [
            voucherId,
            data.voucher_no,
            data.voucher_date,
            data.voucher_date, // post_date = doc_date cho kết chuyển
            data.voucher_type || 'KC', // KC = Kết chuyển
            data.description,
            data.total_amount
        ], function (err) {
            if (err) {
                logger.error('[CLOSING] Error creating voucher:', err);
                reject(err);
                return;
            }

            // Insert voucher items - sử dụng đúng tên cột: debit_acc, credit_acc
            const itemSql = `INSERT INTO voucher_items
                (voucher_id, debit_acc, credit_acc, amount, description)
                VALUES (?, ?, ?, ?, ?)`;

            const items = data.items || [];
            let processed = 0;
            let hasError = false;

            if (items.length === 0) {
                resolve({ voucherId, voucherNo: data.voucher_no });
                return;
            }

            items.forEach((item, idx) => {
                db.run(itemSql, [
                    voucherId,
                    item.debit_account,
                    item.credit_account,
                    item.amount,
                    item.description || data.description
                ], (err) => {
                    if (err && !hasError) {
                        hasError = true;
                        logger.error('[CLOSING] Error creating voucher item:', err);
                        reject(err);
                        return;
                    }
                    processed++;
                    if (processed === items.length && !hasError) {
                        resolve({ voucherId, voucherNo: data.voucher_no });
                    }
                });
            });
        });
    });
}

/**
 * Lấy số dư tài khoản theo kỳ
 */
function getAccountBalances(db, period) {
    return new Promise((resolve, reject) => {
        const [year, month] = period.split('-').map(Number);
        const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const toDate = getLastDayOfMonth(period);

        const sql = `
            SELECT
                gl.account_code,
                COALESCE(coa.account_name, gl.account_code) as account_name,
                SUM(gl.debit_amount) as total_debit,
                SUM(gl.credit_amount) as total_credit,
                SUM(gl.debit_amount - gl.credit_amount) as net_balance
            FROM general_ledger gl
            LEFT JOIN chart_of_accounts coa ON gl.account_code = coa.account_code
            WHERE gl.trx_date BETWEEN ? AND ?
            GROUP BY gl.account_code
            HAVING ABS(SUM(gl.debit_amount - gl.credit_amount)) > 0.01
        `;

        db.all(sql, [fromDate, toDate], (err, rows) => {
            if (err) {
                logger.error('[CLOSING] Error fetching balances:', err);
                reject(err);
                return;
            }
            resolve(rows || []);
        });
    });
}

module.exports = (db) => {
    /**
     * @route POST /api/closing/execute-macro
     * @desc Execute full closing macro sequence for end of period
     * @body { period: 'YYYY-MM' }
     */
    router.post('/closing/execute-macro', async (req, res) => {
        const { period } = req.body;
        const username = req.user?.username || 'system';

        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
            return res.status(400).json({
                success: false,
                message: 'Period phải có định dạng YYYY-MM'
            });
        }

        logger.info(`[CLOSING] ========== Starting macro for period: ${period} ==========`);
        const results = [];
        const createdVouchers = [];
        const fiscal_year = parseInt(period.split('-')[0]);
        const lastDay = getLastDayOfMonth(period);

        try {
            // ===== STEP 1: STOCK VALUATION (Tính giá vốn) =====
            // Note: Doanh nghiệp thường sử dụng WEIGHTED_AVERAGE (bình quân gia quyền)
            // Bước này thường tự động trong quá trình xuất kho
            results.push({
                code: 'VALUATION',
                name: 'Tính giá vốn (Stock Valuation)',
                status: 'success',
                info: 'Giá vốn được tính tự động khi xuất kho'
            });
            logger.info('[CLOSING] Step 1 - Stock Valuation: SKIPPED (auto-calculated on issue)');

            // ===== STEP 2: DEPRECIATION (Trích khấu hao/hao mòn TSCĐ) =====
            try {
                const depreciationResult = await new Promise((resolve, reject) => {
                    // Lấy danh sách TSCĐ cần khấu hao trong kỳ
                    const assetSql = `
                        SELECT id, code, name, original_value, accumulated_depreciation,
                               net_value, useful_life, depreciation_method, asset_category
                        FROM fixed_assets
                        WHERE status = 'ACTIVE'
                          AND useful_life > 0
                          AND net_value > 0
                    `;

                    db.all(assetSql, [], (err, assets) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        if (!assets || assets.length === 0) {
                            resolve({ processed: 0, totalDepreciation: 0, skipped: 'No active assets' });
                            return;
                        }

                        let totalDepreciation = 0;
                        let processed = 0;

                        assets.forEach(asset => {
                            // Tính khấu hao tháng theo đường thẳng
                            const monthlyDep = asset.useful_life > 0
                                ? Math.round(asset.original_value / (asset.useful_life * 12))
                                : 0;

                            // Kiểm tra không khấu hao quá giá trị còn lại
                            const actualDep = Math.min(monthlyDep, asset.net_value);

                            if (actualDep > 0) {
                                const newAccumulated = (asset.accumulated_depreciation || 0) + actualDep;
                                const newNetValue = asset.original_value - newAccumulated;

                                // Cập nhật TSCĐ
                                db.run(`
                                    UPDATE fixed_assets
                                    SET accumulated_depreciation = ?, net_value = ?, updated_at = datetime('now')
                                    WHERE id = ?
                                `, [newAccumulated, newNetValue, asset.id]);

                                // Ghi log khấu hao
                                db.run(`
                                    INSERT INTO asset_depreciation_log (asset_id, period, depreciation_amount, accumulated_depreciation, net_value, created_by)
                                    VALUES (?, ?, ?, ?, ?, ?)
                                `, [asset.id, period, actualDep, newAccumulated, newNetValue, username]);

                                totalDepreciation += actualDep;
                                processed++;
                            }
                        });

                        resolve({ processed, totalDepreciation });
                    });
                });

                // Tạo bút toán khấu hao nếu có
                if (depreciationResult.totalDepreciation > 0) {
                    const depVoucher = await createVoucher(db, {
                        voucher_no: `KC-KH-${period}`,
                        voucher_date: lastDay,
                        voucher_type: 'KC',
                        description: `Khấu hao TSCĐ tháng ${period} (${depreciationResult.processed} tài sản)`,
                        total_amount: depreciationResult.totalDepreciation,
                        fiscal_year,
                        created_by: username,
                        items: [{
                            debit_account: '642',  // Chi phí quản lý doanh nghiệp (TT 99/2025)
                            credit_account: '214', // Hao mòn lũy kế TSCĐ
                            amount: depreciationResult.totalDepreciation,
                            description: `Khấu hao TSCĐ ${period}`
                        }]
                    });

                    createdVouchers.push({
                        id: depVoucher.voucherId,
                        docNo: depVoucher.voucherNo,
                        description: `Khấu hao TSCĐ: ${depreciationResult.totalDepreciation.toLocaleString('vi-VN')} VNĐ`
                    });

                    results.push({
                        code: 'DEPRECIATION',
                        name: 'Trích khấu hao TSCĐ (214)',
                        status: 'success',
                        info: `Đã trích ${depreciationResult.totalDepreciation.toLocaleString('vi-VN')} VNĐ cho ${depreciationResult.processed} tài sản`
                    });
                } else {
                    results.push({
                        code: 'DEPRECIATION',
                        name: 'Trích khấu hao TSCĐ (214)',
                        status: 'success',
                        info: 'Không có TSCĐ cần khấu hao trong kỳ'
                    });
                }
                logger.info(`[CLOSING] Step 2 - Depreciation: ${depreciationResult.totalDepreciation.toLocaleString()} VNĐ`);

            } catch (depErr) {
                logger.error('[CLOSING] Depreciation error:', depErr);
                results.push({
                    code: 'DEPRECIATION',
                    name: 'Trích hao mòn/khấu hao',
                    status: 'warning',
                    info: 'Bỏ qua do lỗi: ' + depErr.message
                });
            }

            // ===== STEP 3: REVENUE RECOGNITION (Ghi nhận doanh thu từ TK 3387) =====
            // TK 3387: Doanh thu chưa thực hiện (TT 99/2025)
            try {
                const revenueRecognition = await new Promise((resolve, reject) => {
                    const sql = `
                        SELECT SUM(credit_amount - debit_amount) as balance
                        FROM general_ledger
                        WHERE account_code LIKE '3387%'
                          AND trx_date <= ?
                    `;
                    db.get(sql, [lastDay], (err, row) => {
                        if (err) reject(err);
                        else resolve(row?.balance || 0);
                    });
                });

                if (revenueRecognition > 0) {
                    // Ghi nhận doanh thu: Nợ 3387, Có 511
                    const revVoucher = await createVoucher(db, {
                        voucher_no: `KC-GN-${period}`,
                        voucher_date: lastDay,
                        voucher_type: 'KC',
                        description: `Ghi nhận doanh thu chưa thực hiện ${period}`,
                        total_amount: revenueRecognition,
                        fiscal_year,
                        created_by: username,
                        items: [{
                            debit_account: '3387',
                            credit_account: '511',
                            amount: revenueRecognition,
                            description: `Ghi nhận doanh thu từ 3387`
                        }]
                    });

                    createdVouchers.push({
                        id: revVoucher.voucherId,
                        docNo: revVoucher.voucherNo,
                        description: `Ghi nhận doanh thu: ${revenueRecognition.toLocaleString('vi-VN')} VNĐ`
                    });

                    results.push({
                        code: 'REVENUE_RECOGNITION',
                        name: 'Ghi nhận Doanh thu (511)',
                        status: 'success',
                        info: `Đã ghi nhận ${revenueRecognition.toLocaleString('vi-VN')} VNĐ từ DT chưa thực hiện`
                    });
                } else {
                    results.push({
                        code: 'REVENUE_RECOGNITION',
                        name: 'Ghi nhận Doanh thu (511)',
                        status: 'success',
                        info: 'Không có khoản cần ghi nhận'
                    });
                }
                logger.info(`[CLOSING] Step 3 - Revenue Recognition: ${revenueRecognition.toLocaleString()} VNĐ`);

            } catch (revErr) {
                logger.error('[CLOSING] Revenue recognition error:', revErr);
                results.push({
                    code: 'REVENUE_RECOGNITION',
                    name: 'Ghi nhận Doanh thu (3387 → 511)',
                    status: 'warning',
                    info: 'Bỏ qua'
                });
            }

            // ===== STEP 4: ALLOCATION (Phân bổ chi phí trả trước - TK 242) =====
            try {
                const allocationResult = await new Promise((resolve, reject) => {
                    const sql = `
                        SELECT id, name, original_value, allocated_amount, remaining_amount, allocation_months
                        FROM ccdc_items
                        WHERE status = 'ACTIVE'
                          AND remaining_amount > 0
                          AND allocation_months > 0
                    `;

                    db.all(sql, [], (err, items) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        if (!items || items.length === 0) {
                            resolve({ processed: 0, totalAllocation: 0 });
                            return;
                        }

                        let totalAllocation = 0;
                        let processed = 0;

                        items.forEach(item => {
                            const monthlyAlloc = Math.round(item.original_value / item.allocation_months);
                            const actualAlloc = Math.min(monthlyAlloc, item.remaining_amount);

                            if (actualAlloc > 0) {
                                const newAllocated = (item.allocated_amount || 0) + actualAlloc;
                                const newRemaining = item.original_value - newAllocated;

                                db.run(`
                                    UPDATE ccdc_items
                                    SET allocated_amount = ?, remaining_amount = ?, updated_at = datetime('now')
                                    WHERE id = ?
                                `, [newAllocated, newRemaining, item.id]);

                                totalAllocation += actualAlloc;
                                processed++;
                            }
                        });

                        resolve({ processed, totalAllocation });
                    });
                });

                if (allocationResult.totalAllocation > 0) {
                    const allocVoucher = await createVoucher(db, {
                        voucher_no: `KC-PB-${period}`,
                        voucher_date: lastDay,
                        voucher_type: 'KC',
                        description: `Phân bổ chi phí trả trước ${period}`,
                        total_amount: allocationResult.totalAllocation,
                        fiscal_year,
                        created_by: username,
                        items: [{
                            debit_account: '642', // Chi phí QLDN (TT 99/2025)
                            credit_account: '242', // Chi phí trả trước
                            amount: allocationResult.totalAllocation,
                            description: `Phân bổ CCDC/Chi phí trả trước`
                        }]
                    });

                    createdVouchers.push({
                        id: allocVoucher.voucherId,
                        docNo: allocVoucher.voucherNo,
                        description: `Phân bổ chi phí: ${allocationResult.totalAllocation.toLocaleString('vi-VN')} VNĐ`
                    });

                    results.push({
                        code: 'ALLOCATION',
                        name: 'Phân bổ chi phí (Allocation)',
                        status: 'success',
                        info: `Đã phân bổ ${allocationResult.totalAllocation.toLocaleString('vi-VN')} VNĐ cho ${allocationResult.processed} khoản`
                    });
                } else {
                    results.push({
                        code: 'ALLOCATION',
                        name: 'Phân bổ chi phí (Allocation)',
                        status: 'success',
                        info: 'Không có khoản cần phân bổ'
                    });
                }
                logger.info(`[CLOSING] Step 4 - Allocation: ${allocationResult.totalAllocation.toLocaleString()} VNĐ`);

            } catch (allocErr) {
                logger.error('[CLOSING] Allocation error:', allocErr);
                results.push({
                    code: 'ALLOCATION',
                    name: 'Phân bổ chi phí (Allocation)',
                    status: 'warning',
                    info: 'Bỏ qua'
                });
            }

            // ===== STEP 5: FX REVALUATION (Đánh giá lại tỷ giá) =====
            // Doanh nghiệp có thể có giao dịch ngoại tệ
            try {
                // Kiểm tra có số dư ngoại tệ không (TK 1122 - Ngoại tệ, TK 1312 - Phải thu ngoại tệ)
                const fxBalance = await new Promise((resolve, reject) => {
                    const sql = `
                        SELECT SUM(ABS(debit_amount - credit_amount)) as balance
                        FROM general_ledger
                        WHERE (account_code LIKE '1122%' OR account_code LIKE '1312%')
                          AND trx_date <= ?
                    `;
                    db.get(sql, [lastDay], (err, row) => {
                        if (err) reject(err);
                        else resolve(row?.balance || 0);
                    });
                });

                if (fxBalance > 0) {
                    results.push({
                        code: 'FX_REVALUATION',
                        name: 'Đánh giá tỷ giá (FX Revaluation)',
                        status: 'success',
                        info: `Có số dư ngoại tệ ${fxBalance.toLocaleString('vi-VN')} - cần đánh giá thủ công theo tỷ giá cuối kỳ`
                    });
                } else {
                    results.push({
                        code: 'FX_REVALUATION',
                        name: 'Đánh giá tỷ giá (FX Revaluation)',
                        status: 'success',
                        info: 'Không có số dư ngoại tệ cần đánh giá'
                    });
                }
                logger.info(`[CLOSING] Step 5 - FX Revaluation: Balance=${fxBalance}`);
            } catch (fxErr) {
                results.push({
                    code: 'FX_REVALUATION',
                    name: 'Đánh giá tỷ giá (FX Revaluation)',
                    status: 'warning',
                    info: 'Bỏ qua'
                });
            }

            // ===== STEP 6: VAT TRANSFER (Kết chuyển VAT) =====
            // Doanh nghiệp: Bù trừ VAT đầu vào (133) và VAT đầu ra (3331)
            try {
                const vatData = await new Promise((resolve, reject) => {
                    const sql = `
                        SELECT
                            SUM(CASE WHEN account_code LIKE '133%' THEN debit_amount - credit_amount ELSE 0 END) as vat_input,
                            SUM(CASE WHEN account_code LIKE '3331%' THEN credit_amount - debit_amount ELSE 0 END) as vat_output
                        FROM general_ledger
                        WHERE trx_date BETWEEN ? AND ?
                    `;
                    const [year, month] = period.split('-').map(Number);
                    const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
                    db.get(sql, [fromDate, lastDay], (err, row) => {
                        if (err) reject(err);
                        else resolve(row || { vat_input: 0, vat_output: 0 });
                    });
                });

                const vatInput = vatData.vat_input || 0;
                const vatOutput = vatData.vat_output || 0;
                const vatPayable = vatOutput - vatInput;

                if (vatInput > 0 || vatOutput > 0) {
                    if (vatPayable > 0 && vatInput > 0) {
                        // Bù trừ VAT: Nợ 3331, Có 133
                        const vatAmount = Math.min(vatInput, vatOutput);
                        const vatVoucher = await createVoucher(db, {
                            voucher_no: `KC-VAT-${period}`,
                            voucher_date: lastDay,
                            voucher_type: 'KC',
                            description: `Bù trừ thuế GTGT ${period}`,
                            total_amount: vatAmount,
                            fiscal_year,
                            created_by: username,
                            items: [{
                                debit_account: '3331',
                                credit_account: '133',
                                amount: vatAmount,
                                description: `Bù trừ VAT đầu vào/đầu ra`
                            }]
                        });

                        createdVouchers.push({
                            id: vatVoucher.voucherId,
                            docNo: vatVoucher.voucherNo,
                            description: `Bù trừ VAT: ${vatAmount.toLocaleString('vi-VN')} VNĐ`
                        });

                        results.push({
                            code: 'VAT_TRANSFER',
                            name: 'Kết chuyển VAT (nếu có)',
                            status: 'success',
                            info: `Bù trừ ${vatAmount.toLocaleString('vi-VN')} VNĐ. Còn phải nộp: ${(vatPayable - vatAmount).toLocaleString('vi-VN')} VNĐ`
                        });
                    } else {
                        results.push({
                            code: 'VAT_TRANSFER',
                            name: 'Kết chuyển VAT (nếu có)',
                            status: 'success',
                            info: `VAT đầu vào: ${vatInput.toLocaleString('vi-VN')}, VAT đầu ra: ${vatOutput.toLocaleString('vi-VN')}`
                        });
                    }
                } else {
                    results.push({
                        code: 'VAT_TRANSFER',
                        name: 'Kết chuyển VAT (nếu có)',
                        status: 'success',
                        info: 'Không có số dư VAT trong kỳ'
                    });
                }
                logger.info(`[CLOSING] Step 6 - VAT Transfer: Input=${vatInput}, Output=${vatOutput}, Payable=${vatPayable}`);
            } catch (vatErr) {
                logger.error('[CLOSING] VAT error:', vatErr);
                results.push({
                    code: 'VAT_TRANSFER',
                    name: 'Kết chuyển VAT (nếu có)',
                    status: 'warning',
                    info: 'Bỏ qua do lỗi'
                });
            }

            // ===== STEP 7: PAYROLL POSTING (Hạch toán lương) =====
            // Kiểm tra xem đã có bút toán lương trong kỳ chưa
            try {
                const payrollCheck = await new Promise((resolve, reject) => {
                    const sql = `
                        SELECT COUNT(*) as count
                        FROM vouchers
                        WHERE doc_no LIKE 'LG-%${period}%'
                          AND status = 'POSTED'
                    `;
                    db.get(sql, [], (err, row) => {
                        if (err) reject(err);
                        else resolve(row?.count || 0);
                    });
                });

                results.push({
                    code: 'PAYROLL',
                    name: 'Hạch toán Lương & Bảo hiểm (334, 338)',
                    status: 'success',
                    info: payrollCheck > 0
                        ? `Đã có ${payrollCheck} bút toán lương trong kỳ`
                        : 'Chưa có dữ liệu lương - vui lòng nhập từ module Nhân sự'
                });
                logger.info(`[CLOSING] Step 7 - Payroll: ${payrollCheck} vouchers found`);

            } catch (payrollErr) {
                results.push({
                    code: 'PAYROLL',
                    name: 'Hạch toán Lương & Bảo hiểm (334, 338)',
                    status: 'warning',
                    info: 'Không kiểm tra được'
                });
            }

            // ===== STEP 8: P&L TRANSFER (Kết chuyển 911) =====
            try {
                const balances = await getAccountBalances(db, period);

                // Tài khoản doanh thu (5xx, 7xx) - Có số dư Có
                const revenueAccounts = balances.filter(acc =>
                    (acc.account_code.startsWith('5') || acc.account_code.startsWith('7'))
                ).map(acc => ({
                    code: acc.account_code,
                    name: acc.account_name,
                    balance: Math.abs(acc.net_balance)
                })).filter(acc => acc.balance > 0);

                // Tài khoản chi phí (6xx, 8xx) - Có số dư Nợ
                const expenseAccounts = balances.filter(acc =>
                    (acc.account_code.startsWith('6') || acc.account_code.startsWith('8'))
                ).map(acc => ({
                    code: acc.account_code,
                    name: acc.account_name,
                    balance: Math.abs(acc.net_balance)
                })).filter(acc => acc.balance > 0);

                const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + acc.balance, 0);
                const totalExpense = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);
                const profit = totalRevenue - totalExpense;

                if (totalRevenue > 0 || totalExpense > 0) {
                    const items = [];

                    // Kết chuyển doanh thu: Nợ 5xx/7xx, Có 911
                    revenueAccounts.forEach(acc => {
                        items.push({
                            debit_account: acc.code,
                            credit_account: '911',
                            amount: acc.balance,
                            description: `KC ${acc.name}`
                        });
                    });

                    // Kết chuyển chi phí: Nợ 911, Có 6xx/8xx
                    expenseAccounts.forEach(acc => {
                        items.push({
                            debit_account: '911',
                            credit_account: acc.code,
                            amount: acc.balance,
                            description: `KC ${acc.name}`
                        });
                    });

                    // Kết chuyển Lãi/Lỗ sang TK 421 (Lợi nhuận sau thuế chưa phân phối)
                    if (Math.abs(profit) > 0) {
                        items.push({
                            debit_account: profit > 0 ? '911' : '421',
                            credit_account: profit > 0 ? '421' : '911',
                            amount: Math.abs(profit),
                            description: profit > 0 ? 'KC Lợi nhuận' : 'KC Lỗ'
                        });
                    }

                    const plVoucher = await createVoucher(db, {
                        voucher_no: `KC-911-${period}`,
                        voucher_date: lastDay,
                        voucher_type: 'KC',
                        description: `Kết chuyển xác định KQHĐ kỳ ${period}`,
                        total_amount: totalRevenue + totalExpense,
                        fiscal_year,
                        created_by: username,
                        items
                    });

                    createdVouchers.push({
                        id: plVoucher.voucherId,
                        docNo: plVoucher.voucherNo,
                        description: profit >= 0
                            ? `Lợi nhuận: ${profit.toLocaleString('vi-VN')} VNĐ`
                            : `Lỗ: ${Math.abs(profit).toLocaleString('vi-VN')} VNĐ`
                    });

                    results.push({
                        code: 'PL_TRANSFER',
                        name: 'Kết chuyển Lãi/Lỗ (911 → 421)',
                        status: 'success',
                        info: profit >= 0
                            ? `Lợi nhuận kỳ: ${profit.toLocaleString('vi-VN')} VNĐ`
                            : `Lỗ kỳ: ${Math.abs(profit).toLocaleString('vi-VN')} VNĐ`
                    });
                } else {
                    results.push({
                        code: 'PL_TRANSFER',
                        name: 'Kết chuyển Lãi/Lỗ (911 → 421)',
                        status: 'success',
                        info: 'Không có số dư cần kết chuyển'
                    });
                }
                logger.info(`[CLOSING] Step 8 - P&L Transfer: Revenue=${totalRevenue}, Expense=${totalExpense}, Profit=${profit}`);

            } catch (plErr) {
                logger.error('[CLOSING] P&L Transfer error:', plErr);
                results.push({
                    code: 'PL_TRANSFER',
                    name: 'Kết chuyển Lãi/Lỗ (911 → 421)',
                    status: 'error',
                    info: 'Lỗi: ' + plErr.message
                });
            }

            // ===== STEP 9: FUND DISTRIBUTION (Trích lập quỹ 414, 418) =====
            // TK 414: Quỹ đầu tư phát triển
            // TK 418: Các quỹ khác thuộc vốn chủ sở hữu
            // Thường áp dụng cuối năm theo quyết định phân phối lợi nhuận
            const isYearEnd = period.endsWith('-12');
            results.push({
                code: 'FUND_DISTRIBUTION',
                name: 'Trích lập các Quỹ (414, 418)',
                status: 'success',
                info: isYearEnd
                    ? 'Vui lòng thực hiện thủ công theo quyết định phân phối lợi nhuận'
                    : 'Chỉ áp dụng cuối năm tài chính'
            });
            logger.info(`[CLOSING] Step 9 - Fund Distribution: ${isYearEnd ? 'Year-end, manual required' : 'Skipped (not year-end)'}`);

            // ===== HOÀN TẤT =====
            logger.info(`[CLOSING] ========== Macro completed for period: ${period} ==========`);
            logger.info(`[CLOSING] Created ${createdVouchers.length} vouchers`);

            res.json({
                success: true,
                period,
                message: `Quy trình khóa sổ kỳ ${period} đã hoàn tất thành công.`,
                details: results,
                createdVouchers
            });

        } catch (error) {
            logger.error('[CLOSING] Macro execution failed:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra trong quá trình chạy quy trình cuối kỳ.',
                error: error.message,
                details: results
            });
        }
    });

    /**
     * @route GET /api/closing/status/:period
     * @desc Check if period has been closed
     */
    router.get('/closing/status/:period', (req, res) => {
        const { period } = req.params;

        const sql = `
            SELECT voucher_no, voucher_date, description, total_amount
            FROM vouchers
            WHERE doc_no LIKE 'KC-911-${period}'
              AND status = 'POSTED'
            LIMIT 1
        `;

        db.get(sql, [], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                period,
                isClosed: !!row,
                closingVoucher: row || null
            });
        });
    });

    /**
     * @route POST /api/closing/reverse/:period
     * @desc Reverse closing entries for a period (rollback)
     */
    router.post('/closing/reverse/:period', (req, res) => {
        const { period } = req.params;

        logger.info(`[CLOSING] Reversing period: ${period}`);

        // Delete all KC vouchers for the period
        const sql = `
            DELETE FROM vouchers
            WHERE doc_no LIKE 'KC-%-${period}'
              AND status = 'POSTED'
        `;

        db.run(sql, [], function (err) {
            if (err) {
                logger.error('[CLOSING] Reverse failed:', err);
                return res.status(500).json({ error: err.message });
            }

            logger.info(`[CLOSING] Reversed ${this.changes} vouchers for period ${period}`);

            res.json({
                success: true,
                message: `Đã hoàn tác ${this.changes} bút toán kết chuyển kỳ ${period}`,
                reversedCount: this.changes
            });
        });
    });

    return router;
};
