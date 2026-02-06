/**
 * Seed: System Settings & Default Data
 * Dữ liệu nền tảng cho Kế toán Doanh nghiệp theo TT 99/2025
 */

const logger = require('../src/utils/logger');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
    // ========================================
    // 1. SYSTEM SETTINGS
    // ========================================
    await knex('system_settings').del();
    await knex('system_settings').insert([
        // Chế độ kế toán
        { key: 'accounting_regime', value: 'CIRCULAR_99_2025', description: 'Chế độ kế toán: TT 99/2025/TT-BTC (Doanh nghiệp)' },
        { key: 'accounting_regime_effective', value: '2026-01-01', description: 'Ngày hiệu lực chế độ kế toán' },

        // Thông tin ứng dụng
        { key: 'app_brand', value: 'SyntexLegger', description: 'Tên ứng dụng' },
        { key: 'app_version', value: '1.0.0', description: 'Phiên bản ứng dụng' },

        // Năm tài chính
        { key: 'fiscal_year_start', value: '01-01', description: 'Ngày bắt đầu năm tài chính (MM-DD)' },
        { key: 'fiscal_year_end', value: '12-31', description: 'Ngày kết thúc năm tài chính (MM-DD)' },
        { key: 'current_fiscal_year', value: '2026', description: 'Năm tài chính hiện tại' },

        // Tiền tệ
        { key: 'default_currency', value: 'VND', description: 'Đơn vị tiền tệ mặc định' },
        { key: 'currency_decimal_places', value: '0', description: 'Số chữ số thập phân cho tiền VND' },
        { key: 'foreign_currency_decimal', value: '2', description: 'Số chữ số thập phân cho ngoại tệ' },

        // Quy tắc chứng từ
        { key: 'locked_until_date', value: '', description: 'Ngày khóa sổ kế toán (YYYY-MM-DD)' },
        { key: 'auto_doc_no', value: 'true', description: 'Tự động tạo số chứng từ' },
        { key: 'require_balanced_voucher', value: 'true', description: 'Yêu cầu cân bằng Nợ/Có' },
        { key: 'allow_negative_inventory', value: 'false', description: 'Cho phép tồn kho âm' },

        // Phương pháp tính giá
        { key: 'inventory_costing_method', value: 'WEIGHTED_AVERAGE', description: 'PP tính giá HTK: WEIGHTED_AVERAGE, FIFO, SPECIFIC' },
        { key: 'depreciation_method', value: 'STRAIGHT_LINE', description: 'PP khấu hao: STRAIGHT_LINE, DECLINING_BALANCE, UNITS_OF_PRODUCTION' },

        // Thuế
        { key: 'vat_method', value: 'DEDUCTION', description: 'PP tính thuế GTGT: DEDUCTION (Khấu trừ), DIRECT (Trực tiếp)' },
        { key: 'default_vat_rate', value: '10', description: 'Thuế suất GTGT mặc định (%)' },
        { key: 'cit_rate', value: '20', description: 'Thuế suất TNDN (%)' },

        // Backup
        { key: 'auto_backup_enabled', value: 'true', description: 'Bật sao lưu tự động' },
        { key: 'backup_retention_days', value: '30', description: 'Số ngày lưu trữ bản sao lưu' }
    ]);

    // ========================================
    // 2. DEFAULT ROLES
    // ========================================
    const existingRoles = await knex('roles').select('id');
    if (existingRoles.length === 0) {
        await knex('roles').insert([
            {
                id: 1,
                name: 'admin',
                display_name: 'Quản trị viên',
                description: 'Quyền quản trị hệ thống đầy đủ',
                permissions: JSON.stringify({
                    modules: ['*'],
                    actions: ['create', 'read', 'update', 'delete', 'approve', 'lock', 'export', 'import', 'settings']
                })
            },
            {
                id: 2,
                name: 'accountant',
                display_name: 'Kế toán viên',
                description: 'Nhập liệu và xem báo cáo',
                permissions: JSON.stringify({
                    modules: ['general', 'cash', 'inventory', 'asset', 'hr', 'debt', 'revenue', 'expense', 'reports'],
                    actions: ['create', 'read', 'update', 'export']
                })
            },
            {
                id: 3,
                name: 'chief_accountant',
                display_name: 'Kế toán trưởng',
                description: 'Phê duyệt và khóa sổ',
                permissions: JSON.stringify({
                    modules: ['*'],
                    actions: ['create', 'read', 'update', 'delete', 'approve', 'lock', 'export', 'import']
                })
            },
            {
                id: 4,
                name: 'viewer',
                display_name: 'Xem báo cáo',
                description: 'Chỉ xem báo cáo',
                permissions: JSON.stringify({
                    modules: ['reports', 'dashboard'],
                    actions: ['read', 'export']
                })
            }
        ]);
    }

    // ========================================
    // 3. DEFAULT TAX RATES (Biểu thuế)
    // ========================================
    const taxRatesExist = await knex.schema.hasTable('tax_rates');
    if (taxRatesExist) {
        const existingTaxRates = await knex('tax_rates').select('id');
        if (existingTaxRates.length === 0) {
            await knex('tax_rates').insert([
                // VAT Rates (Thuế GTGT)
                { code: 'VAT0', name: 'Thuế GTGT 0%', rate: 0, type: 'VAT', is_default: false },
                { code: 'VAT5', name: 'Thuế GTGT 5%', rate: 5, type: 'VAT', is_default: false },
                { code: 'VAT8', name: 'Thuế GTGT 8%', rate: 8, type: 'VAT', is_default: false },
                { code: 'VAT10', name: 'Thuế GTGT 10%', rate: 10, type: 'VAT', is_default: true },
                { code: 'VATEX', name: 'Không chịu thuế GTGT', rate: 0, type: 'VAT', is_default: false },

                // Withholding Tax (Thuế TNCN)
                { code: 'PIT10', name: 'Thuế TNCN 10%', rate: 10, type: 'PIT', is_default: true },
                { code: 'PIT20', name: 'Thuế TNCN 20%', rate: 20, type: 'PIT', is_default: false },

                // Corporate Income Tax
                { code: 'CIT20', name: 'Thuế TNDN 20%', rate: 20, type: 'CIT', is_default: true }
            ]);
        }
    }

    // ========================================
    // 4. DEFAULT DOCUMENT TYPES
    // ========================================
    const docTypesExist = await knex.schema.hasTable('document_types');
    if (docTypesExist) {
        const existingDocTypes = await knex('document_types').select('id');
        if (existingDocTypes.length === 0) {
            await knex('document_types').insert([
                { code: 'PC', name: 'Phiếu chi', prefix: 'PC', module: 'cash', auto_number: true },
                { code: 'PT', name: 'Phiếu thu', prefix: 'PT', module: 'cash', auto_number: true },
                { code: 'BC', name: 'Báo Có ngân hàng', prefix: 'BC', module: 'cash', auto_number: true },
                { code: 'BN', name: 'Báo Nợ ngân hàng', prefix: 'BN', module: 'cash', auto_number: true },
                { code: 'NK', name: 'Phiếu nhập kho', prefix: 'NK', module: 'inventory', auto_number: true },
                { code: 'XK', name: 'Phiếu xuất kho', prefix: 'XK', module: 'inventory', auto_number: true },
                { code: 'CK', name: 'Phiếu chuyển kho', prefix: 'CK', module: 'inventory', auto_number: true },
                { code: 'HD', name: 'Hóa đơn bán hàng', prefix: 'HD', module: 'revenue', auto_number: true },
                { code: 'MH', name: 'Hóa đơn mua hàng', prefix: 'MH', module: 'expense', auto_number: true },
                { code: 'BL', name: 'Bảng lương', prefix: 'BL', module: 'hr', auto_number: true },
                { code: 'KH', name: 'Bút toán khấu hao', prefix: 'KH', module: 'asset', auto_number: true },
                { code: 'KC', name: 'Bút toán kết chuyển', prefix: 'KC', module: 'general', auto_number: true },
                { code: 'PKT', name: 'Phiếu kế toán', prefix: 'PKT', module: 'general', auto_number: true }
            ]);
        }
    }

    // ========================================
    // 5. DEFAULT EXPENSE CATEGORIES (Khoản mục chi phí)
    // ========================================
    const expenseCatExist = await knex.schema.hasTable('expense_categories');
    if (expenseCatExist) {
        const existingExpCat = await knex('expense_categories').select('id');
        if (existingExpCat.length === 0) {
            await knex('expense_categories').insert([
                // Chi phí nguyên vật liệu trực tiếp
                { code: '621', name: 'Chi phí nguyên vật liệu trực tiếp', expense_type: 'PRODUCTION', account_code: '621', active: true },
                // Chi phí nhân công trực tiếp
                { code: '622', name: 'Chi phí nhân công trực tiếp', expense_type: 'PRODUCTION', account_code: '622', active: true },
                // Chi phí sản xuất chung
                { code: '627', name: 'Chi phí sản xuất chung', expense_type: 'PRODUCTION', account_code: '627', active: true },
                // Chi phí bán hàng
                { code: '641', name: 'Chi phí bán hàng', expense_type: 'SELLING', account_code: '641', active: true },
                // Chi phí quản lý doanh nghiệp
                { code: '642', name: 'Chi phí quản lý doanh nghiệp', expense_type: 'ADMIN', account_code: '642', active: true },
                // Chi phí tài chính
                { code: '635', name: 'Chi phí tài chính', expense_type: 'FINANCIAL', account_code: '635', active: true },
                // Chi phí khác
                { code: '811', name: 'Chi phí khác', expense_type: 'OTHER', account_code: '811', active: true }
            ]);
        }
    }

    // ========================================
    // 6. DEFAULT REVENUE CATEGORIES (Khoản mục doanh thu)
    // ========================================
    const revenueCatExist = await knex.schema.hasTable('revenue_categories');
    if (revenueCatExist) {
        const existingRevCat = await knex('revenue_categories').select('id');
        if (existingRevCat.length === 0) {
            await knex('revenue_categories').insert([
                { code: '5111', name: 'Doanh thu bán hàng hóa', revenue_type: 'GOODS', account_code: '5111', active: true },
                { code: '5112', name: 'Doanh thu bán thành phẩm', revenue_type: 'PRODUCTS', account_code: '5112', active: true },
                { code: '5113', name: 'Doanh thu cung cấp dịch vụ', revenue_type: 'SERVICES', account_code: '5113', active: true },
                { code: '5118', name: 'Doanh thu khác', revenue_type: 'OTHER', account_code: '5118', active: true },
                { code: '515', name: 'Doanh thu hoạt động tài chính', revenue_type: 'FINANCIAL', account_code: '515', active: true },
                { code: '711', name: 'Thu nhập khác', revenue_type: 'OTHER_INCOME', account_code: '711', active: true }
            ]);
        }
    }

    // ========================================
    // 7. DEFAULT ASSET CATEGORIES (Loại TSCĐ)
    // ========================================
    const assetCatExist = await knex.schema.hasTable('asset_categories');
    if (assetCatExist) {
        const existingAssetCat = await knex('asset_categories').select('id');
        if (existingAssetCat.length === 0) {
            await knex('asset_categories').insert([
                // Theo TT 45/2018/TT-BTC về khấu hao TSCĐ
                { code: 'BUILDING', name: 'Nhà cửa, vật kiến trúc', account_code: '2111', depreciation_account: '2141', min_years: 6, max_years: 50 },
                { code: 'MACHINE', name: 'Máy móc, thiết bị', account_code: '2112', depreciation_account: '2142', min_years: 5, max_years: 15 },
                { code: 'VEHICLE', name: 'Phương tiện vận tải', account_code: '2113', depreciation_account: '2143', min_years: 6, max_years: 10 },
                { code: 'EQUIPMENT', name: 'Thiết bị, dụng cụ quản lý', account_code: '2114', depreciation_account: '2144', min_years: 3, max_years: 10 },
                { code: 'LIVESTOCK', name: 'Cây lâu năm, súc vật làm việc', account_code: '2115', depreciation_account: '2145', min_years: 4, max_years: 15 },
                { code: 'INTANGIBLE', name: 'TSCĐ vô hình', account_code: '213', depreciation_account: '2143', min_years: 3, max_years: 20 }
            ]);
        }
    }

    logger.info('[SEED] Default data: System settings, roles, tax rates, document types, categories');
};
