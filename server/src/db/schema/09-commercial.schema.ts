/**
 * Commercial Schema
 * Tables: contracts, contract_appendices, projects, project_tasks, project_budget_lines,
 *         sales_orders, sales_invoices, purchase_orders, purchase_invoices,
 *         loan_contracts, debt_notes, dimensions, dimension_configs, checklist_tasks
 */

import { Knex } from 'knex';

export async function createCommercialSchema(knex: Knex): Promise<void> {
  // Contracts table
  if (!(await knex.schema.hasTable('contracts'))) {
    await knex.schema.createTable('contracts', (table) => {
      table.string('id').primary();
      table.string('contract_no').unique();
      table.string('contract_name');
      table.string('contract_type'); // SALE, PURCHASE, SERVICE
      table.string('partner_code');
      table.date('sign_date');
      table.date('start_date');
      table.date('end_date');
      table.decimal('total_value', 18, 2);
      table.string('currency').defaultTo('VND');
      table.text('payment_terms');
      table.string('status').defaultTo('DRAFT');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Contract Appendices table
  if (!(await knex.schema.hasTable('contract_appendices'))) {
    await knex.schema.createTable('contract_appendices', (table) => {
      table.string('id').primary();
      table.string('contract_id');
      table.string('appendix_no');
      table.date('sign_date');
      table.text('content');
      table.decimal('value_change', 18, 2);
      table.string('status').defaultTo('ACTIVE');
    });
  }

  // Projects table
  if (!(await knex.schema.hasTable('projects'))) {
    await knex.schema.createTable('projects', (table) => {
      table.string('id').primary();
      table.string('project_code').unique();
      table.string('project_name');
      table.text('description');
      table.date('start_date');
      table.date('end_date');
      table.decimal('budget_amount', 18, 2).defaultTo(0);
      table.decimal('spent_amount', 18, 2).defaultTo(0);
      table.string('manager_id');
      table.string('department_id');
      table.string('status').defaultTo('PLANNING');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Project Tasks table
  if (!(await knex.schema.hasTable('project_tasks'))) {
    await knex.schema.createTable('project_tasks', (table) => {
      table.string('id').primary();
      table.string('project_id');
      table.string('task_name');
      table.text('description');
      table.date('start_date');
      table.date('due_date');
      table.string('assignee_id');
      table.integer('progress').defaultTo(0);
      table.string('status').defaultTo('TODO');
    });
  }

  // Project Budget Lines table
  if (!(await knex.schema.hasTable('project_budget_lines'))) {
    await knex.schema.createTable('project_budget_lines', (table) => {
      table.string('id').primary();
      table.string('project_id');
      table.string('expense_category_id');
      table.decimal('budgeted_amount', 18, 2);
      table.decimal('actual_amount', 18, 2).defaultTo(0);
      table.decimal('variance', 18, 2).defaultTo(0);
    });
  }

  // Sales Orders table
  if (!(await knex.schema.hasTable('sales_orders'))) {
    await knex.schema.createTable('sales_orders', (table) => {
      table.string('id').primary();
      table.string('order_no').unique();
      table.date('order_date');
      table.string('customer_code');
      table.decimal('total_amount', 18, 2);
      table.decimal('tax_amount', 18, 2);
      table.decimal('discount_amount', 18, 2);
      table.decimal('net_amount', 18, 2);
      table.string('currency').defaultTo('VND');
      table.date('delivery_date');
      table.string('status').defaultTo('DRAFT');
    });
  }

  // Sales Invoices table
  if (!(await knex.schema.hasTable('sales_invoices'))) {
    await knex.schema.createTable('sales_invoices', (table) => {
      table.string('id').primary();
      table.string('invoice_no').unique();
      table.date('invoice_date');
      table.string('sales_order_id');
      table.string('customer_code');
      table.decimal('total_amount', 18, 2);
      table.decimal('tax_amount', 18, 2);
      table.decimal('net_amount', 18, 2);
      table.string('voucher_id');
      table.string('status').defaultTo('DRAFT');
    });
  }

  // Purchase Orders table
  if (!(await knex.schema.hasTable('purchase_orders'))) {
    await knex.schema.createTable('purchase_orders', (table) => {
      table.string('id').primary();
      table.string('order_no').unique();
      table.date('order_date');
      table.string('supplier_code');
      table.decimal('total_amount', 18, 2);
      table.decimal('tax_amount', 18, 2);
      table.decimal('discount_amount', 18, 2);
      table.decimal('net_amount', 18, 2);
      table.string('currency').defaultTo('VND');
      table.date('expected_date');
      table.string('status').defaultTo('DRAFT');
    });
  }

  // Purchase Invoices table
  if (!(await knex.schema.hasTable('purchase_invoices'))) {
    await knex.schema.createTable('purchase_invoices', (table) => {
      table.string('id').primary();
      table.string('invoice_no').unique();
      table.date('invoice_date');
      table.string('purchase_order_id');
      table.string('supplier_code');
      table.decimal('total_amount', 18, 2);
      table.decimal('tax_amount', 18, 2);
      table.decimal('net_amount', 18, 2);
      table.string('voucher_id');
      table.string('status').defaultTo('DRAFT');
    });
  }

  // Loan Contracts table
  if (!(await knex.schema.hasTable('loan_contracts'))) {
    await knex.schema.createTable('loan_contracts', (table) => {
      table.string('id').primary();
      table.string('contract_no').unique();
      table.string('lender_code');
      table.decimal('principal_amount', 18, 2);
      table.decimal('interest_rate', 8, 4);
      table.date('start_date');
      table.date('maturity_date');
      table.string('payment_schedule');
      table.decimal('outstanding_balance', 18, 2);
      table.string('status').defaultTo('ACTIVE');
    });
  }

  // Debt Notes table
  if (!(await knex.schema.hasTable('debt_notes'))) {
    await knex.schema.createTable('debt_notes', (table) => {
      table.string('id').primary();
      table.string('note_no').unique();
      table.string('partner_code');
      table.string('debt_type'); // RECEIVABLE, PAYABLE
      table.date('note_date');
      table.decimal('original_amount', 18, 2);
      table.decimal('remaining_amount', 18, 2);
      table.date('due_date');
      table.text('description');
      table.string('status').defaultTo('OPEN');
    });
  }

  // Dimensions table
  if (!(await knex.schema.hasTable('dimensions'))) {
    await knex.schema.createTable('dimensions', (table) => {
      table.string('id').primary();
      table.integer('dim_id');
      table.string('code').notNullable();
      table.string('name');
      table.text('description');
      table.string('parent_code');
      table.integer('is_active').defaultTo(1);
    });
  }

  // Dimension Configs table
  if (!(await knex.schema.hasTable('dimension_configs'))) {
    await knex.schema.createTable('dimension_configs', (table) => {
      table.string('id').primary();
      table.integer('dim_id').unique();
      table.string('dim_name');
      table.string('dim_label');
      table.integer('is_required').defaultTo(0);
      table.integer('is_active').defaultTo(1);
      table.integer('display_order');
    });
  }

  // Checklist Tasks table
  if (!(await knex.schema.hasTable('checklist_tasks'))) {
    await knex.schema.createTable('checklist_tasks', (table) => {
      table.string('id').primary();
      table.string('task_code').unique();
      table.string('task_name');
      table.text('description');
      table.string('frequency'); // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
      table.string('category');
      table.integer('sequence');
      table.integer('is_active').defaultTo(1);
    });
  }
}

export async function seedCommercialData(knex: Knex): Promise<void> {
  // Seed dimension configs
  const dimConfigs = [
    { id: 'DIM1', dim_id: 1, dim_name: 'department', dim_label: 'Bộ phận', is_required: 0, is_active: 1, display_order: 1 },
    { id: 'DIM2', dim_id: 2, dim_name: 'cost_center', dim_label: 'Trung tâm chi phí', is_required: 0, is_active: 1, display_order: 2 },
    { id: 'DIM3', dim_id: 3, dim_name: 'region', dim_label: 'Khu vực', is_required: 0, is_active: 0, display_order: 3 },
    { id: 'DIM4', dim_id: 4, dim_name: 'segment', dim_label: 'Phân khúc', is_required: 0, is_active: 0, display_order: 4 },
    { id: 'DIM5', dim_id: 5, dim_name: 'custom', dim_label: 'Tùy chỉnh', is_required: 0, is_active: 0, display_order: 5 }
  ];

  for (const config of dimConfigs) {
    const exists = await knex('dimension_configs').where('id', config.id).first();
    if (!exists) {
      await knex('dimension_configs').insert(config);
    }
  }

  // Seed sample dimensions
  const dimensions = [
    { id: 'D1_SALES', dim_id: 1, code: 'SALES', name: 'Phòng Kinh doanh' },
    { id: 'D1_ACCT', dim_id: 1, code: 'ACCT', name: 'Phòng Kế toán' },
    { id: 'D1_HR', dim_id: 1, code: 'HR', name: 'Phòng Nhân sự' },
    { id: 'D1_IT', dim_id: 1, code: 'IT', name: 'Phòng IT' },
    { id: 'D2_CC01', dim_id: 2, code: 'CC01', name: 'Chi phí chung' },
    { id: 'D2_CC02', dim_id: 2, code: 'CC02', name: 'Chi phí bán hàng' }
  ];

  for (const dim of dimensions) {
    const exists = await knex('dimensions').where('id', dim.id).first();
    if (!exists) {
      await knex('dimensions').insert(dim);
    }
  }

  // Seed checklist tasks
  const tasks = [
    { id: 'CL001', task_code: 'DAILY_CASH', task_name: 'Kiểm tra số dư tiền mặt', frequency: 'DAILY', category: 'CASH', sequence: 1 },
    { id: 'CL002', task_code: 'DAILY_BANK', task_name: 'Kiểm tra số dư ngân hàng', frequency: 'DAILY', category: 'BANK', sequence: 2 },
    { id: 'CL003', task_code: 'MONTHLY_CLOSE', task_name: 'Khóa sổ kế toán', frequency: 'MONTHLY', category: 'CLOSING', sequence: 1 },
    { id: 'CL004', task_code: 'MONTHLY_DEPR', task_name: 'Trích khấu hao TSCĐ', frequency: 'MONTHLY', category: 'ASSETS', sequence: 2 },
    { id: 'CL005', task_code: 'QUARTERLY_TAX', task_name: 'Kê khai thuế quý', frequency: 'QUARTERLY', category: 'TAX', sequence: 1 }
  ];

  for (const task of tasks) {
    const exists = await knex('checklist_tasks').where('id', task.id).first();
    if (!exists) {
      await knex('checklist_tasks').insert(task);
    }
  }
}
