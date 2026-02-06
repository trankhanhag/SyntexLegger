/**
 * Migration: Cleanup Sample Data for Production
 * Xóa tất cả dữ liệu mẫu/mock khỏi database
 *
 * Chạy migration này trước khi đưa vào production:
 * npx knex migrate:latest
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // ========================================
    // 1. XÓA DỮ LIỆU SAMPLE TRONG GENERAL LEDGER
    // ========================================
    await knex('general_ledger')
        .where('origin_staging_id', 'seed')
        .orWhere('id', 'like', 'seed_%')
        .del();

    // ========================================
    // 2. XÓA DỮ LIỆU SAMPLE TRONG STAGING TRANSACTIONS
    // ========================================
    await knex('staging_transactions')
        .where('batch_id', 'batch_init')
        .del();

    // ========================================
    // 3. XÓA SAMPLE VOUCHERS
    // ========================================
    // Xóa voucher items trước (do foreign key)
    await knex('voucher_items')
        .whereIn('voucher_id', function () {
            this.select('id').from('vouchers').where('doc_no', 'like', 'PK000%');
        })
        .del();

    await knex('vouchers')
        .where('doc_no', 'like', 'PK000%')
        .del();

    // ========================================
    // 4. XÓA SAMPLE PARTNERS (giữ lại các đối tác thực)
    // ========================================
    await knex('partners')
        .whereIn('partner_code', ['NCC001', 'NCC002', 'NCC_RISK', 'KH001', 'KH002'])
        .del();

    // ========================================
    // 5. XÓA SAMPLE CCDC ITEMS
    // ========================================
    await knex('ccdc_items')
        .whereIn('id', ['C1', 'C2'])
        .orWhere('code', 'like', 'CC00%')
        .del();

    // ========================================
    // 6. CẬP NHẬT SYSTEM SETTINGS CHO ENTERPRISE
    // ========================================
    await knex('system_settings')
        .where('key', 'accounting_regime')
        .update({ value: 'CIRCULAR_99_2025', description: 'Chế độ kế toán: TT 99/2025/TT-BTC (Doanh nghiệp)' });

    await knex('system_settings')
        .where('key', 'app_brand')
        .update({ value: 'SyntexLegger' });

    // Thêm settings mới nếu chưa có
    const existingSettings = await knex('system_settings').select('key');
    const existingKeys = existingSettings.map(s => s.key);

    const newSettings = [
        { key: 'accounting_regime_effective', value: '2026-01-01', description: 'Ngày hiệu lực TT 99/2025' },
        { key: 'inventory_costing_method', value: 'WEIGHTED_AVERAGE', description: 'PP tính giá HTK: WEIGHTED_AVERAGE, FIFO, SPECIFIC' },
        { key: 'depreciation_method', value: 'STRAIGHT_LINE', description: 'PP khấu hao: STRAIGHT_LINE, DECLINING_BALANCE' },
        { key: 'vat_method', value: 'DEDUCTION', description: 'PP tính thuế GTGT: DEDUCTION (Khấu trừ)' },
        { key: 'default_vat_rate', value: '10', description: 'Thuế suất GTGT mặc định (%)' },
        { key: 'cit_rate', value: '20', description: 'Thuế suất TNDN (%)' }
    ];

    for (const setting of newSettings) {
        if (!existingKeys.includes(setting.key)) {
            await knex('system_settings').insert(setting);
        }
    }

    console.log('[MIGRATION] Sample data cleaned up for production');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Cannot restore sample data - this is intentional
    console.log('[MIGRATION] Sample data cleanup cannot be reversed');
};
