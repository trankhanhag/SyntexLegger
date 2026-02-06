/**
 * Audit & Compliance Schema
 * Tables: audit_trail, audit_sessions, audit_anomalies, reconciliation_records
 */

import { Knex } from 'knex';

export async function createAuditComplianceSchema(knex: Knex): Promise<void> {
  // Audit Trail table
  if (!(await knex.schema.hasTable('audit_trail'))) {
    await knex.schema.createTable('audit_trail', (table) => {
      table.string('id').primary();
      table.integer('user_id');
      table.string('username');
      table.string('action'); // CREATE, UPDATE, DELETE, POST, VOID, LOGIN, LOGOUT
      table.string('entity_type');
      table.string('entity_id');
      table.text('old_value');
      table.text('new_value');
      table.string('ip_address');
      table.text('user_agent');
      table.timestamp('created_at').defaultTo(knex.fn.now());

      // Indexes for performance
      table.index(['entity_type', 'entity_id']);
      table.index(['user_id', 'created_at']);
      table.index(['action']);
    });
  }

  // Audit Sessions table
  if (!(await knex.schema.hasTable('audit_sessions'))) {
    await knex.schema.createTable('audit_sessions', (table) => {
      table.string('id').primary();
      table.integer('user_id');
      table.string('username');
      table.string('session_token');
      table.string('ip_address');
      table.text('user_agent');
      table.timestamp('login_at').defaultTo(knex.fn.now());
      table.timestamp('logout_at');
      table.timestamp('last_activity');
      table.string('status').defaultTo('ACTIVE');
    });
  }

  // Audit Anomalies table
  if (!(await knex.schema.hasTable('audit_anomalies'))) {
    await knex.schema.createTable('audit_anomalies', (table) => {
      table.string('id').primary();
      table.string('anomaly_type');
      table.string('severity'); // LOW, MEDIUM, HIGH, CRITICAL
      table.text('description');
      table.string('voucher_id');
      table.string('account_code');
      table.decimal('amount', 18, 2);
      table.timestamp('detected_at').defaultTo(knex.fn.now());
      table.timestamp('resolved_at');
      table.string('resolved_by');
      table.text('resolution_note');
      table.string('status').defaultTo('OPEN');
    });
  }

  // Reconciliation Records table
  if (!(await knex.schema.hasTable('reconciliation_records'))) {
    await knex.schema.createTable('reconciliation_records', (table) => {
      table.string('id').primary();
      table.string('reconciliation_type'); // BANK, PARTNER, INTERCOMPANY
      table.string('reference_id');
      table.string('period');
      table.decimal('our_balance', 18, 2);
      table.decimal('their_balance', 18, 2);
      table.decimal('difference', 18, 2);
      table.string('status').defaultTo('UNMATCHED');
      table.timestamp('reconciled_at');
      table.string('reconciled_by');
      table.text('note');
    });
  }

  // System Logs table
  if (!(await knex.schema.hasTable('system_logs'))) {
    await knex.schema.createTable('system_logs', (table) => {
      table.string('id').primary();
      table.string('log_level'); // DEBUG, INFO, WARN, ERROR
      table.text('message');
      table.string('source');
      table.text('stack_trace');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // XML Export Logs table
  if (!(await knex.schema.hasTable('xml_export_logs'))) {
    await knex.schema.createTable('xml_export_logs', (table) => {
      table.string('id').primary();
      table.string('export_type');
      table.string('period');
      table.string('file_name');
      table.text('file_path');
      table.string('status');
      table.text('error_message');
      table.string('exported_by');
      table.timestamp('exported_at').defaultTo(knex.fn.now());
    });
  }
}

export async function seedAuditComplianceData(_knex: Knex): Promise<void> {
  // No seed data needed for audit tables
  // These are populated through normal operations
}
