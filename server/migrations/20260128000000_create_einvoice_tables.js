/**
 * E-Invoice Integration Tables Migration
 * SyntexLegger - Store e-invoice provider configs and imported invoices
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        // Table 1: E-Invoice Providers Configuration
        .createTableIfNotExists('einvoice_providers', (table) => {
            table.increments('id').primary();
            table.string('code', 50).unique().notNullable(); // 'vnpt', 'viettel', 'bkav', 'misa'
            table.string('name', 255).notNullable(); // 'VNPT Invoice', 'Viettel S-Invoice'
            table.boolean('is_active').defaultTo(false);
            table.json('config'); // { apiUrl, username, password, token, etc. }
            table.boolean('demo_mode').defaultTo(true);
            table.timestamp('last_sync_at');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at');

            table.index('code');
            table.index('is_active');
        })

        // Table 2: Imported E-Invoices
        .createTableIfNotExists('einvoice_imports', (table) => {
            table.increments('id').primary();
            table.integer('provider_id').unsigned().references('id').inTable('einvoice_providers').onDelete('SET NULL');
            table.string('invoice_id', 100); // ID from provider
            table.string('invoice_no', 50); // Invoice number
            table.string('invoice_series', 20); // Invoice series/symbol
            table.date('invoice_date');
            table.string('seller_tax_code', 20);
            table.string('seller_name', 255);
            table.string('buyer_tax_code', 20);
            table.string('buyer_name', 255);
            table.decimal('total_before_tax', 18, 2);
            table.decimal('vat_amount', 18, 2);
            table.decimal('total_amount', 18, 2);
            table.string('invoice_type', 20); // 'sale', 'purchase', 'adjustment'
            table.string('status', 20).defaultTo('pending'); // 'pending', 'matched', 'imported', 'ignored'
            table.json('raw_data'); // Original data from API
            table.json('items'); // Invoice line items
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.index('invoice_no');
            table.index('invoice_date');
            table.index('seller_tax_code');
            table.index('buyer_tax_code');
            table.index('status');
            table.unique(['provider_id', 'invoice_id']);
        })

        // Table 3: Sync Logs
        .createTableIfNotExists('einvoice_sync_logs', (table) => {
            table.increments('id').primary();
            table.integer('provider_id').unsigned().references('id').inTable('einvoice_providers').onDelete('SET NULL');
            table.string('sync_type', 20); // 'manual', 'scheduled'
            table.date('from_date');
            table.date('to_date');
            table.integer('total_fetched').defaultTo(0);
            table.integer('total_new').defaultTo(0);
            table.integer('total_errors').defaultTo(0);
            table.json('error_details');
            table.timestamp('started_at');
            table.timestamp('completed_at');
            table.integer('created_by').unsigned();
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.index('provider_id');
            table.index('started_at');
        })

        // Table 4: Invoice-Voucher Matches
        .createTableIfNotExists('einvoice_voucher_matches', (table) => {
            table.increments('id').primary();
            table.integer('einvoice_id').unsigned().references('id').inTable('einvoice_imports').onDelete('CASCADE');
            table.integer('voucher_id').unsigned();
            table.string('match_type', 20); // 'auto', 'manual'
            table.decimal('match_score', 5, 2); // 0-100 confidence score
            table.timestamp('matched_at');
            table.integer('matched_by').unsigned();
            table.text('notes');
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.index('einvoice_id');
            table.index('voucher_id');
            table.unique(['einvoice_id', 'voucher_id']);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('einvoice_voucher_matches')
        .dropTableIfExists('einvoice_sync_logs')
        .dropTableIfExists('einvoice_imports')
        .dropTableIfExists('einvoice_providers');
};
