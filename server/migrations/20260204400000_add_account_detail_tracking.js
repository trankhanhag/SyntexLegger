/**
 * Migration: Add Detail Tracking Fields to Chart of Accounts
 * Bổ sung các trường theo dõi chi tiết số dư theo đối tượng liên quan
 * Theo Thông tư 99/2025/TT-BTC
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    console.log('[MIGRATION] Adding detail tracking fields to chart_of_accounts...');

    // ========================================
    // 1. ADD NEW COLUMNS
    // ========================================
    const columnsToAdd = [
        { name: 'track_by_partner', type: 'INTEGER', default: 0, comment: 'Theo dõi theo đối tác (KH, NCC)' },
        { name: 'track_by_employee', type: 'INTEGER', default: 0, comment: 'Theo dõi theo nhân viên' },
        { name: 'track_by_contract', type: 'INTEGER', default: 0, comment: 'Theo dõi theo hợp đồng' },
        { name: 'track_by_project', type: 'INTEGER', default: 0, comment: 'Theo dõi theo dự án/công trình' },
        { name: 'track_by_asset', type: 'INTEGER', default: 0, comment: 'Theo dõi theo tài sản cố định' },
        { name: 'track_by_material', type: 'INTEGER', default: 0, comment: 'Theo dõi theo vật tư/hàng hóa' },
        { name: 'track_by_bank', type: 'INTEGER', default: 0, comment: 'Theo dõi theo tài khoản ngân hàng' },
        { name: 'track_by_department', type: 'INTEGER', default: 0, comment: 'Theo dõi theo bộ phận/phòng ban' },
        { name: 'allow_foreign_currency', type: 'INTEGER', default: 0, comment: 'Cho phép hạch toán ngoại tệ' },
        { name: 'requires_invoice', type: 'INTEGER', default: 0, comment: 'Yêu cầu hóa đơn' },
    ];

    for (const col of columnsToAdd) {
        const hasCol = await knex.schema.hasColumn('chart_of_accounts', col.name);
        if (!hasCol) {
            await knex.schema.alterTable('chart_of_accounts', (table) => {
                table.integer(col.name).defaultTo(col.default);
            });
            console.log(`[COLUMN] Added ${col.name}`);
        }
    }

    // ========================================
    // 2. UPDATE TRACKING FLAGS BY ACCOUNT
    // ========================================

    // --- TÀI KHOẢN THEO DÕI THEO ĐỐI TÁC (Khách hàng, Nhà cung cấp) ---
    const partnerAccounts = [
        '131',   // Phải thu của khách hàng
        '1311',  // Phải thu của khách hàng - chi tiết
        '136',   // Phải thu nội bộ
        '1368',  // Phải thu nội bộ khác
        '138',   // Phải thu khác
        '1381',  // Tài sản thiếu chờ xử lý
        '1385',  // Phải thu về cổ phần hóa
        '1388',  // Phải thu khác
        '141',   // Tạm ứng
        '244',   // Ký quỹ, ký cược dài hạn
        '331',   // Phải trả cho người bán
        '3311',  // Phải trả cho người bán - chi tiết
        '333',   // Thuế và các khoản phải nộp NN
        '336',   // Phải trả nội bộ
        '338',   // Phải trả, phải nộp khác
        '3381',  // Tài sản thừa chờ giải quyết
        '3382',  // Kinh phí công đoàn
        '3383',  // Bảo hiểm xã hội
        '3384',  // Bảo hiểm y tế
        '3385',  // Phải trả về cổ phần hóa
        '3386',  // Bảo hiểm thất nghiệp
        '3387',  // Doanh thu chưa thực hiện
        '3388',  // Phải trả, phải nộp khác
        '344',   // Nhận ký quỹ, ký cược dài hạn
    ];
    await knex('chart_of_accounts')
        .whereIn('account_code', partnerAccounts)
        .update({ track_by_partner: 1 });
    console.log(`[UPDATE] track_by_partner: ${partnerAccounts.length} accounts`);

    // --- TÀI KHOẢN THEO DÕI THEO NHÂN VIÊN ---
    const employeeAccounts = [
        '141',   // Tạm ứng
        '334',   // Phải trả người lao động
        '3341',  // Phải trả công nhân viên
        '3348',  // Phải trả người lao động khác
        '338',   // Phải trả, phải nộp khác
        '3382',  // Kinh phí công đoàn
        '3383',  // Bảo hiểm xã hội
        '3384',  // Bảo hiểm y tế
        '3386',  // Bảo hiểm thất nghiệp
    ];
    await knex('chart_of_accounts')
        .whereIn('account_code', employeeAccounts)
        .update({ track_by_employee: 1 });
    console.log(`[UPDATE] track_by_employee: ${employeeAccounts.length} accounts`);

    // --- TÀI KHOẢN THEO DÕI THEO TÀI SẢN CỐ ĐỊNH ---
    const assetAccounts = [
        '211',   // TSCĐ hữu hình
        '2111',  // Nhà cửa, vật kiến trúc
        '2112',  // Máy móc, thiết bị
        '2113',  // Phương tiện vận tải
        '2114',  // Thiết bị, dụng cụ quản lý
        '2115',  // Cây lâu năm, súc vật làm việc
        '2118',  // TSCĐ khác
        '212',   // TSCĐ thuê tài chính
        '213',   // TSCĐ vô hình
        '2131',  // Quyền sử dụng đất
        '2132',  // Quyền phát hành
        '2133',  // Bản quyền, bằng sáng chế
        '2134',  // Nhãn hiệu hàng hóa
        '2135',  // Phần mềm máy vi tính
        '2136',  // Giấy phép và giấy phép nhượng quyền
        '2138',  // TSCĐ vô hình khác
        '214',   // Hao mòn TSCĐ
        '2141',  // Hao mòn TSCĐ hữu hình
        '2142',  // Hao mòn TSCĐ thuê tài chính
        '2143',  // Hao mòn TSCĐ vô hình
        '2147',  // Hao mòn bất động sản đầu tư
        '217',   // Bất động sản đầu tư
        '241',   // Xây dựng cơ bản dở dang
        '2411',  // Mua sắm TSCĐ
        '2412',  // Xây dựng cơ bản
        '2413',  // Sửa chữa lớn TSCĐ
    ];
    await knex('chart_of_accounts')
        .whereIn('account_code', assetAccounts)
        .update({ track_by_asset: 1 });
    console.log(`[UPDATE] track_by_asset: ${assetAccounts.length} accounts`);

    // --- TÀI KHOẢN THEO DÕI THEO VẬT TƯ/HÀNG HÓA ---
    const materialAccounts = [
        '151',   // Hàng mua đang đi đường
        '152',   // Nguyên liệu, vật liệu
        '1521',  // Nguyên liệu, vật liệu chính
        '1522',  // Vật liệu phụ
        '1523',  // Nhiên liệu
        '1524',  // Phụ tùng thay thế
        '1525',  // Thiết bị XDCB
        '1526',  // Vật liệu khác
        '1528',  // Vật liệu khác
        '153',   // Công cụ, dụng cụ
        '1531',  // Công cụ, dụng cụ
        '1532',  // Bao bì luân chuyển
        '1533',  // Đồ dùng cho thuê
        '1534',  // Thiết bị, phụ tùng thay thế
        '154',   // Chi phí SXKD dở dang
        '155',   // Thành phẩm
        '156',   // Hàng hóa
        '1561',  // Giá mua hàng hóa
        '1562',  // Chi phí thu mua hàng hóa
        '1567',  // Hàng hóa bất động sản
        '157',   // Hàng gửi đi bán
        '158',   // Hàng hóa kho bảo thuế
        '228',   // Đầu tư khác
        '229',   // Dự phòng tổn thất tài sản
        '2291',  // Dự phòng giảm giá chứng khoán kinh doanh
        '2292',  // Dự phòng tổn thất đầu tư vào đơn vị khác
        '2293',  // Dự phòng phải thu khó đòi
        '2294',  // Dự phòng giảm giá hàng tồn kho
    ];
    await knex('chart_of_accounts')
        .whereIn('account_code', materialAccounts)
        .update({ track_by_material: 1 });
    console.log(`[UPDATE] track_by_material: ${materialAccounts.length} accounts`);

    // --- TÀI KHOẢN THEO DÕI THEO HỢP ĐỒNG ---
    const contractAccounts = [
        '131',   // Phải thu của khách hàng
        '331',   // Phải trả cho người bán
        '337',   // Thanh toán theo tiến độ kế hoạch hợp đồng XD
        '3387',  // Doanh thu chưa thực hiện
        '511',   // Doanh thu bán hàng và cung cấp dịch vụ
        '5111',  // Doanh thu bán hàng hóa
        '5112',  // Doanh thu bán các thành phẩm
        '5113',  // Doanh thu cung cấp dịch vụ
        '5114',  // Doanh thu trợ cấp, trợ giá
        '5117',  // Doanh thu kinh doanh bất động sản đầu tư
        '5118',  // Doanh thu khác
        '632',   // Giá vốn hàng bán
    ];
    await knex('chart_of_accounts')
        .whereIn('account_code', contractAccounts)
        .update({ track_by_contract: 1 });
    console.log(`[UPDATE] track_by_contract: ${contractAccounts.length} accounts`);

    // --- TÀI KHOẢN THEO DÕI THEO DỰ ÁN/CÔNG TRÌNH ---
    const projectAccounts = [
        '154',   // Chi phí SXKD dở dang
        '241',   // Xây dựng cơ bản dở dang
        '2411',  // Mua sắm TSCĐ
        '2412',  // Xây dựng cơ bản
        '2413',  // Sửa chữa lớn TSCĐ
        '335',   // Chi phí phải trả
        '337',   // Thanh toán theo tiến độ kế hoạch hợp đồng XD
        '621',   // Chi phí nguyên liệu, vật liệu trực tiếp
        '622',   // Chi phí nhân công trực tiếp
        '623',   // Chi phí sử dụng máy thi công
        '627',   // Chi phí sản xuất chung
        '631',   // Giá thành sản xuất
    ];
    await knex('chart_of_accounts')
        .whereIn('account_code', projectAccounts)
        .update({ track_by_project: 1 });
    console.log(`[UPDATE] track_by_project: ${projectAccounts.length} accounts`);

    // --- TÀI KHOẢN THEO DÕI THEO NGÂN HÀNG ---
    const bankAccounts = [
        '112',   // Tiền gửi không kỳ hạn
        '1121',  // Tiền Việt Nam
        '1122',  // Ngoại tệ
        '1123',  // Vàng tiền tệ
        '113',   // Tiền đang chuyển
        '1131',  // Tiền Việt Nam
        '1132',  // Ngoại tệ
        '128',   // Đầu tư nắm giữ đến ngày đáo hạn
        '1281',  // Tiền gửi có kỳ hạn
        '341',   // Vay và nợ thuê tài chính
        '3411',  // Các khoản đi vay
        '3412',  // Nợ thuê tài chính
    ];
    await knex('chart_of_accounts')
        .whereIn('account_code', bankAccounts)
        .update({ track_by_bank: 1 });
    console.log(`[UPDATE] track_by_bank: ${bankAccounts.length} accounts`);

    // --- TÀI KHOẢN THEO DÕI THEO BỘ PHẬN/PHÒNG BAN ---
    const departmentAccounts = [
        '621',   // Chi phí nguyên liệu, vật liệu trực tiếp
        '622',   // Chi phí nhân công trực tiếp
        '623',   // Chi phí sử dụng máy thi công
        '627',   // Chi phí sản xuất chung
        '641',   // Chi phí bán hàng
        '642',   // Chi phí quản lý doanh nghiệp
    ];
    await knex('chart_of_accounts')
        .whereIn('account_code', departmentAccounts)
        .update({ track_by_department: 1 });
    console.log(`[UPDATE] track_by_department: ${departmentAccounts.length} accounts`);

    // --- TÀI KHOẢN CHO PHÉP NGOẠI TỆ ---
    const foreignCurrencyAccounts = [
        '111',   // Tiền mặt
        '1112',  // Ngoại tệ
        '112',   // Tiền gửi không kỳ hạn
        '1122',  // Ngoại tệ
        '113',   // Tiền đang chuyển
        '1132',  // Ngoại tệ
        '131',   // Phải thu của khách hàng
        '331',   // Phải trả cho người bán
        '136',   // Phải thu nội bộ
        '336',   // Phải trả nội bộ
        '138',   // Phải thu khác
        '338',   // Phải trả, phải nộp khác
        '341',   // Vay và nợ thuê tài chính
        '413',   // Chênh lệch tỷ giá hối đoái
        '515',   // Doanh thu hoạt động tài chính (Lãi tỷ giá)
        '635',   // Chi phí tài chính (Lỗ tỷ giá)
    ];
    await knex('chart_of_accounts')
        .whereIn('account_code', foreignCurrencyAccounts)
        .update({ allow_foreign_currency: 1 });
    console.log(`[UPDATE] allow_foreign_currency: ${foreignCurrencyAccounts.length} accounts`);

    // --- TÀI KHOẢN YÊU CẦU HÓA ĐƠN ---
    const invoiceRequiredAccounts = [
        '133',   // Thuế GTGT được khấu trừ
        '1331',  // Thuế GTGT được khấu trừ của hàng hóa, dịch vụ
        '1332',  // Thuế GTGT được khấu trừ của TSCĐ
        '3331',  // Thuế GTGT phải nộp
        '511',   // Doanh thu bán hàng và cung cấp dịch vụ
        '515',   // Doanh thu hoạt động tài chính
        '632',   // Giá vốn hàng bán
        '635',   // Chi phí tài chính
        '641',   // Chi phí bán hàng
        '642',   // Chi phí quản lý doanh nghiệp
        '711',   // Thu nhập khác
        '811',   // Chi phí khác
    ];
    await knex('chart_of_accounts')
        .whereIn('account_code', invoiceRequiredAccounts)
        .update({ requires_invoice: 1 });
    console.log(`[UPDATE] requires_invoice: ${invoiceRequiredAccounts.length} accounts`);

    console.log('[MIGRATION] Detail tracking fields added successfully');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Remove added columns
    const columnsToRemove = [
        'track_by_partner',
        'track_by_employee',
        'track_by_contract',
        'track_by_project',
        'track_by_asset',
        'track_by_material',
        'track_by_bank',
        'track_by_department',
        'allow_foreign_currency',
        'requires_invoice',
    ];

    for (const col of columnsToRemove) {
        const hasCol = await knex.schema.hasColumn('chart_of_accounts', col);
        if (hasCol) {
            await knex.schema.alterTable('chart_of_accounts', (table) => {
                table.dropColumn(col);
            });
        }
    }

    console.log('[MIGRATION] Detail tracking fields removed');
};
