/**
 * Core Accounting Schema
 * Tables: companies, users, chart_of_accounts, partners, system_settings, roles
 */

import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

const DEFAULT_ADMIN_USER = process.env.DEFAULT_ADMIN_USER || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';

export async function createCoreAccountingSchema(knex: Knex): Promise<void> {
  // Companies table
  if (!(await knex.schema.hasTable('companies'))) {
    await knex.schema.createTable('companies', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('address');
      table.string('tax_code');
      table.string('phone');
      table.string('email');
      table.string('website');
      table.text('logo');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // Users table
  if (!(await knex.schema.hasTable('users'))) {
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').unique().notNullable();
      table.string('password').notNullable();
      table.string('fullname');
      table.string('role');
      table.string('status').defaultTo('Active');
      table.timestamp('last_login');
      table.integer('is_admin').defaultTo(0);
      table.string('company_id').defaultTo('1');
    });
  }

  // Roles table
  if (!(await knex.schema.hasTable('roles'))) {
    await knex.schema.createTable('roles', (table) => {
      table.string('id').primary();
      table.string('role_code').unique().notNullable();
      table.string('role_name').notNullable();
      table.text('description');
      table.text('permissions');
    });
  }

  // Chart of Accounts table
  if (!(await knex.schema.hasTable('chart_of_accounts'))) {
    await knex.schema.createTable('chart_of_accounts', (table) => {
      table.string('account_code').primary();
      table.string('account_name').notNullable();
      table.string('category');
      table.string('parent_code');
      table.integer('is_detail').defaultTo(0);
      table.integer('is_active').defaultTo(1);
    });
  }

  // Partners table
  if (!(await knex.schema.hasTable('partners'))) {
    await knex.schema.createTable('partners', (table) => {
      table.string('partner_code').primary();
      table.string('partner_name').notNullable();
      table.string('tax_code');
      table.string('address');
      table.string('phone');
      table.string('email');
      table.string('contact_person');
      table.string('bank_account');
      table.string('bank_name');
      table.string('partner_type').defaultTo('OTHER');
      table.integer('is_active').defaultTo(1);
    });
  }

  // System Settings table
  if (!(await knex.schema.hasTable('system_settings'))) {
    await knex.schema.createTable('system_settings', (table) => {
      table.string('key').primary();
      table.text('value');
    });
  }

  // Bank Accounts table
  if (!(await knex.schema.hasTable('bank_accounts'))) {
    await knex.schema.createTable('bank_accounts', (table) => {
      table.string('id').primary();
      table.string('account_number').notNullable();
      table.string('account_name').notNullable();
      table.string('bank_name').notNullable();
      table.string('bank_branch');
      table.string('currency').defaultTo('VND');
      table.string('gl_account_code');
      table.integer('is_default').defaultTo(0);
      table.integer('is_active').defaultTo(1);
    });
  }
}

export async function seedCoreAccountingData(knex: Knex): Promise<void> {
  // Seed default company
  const companyExists = await knex('companies').where('id', '1').first();
  if (!companyExists) {
    await knex('companies').insert({
      id: '1',
      name: 'Doanh nghiệp Demo',
      address: '123 Đường Mẫu, Hà Nội',
      tax_code: '0101234567'
    });
  }

  // Seed admin user
  const adminExists = await knex('users').where('username', DEFAULT_ADMIN_USER).first();
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await knex('users').insert({
      username: DEFAULT_ADMIN_USER,
      password: hashedPassword,
      fullname: 'Administrator',
      role: 'admin',
      status: 'Active',
      is_admin: 1,
      company_id: '1'
    });
  }

  // Seed default system settings
  const settings = [
    { key: 'unit_name', value: 'Doanh nghiệp Demo' },
    { key: 'unit_address', value: '123 Đường Mẫu, Hà Nội' },
    { key: 'unit_tax_code', value: '0101234567' },
    { key: 'accounting_regime', value: 'CIRCULAR_99_2025' },
    { key: 'base_currency', value: 'VND' },
    { key: 'decimal_format', value: 'vi-VN' },
    { key: 'locked_until_date', value: '1900-01-01' }
  ];

  for (const setting of settings) {
    const exists = await knex('system_settings').where('key', setting.key).first();
    if (!exists) {
      await knex('system_settings').insert(setting);
    }
  }

  // Seed default roles
  const roles = [
    { id: 'admin', role_code: 'ADMIN', role_name: 'Quản trị viên', description: 'Full access' },
    { id: 'accountant', role_code: 'ACCOUNTANT', role_name: 'Kế toán viên', description: 'Accounting operations' },
    { id: 'viewer', role_code: 'VIEWER', role_name: 'Người xem', description: 'Read-only access' }
  ];

  for (const role of roles) {
    const exists = await knex('roles').where('id', role.id).first();
    if (!exists) {
      await knex('roles').insert(role);
    }
  }
}
