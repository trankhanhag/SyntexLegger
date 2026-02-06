/**
 * Migration: Add Indexes for New Standard Columns
 * Creates indexes for the newly added standardized columns
 */

/**
 * Helper function to safely create index
 */
async function safeCreateIndex(knex, tableName, columns, indexName) {
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) return;

    // Check if column exists
    const colName = Array.isArray(columns) ? columns[0] : columns;
    const hasColumn = await knex.schema.hasColumn(tableName, colName);
    if (!hasColumn) return;

    try {
        await knex.schema.alterTable(tableName, (table) => {
            if (Array.isArray(columns)) {
                table.index(columns, indexName);
            } else {
                table.index(columns, indexName);
            }
        });
        console.log(`[INDEX] Created ${indexName}`);
    } catch (err) {
        // Index may already exist
    }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // ========================================
    // VOUCHER_ITEMS INDEXES
    // ========================================
    await safeCreateIndex(knex, 'voucher_items', 'debit_account', 'idx_vi_debit_account_std');
    await safeCreateIndex(knex, 'voucher_items', 'credit_account', 'idx_vi_credit_account_std');
    await safeCreateIndex(knex, 'voucher_items', 'product_code', 'idx_vi_product_code_std');

    // ========================================
    // EMPLOYEES INDEXES
    // ========================================
    await safeCreateIndex(knex, 'employees', 'employee_code', 'idx_emp_code_std');
    await safeCreateIndex(knex, 'employees', 'department_id', 'idx_emp_dept_std');
    await safeCreateIndex(knex, 'employees', ['department_id', 'status'], 'idx_emp_dept_status_std');

    // ========================================
    // TIMEKEEPING INDEXES
    // ========================================
    await safeCreateIndex(knex, 'timekeeping', 'work_date', 'idx_tk_work_date');
    await safeCreateIndex(knex, 'timekeeping', ['employee_id', 'work_date'], 'idx_tk_emp_date');

    // ========================================
    // MATERIAL_RECEIPTS INDEXES
    // ========================================
    await safeCreateIndex(knex, 'material_receipts', 'supplier_code', 'idx_mr_supplier_std');

    // ========================================
    // MATERIAL_ISSUES INDEXES
    // ========================================
    await safeCreateIndex(knex, 'material_issues', 'department_id', 'idx_mi_dept_std');

    // ========================================
    // FIXED_ASSETS INDEXES
    // ========================================
    await safeCreateIndex(knex, 'fixed_assets', 'asset_code', 'idx_fa_code_std');
    await safeCreateIndex(knex, 'fixed_assets', 'department', 'idx_fa_dept_std');

    // ========================================
    // CONTRACTS INDEXES
    // ========================================
    await safeCreateIndex(knex, 'contracts', 'contract_no', 'idx_contracts_no_std');
    await safeCreateIndex(knex, 'contracts', 'partner_code', 'idx_contracts_partner_std');
    await safeCreateIndex(knex, 'contracts', 'contract_type', 'idx_contracts_type_std');

    // ========================================
    // PROJECTS INDEXES
    // ========================================
    await safeCreateIndex(knex, 'projects', 'project_code', 'idx_proj_code_std');
    await safeCreateIndex(knex, 'projects', 'start_date', 'idx_proj_start_std');

    // ========================================
    // PROJECT_TASKS INDEXES
    // ========================================
    await safeCreateIndex(knex, 'project_tasks', 'assignee_id', 'idx_tasks_assignee_std');
    await safeCreateIndex(knex, 'project_tasks', 'due_date', 'idx_tasks_due_std');

    // ========================================
    // AUDIT_TRAIL INDEXES
    // ========================================
    await safeCreateIndex(knex, 'audit_trail', 'timestamp', 'idx_audit_timestamp_std');
    await safeCreateIndex(knex, 'audit_trail', ['user_id', 'timestamp'], 'idx_audit_user_time_std');

    // ========================================
    // BUDGET_ESTIMATES INDEXES
    // ========================================
    await safeCreateIndex(knex, 'budget_estimates', 'account_code', 'idx_be_account_std');

    console.log('[MIGRATION] Indexes for new columns created');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    console.log('[MIGRATION] Index rollback - indexes preserved for performance');
};
