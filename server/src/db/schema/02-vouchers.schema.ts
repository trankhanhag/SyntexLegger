/**
 * Vouchers Schema
 * Tables: vouchers, voucher_items, general_ledger, staging_transactions, allocations
 */

import { Knex } from 'knex';

export async function createVouchersSchema(knex: Knex): Promise<void> {
  // Vouchers (Header) table
  if (!(await knex.schema.hasTable('vouchers'))) {
    await knex.schema.createTable('vouchers', (table) => {
      table.string('id').primary();
      table.string('doc_no').unique();
      table.date('doc_date');
      table.date('post_date');
      table.text('description');
      table.string('type'); // GENERAL, CASH_IN, CASH_OUT, etc.
      table.string('ref_no');
      table.integer('attachments').defaultTo(0);
      table.string('currency').defaultTo('VND');
      table.decimal('fx_rate', 18, 6).defaultTo(1);
      table.decimal('total_amount', 18, 2).defaultTo(0);
      table.string('status').defaultTo('DRAFT'); // DRAFT, POSTED, VOIDED
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at');
      table.string('created_by');
      table.string('updated_by');
    });
  }

  // Voucher Items (Lines) table
  if (!(await knex.schema.hasTable('voucher_items'))) {
    await knex.schema.createTable('voucher_items', (table) => {
      table.increments('id').primary();
      table.string('voucher_id').references('id').inTable('vouchers').onDelete('CASCADE');
      table.integer('line_no');
      table.text('description');
      table.string('debit_acc');
      table.string('credit_acc');
      table.decimal('amount', 18, 2).defaultTo(0);
      table.decimal('quantity', 18, 4).defaultTo(0);
      table.decimal('unit_price', 18, 2).defaultTo(0);
      table.decimal('cost_price', 18, 2).defaultTo(0);
      table.string('input_unit');
      table.decimal('input_quantity', 18, 4).defaultTo(0);
      table.string('dim1');
      table.string('dim2');
      table.string('dim3');
      table.string('dim4');
      table.string('dim5');
      table.string('project_code');
      table.string('contract_code');
      table.string('debt_note');
      table.string('partner_code');
      table.string('fund_source_id');
      table.string('item_code');
      table.string('sub_item_code');
      table.string('budget_estimate_id');
    });
  }

  // General Ledger table
  if (!(await knex.schema.hasTable('general_ledger'))) {
    await knex.schema.createTable('general_ledger', (table) => {
      table.string('id').primary();
      table.date('trx_date');
      table.timestamp('posted_at');
      table.string('doc_no');
      table.text('description');
      table.string('account_code');
      table.string('reciprocal_acc');
      table.decimal('debit_amount', 18, 2).defaultTo(0);
      table.decimal('credit_amount', 18, 2).defaultTo(0);
      table.string('origin_staging_id');
      table.string('partner_code');
      table.string('item_code');
      table.string('sub_item_code');
      table.string('voucher_id');

      // Indexes for performance
      table.index(['account_code', 'trx_date']);
      table.index(['doc_no']);
      table.index(['partner_code']);
    });
  }

  // Staging Transactions table
  if (!(await knex.schema.hasTable('staging_transactions'))) {
    await knex.schema.createTable('staging_transactions', (table) => {
      table.string('id').primary();
      table.string('batch_id');
      table.integer('row_index');
      table.date('trx_date');
      table.string('doc_no');
      table.text('description');
      table.string('debit_acc');
      table.string('credit_acc');
      table.decimal('amount', 18, 2);
      table.string('partner_code');
      table.string('item_code');
      table.string('sub_item_code');
      table.integer('is_valid').defaultTo(0);
      table.text('error_log');
      table.text('raw_data');
    });
  }

  // Allocations table (payment matching)
  if (!(await knex.schema.hasTable('allocations'))) {
    await knex.schema.createTable('allocations', (table) => {
      table.string('id').primary();
      table.string('payment_voucher_id');
      table.string('invoice_voucher_id');
      table.decimal('allocated_amount', 18, 2);
      table.timestamp('allocated_at').defaultTo(knex.fn.now());
      table.string('allocated_by');
    });
  }
}

export async function seedVouchersData(knex: Knex): Promise<void> {
  // Seed sample voucher if empty
  const voucherCount = await knex('vouchers').count('* as count').first();
  if (voucherCount && Number(voucherCount.count) === 0) {
    const voucherId = `v_${Date.now()}`;
    await knex('vouchers').insert({
      id: voucherId,
      doc_no: 'PK0001',
      doc_date: '2024-01-01',
      post_date: '2024-01-01',
      description: 'Chứng từ mẫu',
      type: 'GENERAL',
      total_amount: 15000000,
      status: 'POSTED',
      created_at: new Date().toISOString()
    });

    await knex('voucher_items').insert({
      voucher_id: voucherId,
      line_no: 1,
      description: 'Kết chuyển thuế GTGT',
      debit_acc: '3331',
      credit_acc: '1331',
      amount: 15000000
    });
  }
}
