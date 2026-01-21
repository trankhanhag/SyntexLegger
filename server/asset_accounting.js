// ========================================
// ASSET ACCOUNTING INTEGRATION - HCSN (TT 24/2024)
// ========================================
// Module tự động tạo chứng từ kế toán cho nghiệp vụ tài sản

const { v4: uuidv4 } = require('uuid');

/**
 * Tạo chứng từ khi Ghi tăng TSCĐ
 * Nợ TK 211/212/213: Nguyên giá tài sản
 * Có TK 461/441/111: Nguồn hình thành
 */
exports.createAssetIncreaseVoucher = (db, asset, fundSource, req) => {
    const voucherId = uuidv4();
    const debitAccount = asset.account_code || '211';
    const creditAccount = getCreditAccountByFundSource(fundSource?.code);

    const fiscal_year = new Date(asset.purchase_date).getFullYear();
    const voucherNo = `PC-TSCD-${asset.code}`;

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PC', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        asset.purchase_date,
        `Ghi tăng TSCĐ: ${asset.name}`,
        asset.original_value,
        fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating voucher for asset increase:', err);
            return;
        }

        // Định khoản: Nợ TK 211, Có TK 461/441
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description, dim1, dim2)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            debitAccount,
            creditAccount,
            asset.original_value,
            `Ghi tăng ${asset.name}`,
            fundSource?.code || null,
            asset.department || null
        ], (err) => {
            if (err) console.error('Error creating voucher item:', err);
            else console.log(`✓ Created accounting voucher ${voucherNo} for asset ${asset.code}`);
        });
    });

    return voucherId;
};

/**
 * Tạo chứng từ khi Khấu hao TSCĐ
 * Nợ TK 642: Chi phí khấu hao TSCĐ
 * Có TK 214: Hao mòn lũy kế TSCĐ
 */
exports.createDepreciationVoucher = (db, period, totalDepreciation, assetCount, req) => {
    if (totalDepreciation <= 0) return null;

    const voucherId = uuidv4();
    const fiscal_year = parseInt(period.split('-')[0]);
    const voucherNo = `PC-KH-${period}`;
    const lastDayOfMonth = getLastDayOfMonth(period);

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PC', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        lastDayOfMonth,
        `Khấu hao TSCĐ tháng ${period} (${assetCount} tài sản)`,
        totalDepreciation,
        fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating depreciation voucher:', err);
            return;
        }

        // Định khoản: Nợ TK 642, Có TK 214
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description)
            VALUES (?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            '642',  // TK Chi phí khấu hao
            '214',  // TK Hao mòn lũy kế
            totalDepreciation,
            `Khấu hao ${period}`
        ], (err) => {
            if (err) console.error('Error creating depreciation voucher item:', err);
            else console.log(`✓ Created depreciation voucher ${voucherNo}: ${totalDepreciation.toLocaleString('vi-VN')} VNĐ`);
        });
    });

    return voucherId;
};

/**
 * Tạo chứng từ khi Ghi giảm TSCĐ
 * Nợ TK 214: Hao mòn lũy kế
 * Nợ TK 711: Thu nhập khác (nếu thanh lý có giá trị)
 * Có TK 211/212/213: Nguyên giá tài sản
 */
exports.createAssetDecreaseVoucher = (db, asset, disposalValue, req) => {
    const voucherId = uuidv4();
    const debitAccount = asset.account_code || '211';
    const fiscal_year = new Date().getFullYear();
    const voucherNo = `PC-GG-${asset.code}`;

    const voucherSql = `INSERT INTO vouchers 
        (id, voucher_no, voucher_date, voucher_type, description, total_amount, fiscal_year, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'PC', ?, ?, ?, 'POSTED', ?, datetime('now'), datetime('now'))`;

    db.run(voucherSql, [
        voucherId,
        voucherNo,
        new Date().toISOString().split('T')[0],
        `Ghi giảm TSCĐ: ${asset.name}`,
        asset.original_value,
        fiscal_year,
        req.user?.username || 'system'
    ], function (err) {
        if (err) {
            console.error('Error creating asset decrease voucher:', err);
            return;
        }

        // Định khoản 1: Nợ TK 214 (Hao mòn LK), Có TK 211 (Nguyên giá)
        const itemSql = `INSERT INTO voucher_items 
            (voucher_id, debit_account, credit_account, amount, description)
            VALUES (?, ?, ?, ?, ?)`;

        db.run(itemSql, [
            voucherId,
            '214',
            debitAccount,
            asset.accumulated_depreciation || 0,
            `Giảm hao mòn LK - ${asset.name}`
        ]);

        // Định khoản 2: Nếu có thanh lý
        if (disposalValue > 0) {
            db.run(itemSql, [
                voucherId,
                '111',  // Thu tiền thanh lý
                '711',  // Thu nhập khác
                disposalValue,
                `Thu thanh lý ${asset.name}`
            ]);
        }

        // Định khoản 3: Giá trị còn lại (nếu có) -> Chi phí khác
        const netValue = asset.net_value || (asset.original_value - (asset.accumulated_depreciation || 0));
        if (netValue > 0) {
            db.run(itemSql, [
                voucherId,
                '811',  // Chi phí khác
                debitAccount,
                netValue,
                `Giá trị còn lại ${asset.name}`
            ], (err) => {
                if (err) console.error('Error creating asset decrease final item:', err);
                else console.log(`✓ Created asset decrease voucher ${voucherNo} for ${asset.code}`);
            });
        }
    });

    return voucherId;
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Mapping Nguồn vốn -> Tài khoản kế toán
 */
function getCreditAccountByFundSource(fundSourceCode) {
    if (!fundSourceCode) return '461';  // Mặc định Nguồn NSNN

    const code = fundSourceCode.toUpperCase();

    // Nguồn Ngân sách Nhà nước
    if (code === 'NS' || code === 'NSNN') return '461';

    // Nguồn Sự nghiệp
    if (code === 'SN') return '461';

    // Nguồn khác (đầu tư, viện trợ...)
    if (code === 'K' || code === 'VA' || code === 'DT') return '441';

    // Tiền mặt (mua trực tiếp)
    if (code === 'TM') return '111';

    // Ngân hàng (chuyển khoản)
    if (code === 'NH') return '112';

    // Default
    return '461';
}

/**
 * Lấy ngày cuối tháng từ period 'YYYY-MM'
 */
function getLastDayOfMonth(period) {
    const [year, month] = period.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

module.exports = exports;
