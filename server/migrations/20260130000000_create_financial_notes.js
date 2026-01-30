/**
 * Migration: Create financial_notes table
 * Thuyết minh Báo cáo Tài chính (B09-DN) theo TT 99/2025/TT-BTC
 */

exports.up = function(knex) {
    return knex.schema
        // Bảng chính lưu các mục thuyết minh
        .createTable('financial_notes', function(table) {
            table.increments('id').primary();
            table.string('note_code', 20).notNullable().unique(); // Mã thuyết minh: I, II, III, IV.1, IV.2...
            table.string('note_title', 500).notNullable(); // Tiêu đề thuyết minh
            table.text('note_content'); // Nội dung chi tiết (có thể chứa HTML)
            table.string('section', 100); // Phân loại: GENERAL, ASSETS, LIABILITIES, EQUITY, INCOME, EXPENSE, OTHER
            table.string('related_account', 50); // TK liên quan (nếu có): 111, 112, 211...
            table.string('related_bs_code', 20); // Mã trên BCĐKT: 110, 120, 211...
            table.string('related_pnl_code', 20); // Mã trên BCKQKD: 01, 11, 21...
            table.integer('parent_id').unsigned().references('id').inTable('financial_notes').onDelete('SET NULL');
            table.integer('level').defaultTo(0); // Cấp độ: 0=root, 1, 2, 3...
            table.integer('order_seq').defaultTo(0); // Thứ tự hiển thị
            table.boolean('is_required').defaultTo(false); // Bắt buộc theo quy định
            table.boolean('is_active').defaultTo(true);
            table.timestamps(true, true);
        })
        // Bảng lưu giá trị thuyết minh theo kỳ
        .createTable('financial_note_values', function(table) {
            table.increments('id').primary();
            table.integer('note_id').unsigned().notNullable().references('id').inTable('financial_notes').onDelete('CASCADE');
            table.integer('fiscal_year').notNullable(); // Năm tài chính
            table.integer('period').defaultTo(0); // 0=cả năm, 1-12=tháng, 1-4=quý
            table.string('period_type', 10).defaultTo('YEAR'); // YEAR, QUARTER, MONTH
            table.decimal('current_value', 20, 2).defaultTo(0); // Giá trị kỳ này
            table.decimal('previous_value', 20, 2).defaultTo(0); // Giá trị kỳ trước
            table.text('explanation'); // Giải thích biến động
            table.text('additional_info'); // Thông tin bổ sung
            table.timestamps(true, true);

            table.unique(['note_id', 'fiscal_year', 'period', 'period_type']);
        });
};

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('financial_note_values')
        .dropTableIfExists('financial_notes');
};
