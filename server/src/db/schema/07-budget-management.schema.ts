/**
 * Budget Management Schema
 * Tables: fund_sources, budget_estimates, budget_allocations, budget_transactions,
 *         budget_periods, budget_authorizations, budget_alerts, approval_workflow_rules,
 *         revenue_categories, expense_categories
 */

import { Knex } from 'knex';

export async function createBudgetManagementSchema(knex: Knex): Promise<void> {
  // Fund Sources table
  if (!(await knex.schema.hasTable('fund_sources'))) {
    await knex.schema.createTable('fund_sources', (table) => {
      table.string('id').primary();
      table.string('code').unique().notNullable();
      table.string('name').notNullable();
      table.text('description');
      table.string('parent_id');
      table.integer('budget_year');
      table.integer('is_active').defaultTo(1);
    });
  }

  // Budget Estimates table
  if (!(await knex.schema.hasTable('budget_estimates'))) {
    await knex.schema.createTable('budget_estimates', (table) => {
      table.string('id').primary();
      table.string('fund_source_id');
      table.integer('fiscal_year');
      table.string('period');
      table.string('account_code');
      table.string('item_code');
      table.decimal('estimated_amount', 18, 2).defaultTo(0);
      table.decimal('allocated_amount', 18, 2).defaultTo(0);
      table.decimal('spent_amount', 18, 2).defaultTo(0);
      table.decimal('remaining_amount', 18, 2).defaultTo(0);
      table.string('status').defaultTo('DRAFT');
    });
  }

  // Budget Allocations table
  if (!(await knex.schema.hasTable('budget_allocations'))) {
    await knex.schema.createTable('budget_allocations', (table) => {
      table.string('id').primary();
      table.string('budget_estimate_id');
      table.string('department_id');
      table.string('project_id');
      table.decimal('allocated_amount', 18, 2);
      table.date('allocation_date');
      table.string('approved_by');
      table.text('note');
    });
  }

  // Budget Transactions table
  if (!(await knex.schema.hasTable('budget_transactions'))) {
    await knex.schema.createTable('budget_transactions', (table) => {
      table.string('id').primary();
      table.string('budget_estimate_id');
      table.string('voucher_id');
      table.date('transaction_date');
      table.string('transaction_type'); // ALLOCATION, SPENDING, ADJUSTMENT
      table.decimal('amount', 18, 2);
      table.text('description');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Budget Periods table
  if (!(await knex.schema.hasTable('budget_periods'))) {
    await knex.schema.createTable('budget_periods', (table) => {
      table.string('id').primary();
      table.string('company_id');
      table.integer('fiscal_year');
      table.integer('period');
      table.date('start_date');
      table.date('end_date');
      table.integer('is_locked').defaultTo(0);
      table.timestamp('locked_at');
      table.string('locked_by');
    });
  }

  // Budget Authorizations table
  if (!(await knex.schema.hasTable('budget_authorizations'))) {
    await knex.schema.createTable('budget_authorizations', (table) => {
      table.string('id').primary();
      table.string('voucher_id');
      table.string('budget_estimate_id');
      table.decimal('requested_amount', 18, 2);
      table.string('requested_by');
      table.timestamp('requested_at');
      table.string('status').defaultTo('PENDING');
      table.string('approved_by');
      table.timestamp('approved_at');
      table.text('rejection_reason');
    });
  }

  // Budget Alerts table
  if (!(await knex.schema.hasTable('budget_alerts'))) {
    await knex.schema.createTable('budget_alerts', (table) => {
      table.string('id').primary();
      table.string('budget_estimate_id');
      table.string('alert_type'); // WARNING, EXCEEDED, BLOCKED
      table.decimal('threshold_percentage', 8, 2);
      table.decimal('current_percentage', 8, 2);
      table.text('message');
      table.integer('is_acknowledged').defaultTo(0);
      table.timestamp('acknowledged_at');
      table.string('acknowledged_by');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Approval Workflow Rules table
  if (!(await knex.schema.hasTable('approval_workflow_rules'))) {
    await knex.schema.createTable('approval_workflow_rules', (table) => {
      table.string('id').primary();
      table.string('rule_name');
      table.string('document_type');
      table.decimal('min_amount', 18, 2).defaultTo(0);
      table.decimal('max_amount', 18, 2);
      table.string('approver_role');
      table.integer('approval_level');
      table.integer('is_active').defaultTo(1);
    });
  }

  // Revenue Categories table
  if (!(await knex.schema.hasTable('revenue_categories'))) {
    await knex.schema.createTable('revenue_categories', (table) => {
      table.string('id').primary();
      table.string('code').unique().notNullable();
      table.string('name').notNullable();
      table.text('description');
      table.string('account_code');
      table.integer('is_active').defaultTo(1);
    });
  }

  // Expense Categories table
  if (!(await knex.schema.hasTable('expense_categories'))) {
    await knex.schema.createTable('expense_categories', (table) => {
      table.string('id').primary();
      table.string('code').unique().notNullable();
      table.string('name').notNullable();
      table.string('expense_type');
      table.string('account_code');
      table.text('description');
      table.integer('is_active').defaultTo(1);
    });
  }
}

export async function seedBudgetManagementData(knex: Knex): Promise<void> {
  // Seed budget periods for current and next year
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

  for (const year of years) {
    for (let month = 1; month <= 12; month++) {
      const periodId = `BP_${year}_${month.toString().padStart(2, '0')}`;
      const exists = await knex('budget_periods').where('id', periodId).first();
      if (!exists) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        await knex('budget_periods').insert({
          id: periodId,
          company_id: '1',
          fiscal_year: year,
          period: month,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          is_locked: 0
        });
      }
    }
  }

  // Seed revenue categories
  const revenueCategories = [
    { id: 'RC001', code: 'DT01', name: 'Doanh thu bán hàng', account_code: '511' },
    { id: 'RC002', code: 'DT02', name: 'Doanh thu dịch vụ', account_code: '511' },
    { id: 'RC003', code: 'DT03', name: 'Doanh thu tài chính', account_code: '515' },
    { id: 'RC004', code: 'DT04', name: 'Thu nhập khác', account_code: '711' }
  ];

  for (const cat of revenueCategories) {
    const exists = await knex('revenue_categories').where('id', cat.id).first();
    if (!exists) {
      await knex('revenue_categories').insert(cat);
    }
  }

  // Seed expense categories
  const expenseCategories = [
    { id: 'EC001', code: 'CP01', name: 'Chi phí nguyên vật liệu', expense_type: 'DIRECT', account_code: '621' },
    { id: 'EC002', code: 'CP02', name: 'Chi phí nhân công', expense_type: 'DIRECT', account_code: '622' },
    { id: 'EC003', code: 'CP03', name: 'Chi phí sản xuất chung', expense_type: 'OVERHEAD', account_code: '627' },
    { id: 'EC004', code: 'CP04', name: 'Chi phí bán hàng', expense_type: 'SELLING', account_code: '641' },
    { id: 'EC005', code: 'CP05', name: 'Chi phí quản lý', expense_type: 'ADMIN', account_code: '642' },
    { id: 'EC006', code: 'CP06', name: 'Chi phí tài chính', expense_type: 'FINANCE', account_code: '635' }
  ];

  for (const cat of expenseCategories) {
    const exists = await knex('expense_categories').where('id', cat.id).first();
    if (!exists) {
      await knex('expense_categories').insert(cat);
    }
  }

  // Seed approval workflow rules
  const approvalRules = [
    { id: 'AR001', rule_name: 'Phê duyệt chi thường', document_type: 'EXPENSE', min_amount: 0, max_amount: 10000000, approver_role: 'accountant', approval_level: 1 },
    { id: 'AR002', rule_name: 'Phê duyệt chi lớn', document_type: 'EXPENSE', min_amount: 10000000, max_amount: 50000000, approver_role: 'manager', approval_level: 2 },
    { id: 'AR003', rule_name: 'Phê duyệt chi rất lớn', document_type: 'EXPENSE', min_amount: 50000000, max_amount: null, approver_role: 'admin', approval_level: 3 }
  ];

  for (const rule of approvalRules) {
    const exists = await knex('approval_workflow_rules').where('id', rule.id).first();
    if (!exists) {
      await knex('approval_workflow_rules').insert(rule);
    }
  }
}
