/**
 * Initial Database Schema Migration
 * SyntexLegger - Thông tư 99/2025/TT-BTC (Doanh nghiệp)
 * 
 * Creates all core tables for accounting system
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Users table
    const hasUsers = await knex.schema.hasTable('users');
    if (!hasUsers) {
        await knex.schema.createTable('users', (table) => {
            table.increments('id').primary();
            table.string('username', 100).notNullable().unique();
            table.string('password', 255).notNullable();
            table.string('full_name', 200);
            table.string('email', 200);
            table.string('role', 50).defaultTo('user');
            table.integer('company_id').defaultTo(1);
            table.boolean('is_active').defaultTo(true);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
        });
    }

    // Chart of Accounts
    const hasCOA = await knex.schema.hasTable('chart_of_accounts');
    if (!hasCOA) {
        await knex.schema.createTable('chart_of_accounts', (table) => {
            table.string('account_code', 20).primary();
            table.string('account_name', 255).notNullable();
            table.string('parent_account', 20);
            table.integer('level').defaultTo(1);
            table.string('category', 100);
            table.string('type', 50); // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
            table.string('tt99_class', 50); // Loại 1-9 theo TT99
            table.boolean('is_parent').defaultTo(false);
            table.boolean('is_active').defaultTo(true);
            table.integer('is_off_balance').defaultTo(0);
        });
    }

    // Vouchers (Chứng từ)
    const hasVouchers = await knex.schema.hasTable('vouchers');
    if (!hasVouchers) {
        await knex.schema.createTable('vouchers', (table) => {
            table.string('id', 50).primary();
            table.string('doc_no', 50).notNullable();
            table.date('doc_date').notNullable();
            table.date('post_date');
            table.text('description');
            table.string('type', 50); // GENERAL, CASH_IN, CASH_OUT, BANK_IN, BANK_OUT, etc.
            table.decimal('total_amount', 18, 2).defaultTo(0);
            table.string('status', 20).defaultTo('draft'); // draft, posted, cancelled
            table.string('org_doc_no', 50);
            table.date('org_doc_date');
            table.integer('company_id').defaultTo(1);
            table.string('created_by', 100);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());

            table.index('doc_date');
            table.index('type');
            table.index('status');
            table.index('company_id');
        });
    }

    // Voucher Items (Chi tiết chứng từ)
    const hasVoucherItems = await knex.schema.hasTable('voucher_items');
    if (!hasVoucherItems) {
        await knex.schema.createTable('voucher_items', (table) => {
            table.string('id', 50).primary();
            table.string('voucher_id', 50).notNullable();
            table.integer('line_no').defaultTo(1);
            table.text('description');
            table.string('debit_account', 20);
            table.string('credit_account', 20);
            table.decimal('amount', 18, 2).defaultTo(0);
            table.string('partner_code', 50);
            table.string('project_code', 50);
            table.string('contract_code', 50);
            table.string('debt_note', 100);
            table.string('dim1', 50);
            table.string('dim2', 50);
            table.string('dim3', 50);
            table.string('dim4', 50);
            table.string('dim5', 50);
            table.string('product_code', 50);
            table.decimal('quantity', 18, 4);
            table.decimal('unit_price', 18, 4);
            table.string('currency', 10).defaultTo('VND');
            table.decimal('fx_rate', 18, 6).defaultTo(1);
            table.decimal('fx_amount', 18, 2);

            table.foreign('voucher_id').references('vouchers.id').onDelete('CASCADE');
            table.index('voucher_id');
            table.index('debit_account');
            table.index('credit_account');
        });
    }

    // Partners (Đối tác)
    const hasPartners = await knex.schema.hasTable('partners');
    if (!hasPartners) {
        await knex.schema.createTable('partners', (table) => {
            table.string('partner_code', 50).primary();
            table.string('partner_name', 255).notNullable();
            table.string('tax_code', 50);
            table.text('address');
            table.string('phone', 50);
            table.string('email', 200);
            table.string('bank_account', 50);
            table.string('bank_name', 200);
            table.string('type', 50); // customer, supplier, employee, other
            table.integer('company_id').defaultTo(1);
            table.boolean('is_active').defaultTo(true);
        });
    }

    // System Settings
    const hasSettings = await knex.schema.hasTable('system_settings');
    if (!hasSettings) {
        await knex.schema.createTable('system_settings', (table) => {
            table.string('key', 100).primary();
            table.text('value');
            table.string('description', 500);
            table.timestamp('updated_at').defaultTo(knex.fn.now());
        });
    }

    // Fixed Assets (Tài sản cố định)
    const hasAssets = await knex.schema.hasTable('fixed_assets');
    if (!hasAssets) {
        await knex.schema.createTable('fixed_assets', (table) => {
            table.string('id', 50).primary();
            table.string('asset_code', 50).notNullable().unique();
            table.string('asset_name', 255).notNullable();
            table.string('asset_category', 100);
            table.string('department', 100);
            table.date('purchase_date');
            table.date('usage_date');
            table.decimal('original_value', 18, 2).defaultTo(0);
            table.decimal('accumulated_depreciation', 18, 2).defaultTo(0);
            table.decimal('net_book_value', 18, 2).defaultTo(0);
            table.integer('useful_life_months');
            table.decimal('monthly_depreciation', 18, 2);
            table.string('asset_condition', 50); // good, fair, poor, disposed
            table.integer('company_id').defaultTo(1);
            table.boolean('is_active').defaultTo(true);
            table.timestamp('created_at').defaultTo(knex.fn.now());
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('voucher_items')
        .dropTableIfExists('vouchers')
        .dropTableIfExists('partners')
        .dropTableIfExists('fixed_assets')
        .dropTableIfExists('chart_of_accounts')
        .dropTableIfExists('system_settings')
        .dropTableIfExists('users');
};
