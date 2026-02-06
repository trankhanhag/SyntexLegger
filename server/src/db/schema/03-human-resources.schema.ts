/**
 * Human Resources Schema
 * Tables: employees, salary_grades, employee_allowances, allowance_types,
 *         payroll_periods, payroll_details, employee_contracts, salary_history, timekeeping
 */

import { Knex } from 'knex';

export async function createHumanResourcesSchema(knex: Knex): Promise<void> {
  // Employees table
  if (!(await knex.schema.hasTable('employees'))) {
    await knex.schema.createTable('employees', (table) => {
      table.string('id').primary();
      table.string('employee_code').unique().notNullable();
      table.string('full_name').notNullable();
      table.string('gender');
      table.date('date_of_birth');
      table.string('id_number');
      table.date('id_issue_date');
      table.string('id_issue_place');
      table.string('phone');
      table.string('email');
      table.text('address');
      table.string('department_id');
      table.string('position');
      table.string('salary_grade_id');
      table.decimal('base_salary', 18, 2).defaultTo(0);
      table.date('hire_date');
      table.date('termination_date');
      table.string('bank_account');
      table.string('bank_name');
      table.string('tax_code');
      table.string('social_insurance_no');
      table.string('health_insurance_no');
      table.string('status').defaultTo('ACTIVE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at');
    });
  }

  // Salary Grades table
  if (!(await knex.schema.hasTable('salary_grades'))) {
    await knex.schema.createTable('salary_grades', (table) => {
      table.string('id').primary();
      table.string('grade_code').unique().notNullable();
      table.string('grade_name').notNullable();
      table.decimal('coefficient', 8, 3);
      table.decimal('base_amount', 18, 2);
      table.text('description');
    });
  }

  // Allowance Types table
  if (!(await knex.schema.hasTable('allowance_types'))) {
    await knex.schema.createTable('allowance_types', (table) => {
      table.string('id').primary();
      table.string('code').unique().notNullable();
      table.string('name').notNullable();
      table.text('description');
      table.integer('is_taxable').defaultTo(1);
      table.string('account_code');
    });
  }

  // Employee Allowances table
  if (!(await knex.schema.hasTable('employee_allowances'))) {
    await knex.schema.createTable('employee_allowances', (table) => {
      table.string('id').primary();
      table.string('employee_id').references('id').inTable('employees').onDelete('CASCADE');
      table.string('allowance_type_id');
      table.decimal('amount', 18, 2);
      table.date('start_date');
      table.date('end_date');
      table.integer('is_taxable').defaultTo(1);
    });
  }

  // Payroll Periods table
  if (!(await knex.schema.hasTable('payroll_periods'))) {
    await knex.schema.createTable('payroll_periods', (table) => {
      table.string('id').primary();
      table.string('period_code').unique();
      table.string('period_name');
      table.integer('year');
      table.integer('month');
      table.date('start_date');
      table.date('end_date');
      table.string('status').defaultTo('OPEN');
    });
  }

  // Payroll Details table
  if (!(await knex.schema.hasTable('payroll_details'))) {
    await knex.schema.createTable('payroll_details', (table) => {
      table.string('id').primary();
      table.string('period_id');
      table.string('employee_id');
      table.decimal('working_days', 8, 2);
      table.decimal('base_salary', 18, 2);
      table.decimal('allowances', 18, 2);
      table.decimal('deductions', 18, 2);
      table.decimal('gross_salary', 18, 2);
      table.decimal('social_insurance', 18, 2);
      table.decimal('health_insurance', 18, 2);
      table.decimal('unemployment_insurance', 18, 2);
      table.decimal('personal_income_tax', 18, 2);
      table.decimal('net_salary', 18, 2);
      table.string('status').defaultTo('DRAFT');
    });
  }

  // Employee Contracts table
  if (!(await knex.schema.hasTable('employee_contracts'))) {
    await knex.schema.createTable('employee_contracts', (table) => {
      table.string('id').primary();
      table.string('employee_id');
      table.string('contract_no');
      table.string('contract_type');
      table.date('sign_date');
      table.date('start_date');
      table.date('end_date');
      table.decimal('salary', 18, 2);
      table.string('status').defaultTo('ACTIVE');
    });
  }

  // Salary History table
  if (!(await knex.schema.hasTable('salary_history'))) {
    await knex.schema.createTable('salary_history', (table) => {
      table.string('id').primary();
      table.string('employee_id');
      table.date('effective_date');
      table.decimal('old_salary', 18, 2);
      table.decimal('new_salary', 18, 2);
      table.string('reason');
      table.string('approved_by');
    });
  }

  // Timekeeping table
  if (!(await knex.schema.hasTable('timekeeping'))) {
    await knex.schema.createTable('timekeeping', (table) => {
      table.string('id').primary();
      table.string('employee_id');
      table.date('date');
      table.time('check_in');
      table.time('check_out');
      table.decimal('work_hours', 8, 2);
      table.decimal('overtime_hours', 8, 2);
      table.string('leave_type');
      table.text('note');
    });
  }
}

export async function seedHumanResourcesData(knex: Knex): Promise<void> {
  // Seed default salary grades
  const grades = [
    { id: 'SG1', grade_code: 'GRADE_1', grade_name: 'Nhân viên', coefficient: 1.0, base_amount: 5000000 },
    { id: 'SG2', grade_code: 'GRADE_2', grade_name: 'Chuyên viên', coefficient: 1.5, base_amount: 7500000 },
    { id: 'SG3', grade_code: 'GRADE_3', grade_name: 'Quản lý', coefficient: 2.0, base_amount: 10000000 }
  ];

  for (const grade of grades) {
    const exists = await knex('salary_grades').where('id', grade.id).first();
    if (!exists) {
      await knex('salary_grades').insert(grade);
    }
  }

  // Seed default allowance types
  const allowanceTypes = [
    { id: 'AT1', code: 'MEAL', name: 'Phụ cấp ăn trưa', is_taxable: 0, account_code: '6421' },
    { id: 'AT2', code: 'TRANSPORT', name: 'Phụ cấp đi lại', is_taxable: 0, account_code: '6422' },
    { id: 'AT3', code: 'PHONE', name: 'Phụ cấp điện thoại', is_taxable: 1, account_code: '6423' },
    { id: 'AT4', code: 'HOUSING', name: 'Phụ cấp nhà ở', is_taxable: 1, account_code: '6424' }
  ];

  for (const type of allowanceTypes) {
    const exists = await knex('allowance_types').where('id', type.id).first();
    if (!exists) {
      await knex('allowance_types').insert(type);
    }
  }
}
