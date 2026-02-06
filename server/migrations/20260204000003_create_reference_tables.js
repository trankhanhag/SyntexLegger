/**
 * Migration: Create Reference/Lookup Tables
 * Standardizes status values and provides centralized reference data
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // ========================================
    // 1. STATUS TYPES TABLE
    // ========================================
    const hasStatusTypes = await knex.schema.hasTable('status_types');
    if (!hasStatusTypes) {
        await knex.schema.createTable('status_types', (table) => {
            table.string('id', 50).primary();
            table.string('entity_type', 50).notNullable(); // voucher, employee, asset, etc.
            table.string('status_code', 30).notNullable();
            table.string('status_name', 100).notNullable();
            table.string('status_name_vi', 100);
            table.string('description', 500);
            table.integer('sort_order').defaultTo(0);
            table.string('color_code', 20); // For UI display
            table.boolean('is_active').defaultTo(true);
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.unique(['entity_type', 'status_code']);
            table.index('entity_type');
        });

        // Insert default status values
        await knex('status_types').insert([
            // Voucher statuses
            { id: 'v_draft', entity_type: 'voucher', status_code: 'DRAFT', status_name: 'Draft', status_name_vi: 'Nháp', color_code: '#6B7280', sort_order: 1 },
            { id: 'v_pending', entity_type: 'voucher', status_code: 'PENDING', status_name: 'Pending Approval', status_name_vi: 'Chờ duyệt', color_code: '#F59E0B', sort_order: 2 },
            { id: 'v_approved', entity_type: 'voucher', status_code: 'APPROVED', status_name: 'Approved', status_name_vi: 'Đã duyệt', color_code: '#10B981', sort_order: 3 },
            { id: 'v_posted', entity_type: 'voucher', status_code: 'POSTED', status_name: 'Posted', status_name_vi: 'Đã ghi sổ', color_code: '#3B82F6', sort_order: 4 },
            { id: 'v_voided', entity_type: 'voucher', status_code: 'VOIDED', status_name: 'Voided', status_name_vi: 'Đã hủy', color_code: '#EF4444', sort_order: 5 },

            // Employee statuses
            { id: 'e_active', entity_type: 'employee', status_code: 'ACTIVE', status_name: 'Active', status_name_vi: 'Đang làm việc', color_code: '#10B981', sort_order: 1 },
            { id: 'e_onleave', entity_type: 'employee', status_code: 'ON_LEAVE', status_name: 'On Leave', status_name_vi: 'Nghỉ phép', color_code: '#F59E0B', sort_order: 2 },
            { id: 'e_resigned', entity_type: 'employee', status_code: 'RESIGNED', status_name: 'Resigned', status_name_vi: 'Đã nghỉ việc', color_code: '#6B7280', sort_order: 3 },
            { id: 'e_terminated', entity_type: 'employee', status_code: 'TERMINATED', status_name: 'Terminated', status_name_vi: 'Chấm dứt HĐ', color_code: '#EF4444', sort_order: 4 },

            // Asset statuses
            { id: 'a_active', entity_type: 'asset', status_code: 'ACTIVE', status_name: 'In Use', status_name_vi: 'Đang sử dụng', color_code: '#10B981', sort_order: 1 },
            { id: 'a_maintenance', entity_type: 'asset', status_code: 'MAINTENANCE', status_name: 'Under Maintenance', status_name_vi: 'Đang bảo trì', color_code: '#F59E0B', sort_order: 2 },
            { id: 'a_disposed', entity_type: 'asset', status_code: 'DISPOSED', status_name: 'Disposed', status_name_vi: 'Đã thanh lý', color_code: '#6B7280', sort_order: 3 },
            { id: 'a_damaged', entity_type: 'asset', status_code: 'DAMAGED', status_name: 'Damaged', status_name_vi: 'Hư hỏng', color_code: '#EF4444', sort_order: 4 },

            // Contract statuses
            { id: 'c_draft', entity_type: 'contract', status_code: 'DRAFT', status_name: 'Draft', status_name_vi: 'Nháp', color_code: '#6B7280', sort_order: 1 },
            { id: 'c_active', entity_type: 'contract', status_code: 'ACTIVE', status_name: 'Active', status_name_vi: 'Đang hiệu lực', color_code: '#10B981', sort_order: 2 },
            { id: 'c_completed', entity_type: 'contract', status_code: 'COMPLETED', status_name: 'Completed', status_name_vi: 'Đã hoàn thành', color_code: '#3B82F6', sort_order: 3 },
            { id: 'c_cancelled', entity_type: 'contract', status_code: 'CANCELLED', status_name: 'Cancelled', status_name_vi: 'Đã hủy', color_code: '#EF4444', sort_order: 4 },

            // Project statuses
            { id: 'p_planning', entity_type: 'project', status_code: 'PLANNING', status_name: 'Planning', status_name_vi: 'Lập kế hoạch', color_code: '#6B7280', sort_order: 1 },
            { id: 'p_inprogress', entity_type: 'project', status_code: 'IN_PROGRESS', status_name: 'In Progress', status_name_vi: 'Đang thực hiện', color_code: '#3B82F6', sort_order: 2 },
            { id: 'p_onhold', entity_type: 'project', status_code: 'ON_HOLD', status_name: 'On Hold', status_name_vi: 'Tạm dừng', color_code: '#F59E0B', sort_order: 3 },
            { id: 'p_completed', entity_type: 'project', status_code: 'COMPLETED', status_name: 'Completed', status_name_vi: 'Hoàn thành', color_code: '#10B981', sort_order: 4 },
            { id: 'p_cancelled', entity_type: 'project', status_code: 'CANCELLED', status_name: 'Cancelled', status_name_vi: 'Đã hủy', color_code: '#EF4444', sort_order: 5 },

            // AR/AP statuses
            { id: 'debt_open', entity_type: 'debt', status_code: 'OPEN', status_name: 'Open', status_name_vi: 'Còn nợ', color_code: '#F59E0B', sort_order: 1 },
            { id: 'debt_partial', entity_type: 'debt', status_code: 'PARTIAL', status_name: 'Partially Paid', status_name_vi: 'Thanh toán một phần', color_code: '#3B82F6', sort_order: 2 },
            { id: 'debt_paid', entity_type: 'debt', status_code: 'PAID', status_name: 'Paid', status_name_vi: 'Đã thanh toán', color_code: '#10B981', sort_order: 3 },
            { id: 'debt_overdue', entity_type: 'debt', status_code: 'OVERDUE', status_name: 'Overdue', status_name_vi: 'Quá hạn', color_code: '#EF4444', sort_order: 4 },

            // Approval statuses
            { id: 'apr_pending', entity_type: 'approval', status_code: 'PENDING', status_name: 'Pending', status_name_vi: 'Chờ duyệt', color_code: '#F59E0B', sort_order: 1 },
            { id: 'apr_approved', entity_type: 'approval', status_code: 'APPROVED', status_name: 'Approved', status_name_vi: 'Đã duyệt', color_code: '#10B981', sort_order: 2 },
            { id: 'apr_rejected', entity_type: 'approval', status_code: 'REJECTED', status_name: 'Rejected', status_name_vi: 'Từ chối', color_code: '#EF4444', sort_order: 3 },
        ]);
    }

    // ========================================
    // 2. DOCUMENT TYPES TABLE (if not exists)
    // ========================================
    const hasDocTypes = await knex.schema.hasTable('document_types');
    if (!hasDocTypes) {
        await knex.schema.createTable('document_types', (table) => {
            table.string('id', 50).primary();
            table.string('code', 20).notNullable().unique();
            table.string('name', 100).notNullable();
            table.string('name_vi', 100);
            table.string('prefix', 10);
            table.string('module', 50); // cash, inventory, asset, hr, etc.
            table.boolean('auto_number').defaultTo(true);
            table.string('number_format', 50).defaultTo('{PREFIX}{YYYY}{MM}-{SEQ:4}');
            table.integer('current_seq').defaultTo(0);
            table.boolean('is_active').defaultTo(true);
            table.timestamp('created_at').defaultTo(knex.fn.now());
        });

        // Insert default document types
        await knex('document_types').insert([
            { id: 'dt_pc', code: 'PC', name: 'Cash Payment', name_vi: 'Phiếu chi', prefix: 'PC', module: 'cash' },
            { id: 'dt_pt', code: 'PT', name: 'Cash Receipt', name_vi: 'Phiếu thu', prefix: 'PT', module: 'cash' },
            { id: 'dt_bc', code: 'BC', name: 'Bank Credit', name_vi: 'Báo Có ngân hàng', prefix: 'BC', module: 'cash' },
            { id: 'dt_bn', code: 'BN', name: 'Bank Debit', name_vi: 'Báo Nợ ngân hàng', prefix: 'BN', module: 'cash' },
            { id: 'dt_nk', code: 'NK', name: 'Goods Receipt', name_vi: 'Phiếu nhập kho', prefix: 'NK', module: 'inventory' },
            { id: 'dt_xk', code: 'XK', name: 'Goods Issue', name_vi: 'Phiếu xuất kho', prefix: 'XK', module: 'inventory' },
            { id: 'dt_ck', code: 'CK', name: 'Stock Transfer', name_vi: 'Phiếu chuyển kho', prefix: 'CK', module: 'inventory' },
            { id: 'dt_hd', code: 'HD', name: 'Sales Invoice', name_vi: 'Hóa đơn bán hàng', prefix: 'HD', module: 'revenue' },
            { id: 'dt_mh', code: 'MH', name: 'Purchase Invoice', name_vi: 'Hóa đơn mua hàng', prefix: 'MH', module: 'expense' },
            { id: 'dt_bl', code: 'BL', name: 'Payroll', name_vi: 'Bảng lương', prefix: 'BL', module: 'hr' },
            { id: 'dt_kh', code: 'KH', name: 'Depreciation', name_vi: 'Bút toán khấu hao', prefix: 'KH', module: 'asset' },
            { id: 'dt_kc', code: 'KC', name: 'Closing Entry', name_vi: 'Bút toán kết chuyển', prefix: 'KC', module: 'general' },
            { id: 'dt_pkt', code: 'PKT', name: 'Journal Voucher', name_vi: 'Phiếu kế toán', prefix: 'PKT', module: 'general' },
        ]);
    }

    // ========================================
    // 3. CURRENCY TABLE
    // ========================================
    const hasCurrencies = await knex.schema.hasTable('currencies');
    if (!hasCurrencies) {
        await knex.schema.createTable('currencies', (table) => {
            table.string('code', 3).primary();
            table.string('name', 100).notNullable();
            table.string('symbol', 10);
            table.integer('decimal_places').defaultTo(2);
            table.decimal('exchange_rate', 18, 6).defaultTo(1);
            table.date('rate_date');
            table.boolean('is_base').defaultTo(false);
            table.boolean('is_active').defaultTo(true);
            table.timestamp('updated_at').defaultTo(knex.fn.now());
        });

        // Insert default currencies
        await knex('currencies').insert([
            { code: 'VND', name: 'Việt Nam Đồng', symbol: '₫', decimal_places: 0, exchange_rate: 1, is_base: true },
            { code: 'USD', name: 'US Dollar', symbol: '$', decimal_places: 2, exchange_rate: 25000 },
            { code: 'EUR', name: 'Euro', symbol: '€', decimal_places: 2, exchange_rate: 27000 },
            { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimal_places: 0, exchange_rate: 170 },
            { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimal_places: 2, exchange_rate: 3500 },
        ]);
    }

    // ========================================
    // 4. UNITS OF MEASURE TABLE
    // ========================================
    const hasUnits = await knex.schema.hasTable('units_of_measure');
    if (!hasUnits) {
        await knex.schema.createTable('units_of_measure', (table) => {
            table.string('code', 20).primary();
            table.string('name', 100).notNullable();
            table.string('name_vi', 100);
            table.string('category', 50); // quantity, weight, length, volume, time
            table.decimal('conversion_factor', 18, 6).defaultTo(1);
            table.string('base_unit', 20); // Reference to base unit in same category
            table.boolean('is_active').defaultTo(true);
        });

        // Insert default units
        await knex('units_of_measure').insert([
            // Quantity
            { code: 'PCS', name: 'Piece', name_vi: 'Cái', category: 'quantity' },
            { code: 'SET', name: 'Set', name_vi: 'Bộ', category: 'quantity' },
            { code: 'BOX', name: 'Box', name_vi: 'Hộp', category: 'quantity' },
            { code: 'PKG', name: 'Package', name_vi: 'Gói', category: 'quantity' },
            // Weight
            { code: 'KG', name: 'Kilogram', name_vi: 'Kg', category: 'weight', conversion_factor: 1 },
            { code: 'G', name: 'Gram', name_vi: 'Gram', category: 'weight', conversion_factor: 0.001, base_unit: 'KG' },
            { code: 'TON', name: 'Ton', name_vi: 'Tấn', category: 'weight', conversion_factor: 1000, base_unit: 'KG' },
            // Length
            { code: 'M', name: 'Meter', name_vi: 'Mét', category: 'length', conversion_factor: 1 },
            { code: 'CM', name: 'Centimeter', name_vi: 'Cm', category: 'length', conversion_factor: 0.01, base_unit: 'M' },
            // Volume
            { code: 'L', name: 'Liter', name_vi: 'Lít', category: 'volume', conversion_factor: 1 },
            { code: 'ML', name: 'Milliliter', name_vi: 'Ml', category: 'volume', conversion_factor: 0.001, base_unit: 'L' },
            // Time
            { code: 'HR', name: 'Hour', name_vi: 'Giờ', category: 'time' },
            { code: 'DAY', name: 'Day', name_vi: 'Ngày', category: 'time' },
            { code: 'MTH', name: 'Month', name_vi: 'Tháng', category: 'time' },
        ]);
    }

    console.log('[MIGRATION] Reference tables created and populated');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('units_of_measure');
    await knex.schema.dropTableIfExists('currencies');
    await knex.schema.dropTableIfExists('document_types');
    await knex.schema.dropTableIfExists('status_types');

    console.log('[MIGRATION] Reference tables dropped');
};
