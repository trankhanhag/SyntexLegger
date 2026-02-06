/**
 * Treasury Imports Table Migration
 * SyntexLegger - Store imported data from KBNN
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTableIfNotExists('treasury_imports', (table) => {
            table.string('id', 100).primary();
            table.date('import_date');
            table.date('transaction_date');
            table.string('type', 50);
            table.decimal('amount', 18, 2);
            table.text('description');
            table.string('budget_code', 50);
            table.string('chapter_code', 20);
            table.string('category_code', 20);
            table.string('status', 50);
            table.string('tabmis_ref', 100);
            table.string('reconcile_status', 50).defaultTo('pending'); // pending, matched, discrepancy
            table.string('local_voucher_id', 50);
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.index('transaction_date');
            table.index('reconcile_status');
        })

        .createTableIfNotExists('reconciliation_logs', (table) => {
            table.increments('id').primary();
            table.date('reconcile_date');
            table.date('period_from');
            table.date('period_to');
            table.integer('total_local');
            table.integer('total_tabmis');
            table.integer('matched_count');
            table.integer('discrepancy_count');
            table.text('discrepancies_json');
            table.string('status', 50);
            table.string('created_by', 100);
            table.timestamp('created_at').defaultTo(knex.fn.now());
        })

        .createTableIfNotExists('payment_orders', (table) => {
            table.string('id', 100).primary();
            table.string('order_type', 50); // THUC_CHI, TAM_UNG
            table.decimal('amount', 18, 2);
            table.text('description');
            table.string('beneficiary_name', 255);
            table.string('beneficiary_account', 50);
            table.string('beneficiary_bank', 255);
            table.string('budget_code', 50);
            table.string('chapter_code', 20);
            table.string('category_code', 20);
            table.string('reference_doc', 100);
            table.date('request_date');
            table.string('status', 50).defaultTo('draft'); // draft, submitted, processing, approved, rejected
            table.string('kbnn_order_id', 100);
            table.timestamp('submitted_at');
            table.timestamp('processed_at');
            table.text('response_message');
            table.string('created_by', 100);
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.index('status');
            table.index('request_date');
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('payment_orders')
        .dropTableIfExists('reconciliation_logs')
        .dropTableIfExists('treasury_imports');
};
