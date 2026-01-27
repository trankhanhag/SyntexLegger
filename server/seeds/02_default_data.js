/**
 * Seed: System Settings & Default Data
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
    // System Settings
    await knex('system_settings').del();
    await knex('system_settings').insert([
        { key: 'accounting_regime', value: 'CIRCULAR_24_2024', description: 'Chế độ kế toán áp dụng' },
        { key: 'app_brand', value: 'SyntexHCSN', description: 'Tên ứng dụng' },
        { key: 'fiscal_year_start', value: '01-01', description: 'Ngày bắt đầu năm tài chính (MM-DD)' },
        { key: 'default_currency', value: 'VND', description: 'Đơn vị tiền tệ mặc định' },
        { key: 'locked_until_date', value: '', description: 'Ngày khóa sổ kế toán' },
        { key: 'auto_doc_no', value: 'true', description: 'Tự động tạo số chứng từ' },
        { key: 'require_balanced_voucher', value: 'true', description: 'Yêu cầu cân bằng Nợ/Có' }
    ]);

    // Default Admin User
    await knex('users').del();
    await knex('users').insert([
        {
            username: 'admin',
            password: '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // placeholder, should be hashed
            full_name: 'Quản trị hệ thống',
            email: 'admin@syntex.vn',
            role: 'admin',
            company_id: 1,
            is_active: true
        }
    ]);

    console.log('Seeded system settings and default user');
};
