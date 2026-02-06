/**
 * Migration: Add Performance Indexes
 * Improves query performance for frequently accessed columns
 */

/**
 * Helper function to safely create index
 */
async function safeCreateIndex(knex, tableName, columns, indexName) {
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) return;

    try {
        await knex.schema.alterTable(tableName, (table) => {
            if (Array.isArray(columns)) {
                table.index(columns, indexName);
            } else {
                table.index(columns, indexName);
            }
        });
    } catch (err) {
        // Index may already exist
        if (!err.message.includes('already exists')) {
            console.log(`[INDEX] Skipped ${indexName}: ${err.message}`);
        }
    }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // ========================================
    // GENERAL LEDGER INDEXES
    // ========================================
    await safeCreateIndex(knex, 'general_ledger', 'voucher_id', 'idx_gl_voucher_id');
    await safeCreateIndex(knex, 'general_ledger', 'account_code', 'idx_gl_account_code');
    await safeCreateIndex(knex, 'general_ledger', 'trx_date', 'idx_gl_trx_date');
    await safeCreateIndex(knex, 'general_ledger', 'partner_code', 'idx_gl_partner_code');
    await safeCreateIndex(knex, 'general_ledger', ['account_code', 'trx_date'], 'idx_gl_account_date');
    await safeCreateIndex(knex, 'general_ledger', ['trx_date', 'account_code'], 'idx_gl_date_account');

    // ========================================
    // VOUCHER INDEXES
    // ========================================
    await safeCreateIndex(knex, 'vouchers', 'doc_date', 'idx_vouchers_doc_date');
    await safeCreateIndex(knex, 'vouchers', 'post_date', 'idx_vouchers_post_date');
    await safeCreateIndex(knex, 'vouchers', 'type', 'idx_vouchers_type');
    await safeCreateIndex(knex, 'vouchers', 'status', 'idx_vouchers_status');
    await safeCreateIndex(knex, 'vouchers', ['type', 'status'], 'idx_vouchers_type_status');
    await safeCreateIndex(knex, 'vouchers', ['doc_date', 'type'], 'idx_vouchers_date_type');

    // ========================================
    // VOUCHER ITEMS INDEXES
    // ========================================
    await safeCreateIndex(knex, 'voucher_items', 'voucher_id', 'idx_vi_voucher_id');
    await safeCreateIndex(knex, 'voucher_items', 'debit_account', 'idx_vi_debit_account');
    await safeCreateIndex(knex, 'voucher_items', 'credit_account', 'idx_vi_credit_account');
    await safeCreateIndex(knex, 'voucher_items', 'partner_code', 'idx_vi_partner_code');
    await safeCreateIndex(knex, 'voucher_items', 'product_code', 'idx_vi_product_code');

    // ========================================
    // AR/AP INDEXES
    // ========================================
    await safeCreateIndex(knex, 'receivables', 'partner_code', 'idx_recv_partner_code');
    await safeCreateIndex(knex, 'receivables', 'doc_date', 'idx_recv_doc_date');
    await safeCreateIndex(knex, 'receivables', 'due_date', 'idx_recv_due_date');
    await safeCreateIndex(knex, 'receivables', 'status', 'idx_recv_status');
    await safeCreateIndex(knex, 'receivables', ['partner_code', 'status'], 'idx_recv_partner_status');

    await safeCreateIndex(knex, 'payables', 'partner_code', 'idx_pay_partner_code');
    await safeCreateIndex(knex, 'payables', 'doc_date', 'idx_pay_doc_date');
    await safeCreateIndex(knex, 'payables', 'due_date', 'idx_pay_due_date');
    await safeCreateIndex(knex, 'payables', 'status', 'idx_pay_status');
    await safeCreateIndex(knex, 'payables', ['partner_code', 'status'], 'idx_pay_partner_status');

    // ========================================
    // EMPLOYEE INDEXES
    // ========================================
    await safeCreateIndex(knex, 'employees', 'department_id', 'idx_emp_department_id');
    await safeCreateIndex(knex, 'employees', 'salary_grade_id', 'idx_emp_salary_grade_id');
    await safeCreateIndex(knex, 'employees', 'status', 'idx_emp_status');
    await safeCreateIndex(knex, 'employees', ['department_id', 'status'], 'idx_emp_dept_status');

    // ========================================
    // PAYROLL INDEXES
    // ========================================
    await safeCreateIndex(knex, 'payroll_details', 'period_id', 'idx_payroll_period_id');
    await safeCreateIndex(knex, 'payroll_details', 'employee_id', 'idx_payroll_employee_id');
    await safeCreateIndex(knex, 'payroll_details', ['period_id', 'employee_id'], 'idx_payroll_period_emp');

    await safeCreateIndex(knex, 'timekeeping', 'employee_id', 'idx_timekeep_employee_id');
    await safeCreateIndex(knex, 'timekeeping', 'date', 'idx_timekeep_date');
    await safeCreateIndex(knex, 'timekeeping', ['employee_id', 'date'], 'idx_timekeep_emp_date');

    // ========================================
    // INVENTORY INDEXES
    // ========================================
    await safeCreateIndex(knex, 'materials', 'code', 'idx_materials_code');
    await safeCreateIndex(knex, 'materials', 'category', 'idx_materials_category');

    await safeCreateIndex(knex, 'material_receipts', 'receipt_date', 'idx_mr_receipt_date');
    await safeCreateIndex(knex, 'material_receipts', 'supplier_code', 'idx_mr_supplier_code');

    await safeCreateIndex(knex, 'material_issues', 'issue_date', 'idx_mi_issue_date');
    await safeCreateIndex(knex, 'material_issues', 'department_id', 'idx_mi_department_id');

    await safeCreateIndex(knex, 'inventory_cards', 'material_id', 'idx_invcard_material_id');
    await safeCreateIndex(knex, 'inventory_cards', 'transaction_date', 'idx_invcard_trx_date');

    // ========================================
    // FIXED ASSET INDEXES
    // ========================================
    await safeCreateIndex(knex, 'fixed_assets', 'asset_category', 'idx_fa_category');
    await safeCreateIndex(knex, 'fixed_assets', 'department', 'idx_fa_department');
    await safeCreateIndex(knex, 'fixed_assets', 'status', 'idx_fa_status');

    await safeCreateIndex(knex, 'asset_depreciation_log', 'asset_id', 'idx_depr_asset_id');
    await safeCreateIndex(knex, 'asset_depreciation_log', 'period', 'idx_depr_period');

    // ========================================
    // BUDGET INDEXES
    // ========================================
    await safeCreateIndex(knex, 'budget_estimates', 'fund_source_id', 'idx_be_fund_source');
    await safeCreateIndex(knex, 'budget_estimates', 'fiscal_year', 'idx_be_fiscal_year');
    await safeCreateIndex(knex, 'budget_estimates', 'account_code', 'idx_be_account_code');
    await safeCreateIndex(knex, 'budget_estimates', ['fund_source_id', 'fiscal_year'], 'idx_be_fund_year');

    await safeCreateIndex(knex, 'budget_transactions', 'budget_estimate_id', 'idx_bt_estimate_id');
    await safeCreateIndex(knex, 'budget_transactions', 'voucher_id', 'idx_bt_voucher_id');
    await safeCreateIndex(knex, 'budget_transactions', 'transaction_date', 'idx_bt_trx_date');

    // ========================================
    // AUDIT TRAIL INDEXES
    // ========================================
    await safeCreateIndex(knex, 'audit_trail', 'user_id', 'idx_audit_user_id');
    await safeCreateIndex(knex, 'audit_trail', 'entity_type', 'idx_audit_entity_type');
    await safeCreateIndex(knex, 'audit_trail', 'timestamp', 'idx_audit_timestamp');
    await safeCreateIndex(knex, 'audit_trail', ['entity_type', 'entity_id'], 'idx_audit_entity');
    await safeCreateIndex(knex, 'audit_trail', ['user_id', 'timestamp'], 'idx_audit_user_time');

    // ========================================
    // CONTRACT & PROJECT INDEXES
    // ========================================
    await safeCreateIndex(knex, 'contracts', 'partner_code', 'idx_contracts_partner');
    await safeCreateIndex(knex, 'contracts', 'contract_type', 'idx_contracts_type');
    await safeCreateIndex(knex, 'contracts', 'status', 'idx_contracts_status');

    await safeCreateIndex(knex, 'projects', 'status', 'idx_projects_status');
    await safeCreateIndex(knex, 'projects', 'start_date', 'idx_projects_start_date');

    await safeCreateIndex(knex, 'project_tasks', 'project_id', 'idx_tasks_project_id');
    await safeCreateIndex(knex, 'project_tasks', 'assignee_id', 'idx_tasks_assignee');
    await safeCreateIndex(knex, 'project_tasks', 'status', 'idx_tasks_status');

    // ========================================
    // E-INVOICE INDEXES
    // ========================================
    await safeCreateIndex(knex, 'einvoice_imports', 'invoice_date', 'idx_einv_date');
    await safeCreateIndex(knex, 'einvoice_imports', 'seller_tax_code', 'idx_einv_seller_tax');
    await safeCreateIndex(knex, 'einvoice_imports', 'buyer_tax_code', 'idx_einv_buyer_tax');
    await safeCreateIndex(knex, 'einvoice_imports', 'status', 'idx_einv_status');

    console.log('[MIGRATION] Performance indexes created');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Dropping indexes is safe - they can be recreated
    const indexesToDrop = [
        // GL indexes
        { table: 'general_ledger', index: 'idx_gl_voucher_id' },
        { table: 'general_ledger', index: 'idx_gl_account_code' },
        { table: 'general_ledger', index: 'idx_gl_trx_date' },
        { table: 'general_ledger', index: 'idx_gl_partner_code' },
        { table: 'general_ledger', index: 'idx_gl_account_date' },
        { table: 'general_ledger', index: 'idx_gl_date_account' },
        // Add more as needed
    ];

    for (const { table, index } of indexesToDrop) {
        try {
            await knex.schema.alterTable(table, (t) => {
                t.dropIndex([], index);
            });
        } catch (err) {
            // Index may not exist
        }
    }

    console.log('[MIGRATION] Performance indexes dropped');
};
