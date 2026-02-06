/**
 * Receivables & Payables Schema
 * Tables: receivables, payables, receivable_payments, payable_payments,
 *         temporary_advances, budget_advances
 */

import { Knex } from 'knex';

export async function createReceivablesPayablesSchema(knex: Knex): Promise<void> {
  // Receivables table
  if (!(await knex.schema.hasTable('receivables'))) {
    await knex.schema.createTable('receivables', (table) => {
      table.string('id').primary();
      table.string('partner_code');
      table.string('account_code');
      table.string('doc_no');
      table.date('doc_date');
      table.date('due_date');
      table.decimal('original_amount', 18, 2);
      table.decimal('paid_amount', 18, 2).defaultTo(0);
      table.decimal('balance', 18, 2);
      table.string('currency').defaultTo('VND');
      table.text('description');
      table.string('status').defaultTo('OPEN');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Payables table
  if (!(await knex.schema.hasTable('payables'))) {
    await knex.schema.createTable('payables', (table) => {
      table.string('id').primary();
      table.string('partner_code');
      table.string('account_code');
      table.string('doc_no');
      table.date('doc_date');
      table.date('due_date');
      table.decimal('original_amount', 18, 2);
      table.decimal('paid_amount', 18, 2).defaultTo(0);
      table.decimal('balance', 18, 2);
      table.string('currency').defaultTo('VND');
      table.text('description');
      table.string('status').defaultTo('OPEN');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Receivable Payments table
  if (!(await knex.schema.hasTable('receivable_payments'))) {
    await knex.schema.createTable('receivable_payments', (table) => {
      table.string('id').primary();
      table.string('receivable_id');
      table.string('voucher_id');
      table.date('payment_date');
      table.decimal('amount', 18, 2);
      table.string('payment_method');
      table.text('note');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Payable Payments table
  if (!(await knex.schema.hasTable('payable_payments'))) {
    await knex.schema.createTable('payable_payments', (table) => {
      table.string('id').primary();
      table.string('payable_id');
      table.string('voucher_id');
      table.date('payment_date');
      table.decimal('amount', 18, 2);
      table.string('payment_method');
      table.text('note');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Temporary Advances (Employee Advances) table
  if (!(await knex.schema.hasTable('temporary_advances'))) {
    await knex.schema.createTable('temporary_advances', (table) => {
      table.string('id').primary();
      table.string('employee_id');
      table.date('advance_date');
      table.decimal('amount', 18, 2);
      table.decimal('settled_amount', 18, 2).defaultTo(0);
      table.decimal('balance', 18, 2);
      table.text('purpose');
      table.date('due_date');
      table.string('voucher_id');
      table.string('status').defaultTo('PENDING');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Budget Advances table
  if (!(await knex.schema.hasTable('budget_advances'))) {
    await knex.schema.createTable('budget_advances', (table) => {
      table.string('id').primary();
      table.string('fund_source_id');
      table.string('budget_estimate_id');
      table.date('advance_date');
      table.decimal('amount', 18, 2);
      table.decimal('settled_amount', 18, 2).defaultTo(0);
      table.decimal('balance', 18, 2);
      table.text('purpose');
      table.string('voucher_id');
      table.string('status').defaultTo('PENDING');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
}

export async function seedReceivablesPayablesData(_knex: Knex): Promise<void> {
  // No seed data needed for receivables/payables
  // These are created through normal operations
}
