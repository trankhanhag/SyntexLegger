/**
 * Migration: Schema Standardization
 * Adds missing columns and standardizes column names
 *
 * Strategy: Add new columns with standard names, keep old columns for backward compatibility
 * Data will be copied from old to new columns
 */

/**
 * Helper to safely add column
 */
async function safeAddColumn(knex, table, column, definition) {
    const hasTable = await knex.schema.hasTable(table);
    if (!hasTable) return false;

    const hasColumn = await knex.schema.hasColumn(table, column);
    if (hasColumn) return false;

    try {
        await knex.schema.alterTable(table, definition);
        return true;
    } catch (err) {
        console.log(`[SCHEMA] Skip ${table}.${column}: ${err.message}`);
        return false;
    }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // ========================================
    // 1. VOUCHER_ITEMS - Add standard column names
    // ========================================
    await safeAddColumn(knex, 'voucher_items', 'debit_account', (table) => {
        table.string('debit_account', 20);
    });
    await safeAddColumn(knex, 'voucher_items', 'credit_account', (table) => {
        table.string('credit_account', 20);
    });
    await safeAddColumn(knex, 'voucher_items', 'product_code', (table) => {
        table.string('product_code', 50);
    });
    await safeAddColumn(knex, 'voucher_items', 'line_no', (table) => {
        table.integer('line_no').defaultTo(1);
    });

    // Copy data from old to new columns
    await knex.raw(`
        UPDATE voucher_items
        SET debit_account = debit_acc,
            credit_account = credit_acc,
            product_code = item_code
        WHERE debit_account IS NULL OR credit_account IS NULL
    `).catch(() => {});

    // ========================================
    // 2. GENERAL_LEDGER - Add voucher_id
    // ========================================
    await safeAddColumn(knex, 'general_ledger', 'voucher_id', (table) => {
        table.string('voucher_id', 50);
    });

    // Try to populate voucher_id from doc_no
    await knex.raw(`
        UPDATE general_ledger
        SET voucher_id = (SELECT id FROM vouchers WHERE vouchers.doc_no = general_ledger.doc_no LIMIT 1)
        WHERE voucher_id IS NULL
    `).catch(() => {});

    // Add index
    await knex.schema.alterTable('general_ledger', (table) => {
        table.index('voucher_id', 'idx_gl_voucher_id_new');
    }).catch(() => {});

    // ========================================
    // 3. EMPLOYEES - Add standard columns
    // ========================================
    await safeAddColumn(knex, 'employees', 'employee_code', (table) => {
        table.string('employee_code', 50);
    });
    await safeAddColumn(knex, 'employees', 'full_name', (table) => {
        table.string('full_name', 200);
    });
    await safeAddColumn(knex, 'employees', 'department_id', (table) => {
        table.string('department_id', 50);
    });

    // Copy data
    await knex.raw(`
        UPDATE employees
        SET employee_code = code,
            full_name = name,
            department_id = department
        WHERE employee_code IS NULL
    `).catch(() => {});

    // Add indexes
    await knex.schema.alterTable('employees', (table) => {
        table.index('department_id', 'idx_emp_department_id_new');
        table.index('employee_code', 'idx_emp_employee_code');
    }).catch(() => {});

    // ========================================
    // 4. TIMEKEEPING - Add standard columns
    // ========================================
    await safeAddColumn(knex, 'timekeeping', 'work_date', (table) => {
        table.date('work_date');
    });
    await safeAddColumn(knex, 'timekeeping', 'check_in', (table) => {
        table.time('check_in');
    });
    await safeAddColumn(knex, 'timekeeping', 'check_out', (table) => {
        table.time('check_out');
    });
    await safeAddColumn(knex, 'timekeeping', 'work_hours', (table) => {
        table.decimal('work_hours', 5, 2);
    });
    await safeAddColumn(knex, 'timekeeping', 'created_at', (table) => {
        table.timestamp('created_at');
    });
    await safeAddColumn(knex, 'timekeeping', 'updated_at', (table) => {
        table.timestamp('updated_at');
    });

    // ========================================
    // 5. MATERIAL_RECEIPTS - Add standard columns
    // ========================================
    await safeAddColumn(knex, 'material_receipts', 'supplier_code', (table) => {
        table.string('supplier_code', 50);
    });

    await knex.raw(`
        UPDATE material_receipts SET supplier_code = supplier WHERE supplier_code IS NULL
    `).catch(() => {});

    // ========================================
    // 6. MATERIAL_ISSUES - Add standard columns
    // ========================================
    await safeAddColumn(knex, 'material_issues', 'department_id', (table) => {
        table.string('department_id', 50);
    });

    await knex.raw(`
        UPDATE material_issues SET department_id = department WHERE department_id IS NULL
    `).catch(() => {});

    // ========================================
    // 7. FIXED_ASSETS - Add standard columns
    // ========================================
    await safeAddColumn(knex, 'fixed_assets', 'asset_code', (table) => {
        table.string('asset_code', 50);
    });
    await safeAddColumn(knex, 'fixed_assets', 'asset_name', (table) => {
        table.string('asset_name', 255);
    });
    await safeAddColumn(knex, 'fixed_assets', 'department', (table) => {
        table.string('department', 100);
    });

    await knex.raw(`
        UPDATE fixed_assets
        SET asset_code = code,
            asset_name = name,
            department = dept
        WHERE asset_code IS NULL
    `).catch(() => {});

    // ========================================
    // 8. CONTRACTS - Add standard columns
    // ========================================
    await safeAddColumn(knex, 'contracts', 'contract_no', (table) => {
        table.string('contract_no', 50);
    });
    await safeAddColumn(knex, 'contracts', 'contract_name', (table) => {
        table.string('contract_name', 255);
    });
    await safeAddColumn(knex, 'contracts', 'partner_code', (table) => {
        table.string('partner_code', 50);
    });
    await safeAddColumn(knex, 'contracts', 'contract_type', (table) => {
        table.string('contract_type', 50);
    });
    await safeAddColumn(knex, 'contracts', 'sign_date', (table) => {
        table.date('sign_date');
    });
    await safeAddColumn(knex, 'contracts', 'total_value', (table) => {
        table.decimal('total_value', 18, 2);
    });

    await knex.raw(`
        UPDATE contracts
        SET contract_no = code,
            contract_name = name,
            partner_code = partner,
            contract_type = type,
            sign_date = date,
            total_value = value
        WHERE contract_no IS NULL
    `).catch(() => {});

    // ========================================
    // 9. PROJECTS - Add standard columns
    // ========================================
    await safeAddColumn(knex, 'projects', 'project_code', (table) => {
        table.string('project_code', 50);
    });
    await safeAddColumn(knex, 'projects', 'project_name', (table) => {
        table.string('project_name', 255);
    });
    await safeAddColumn(knex, 'projects', 'customer_code', (table) => {
        table.string('customer_code', 50);
    });
    await safeAddColumn(knex, 'projects', 'budget_amount', (table) => {
        table.decimal('budget_amount', 18, 2);
    });
    await safeAddColumn(knex, 'projects', 'spent_amount', (table) => {
        table.decimal('spent_amount', 18, 2).defaultTo(0);
    });
    await safeAddColumn(knex, 'projects', 'start_date', (table) => {
        table.date('start_date');
    });
    await safeAddColumn(knex, 'projects', 'end_date', (table) => {
        table.date('end_date');
    });

    await knex.raw(`
        UPDATE projects
        SET project_code = code,
            project_name = name,
            customer_code = customer,
            budget_amount = budget,
            start_date = start,
            end_date = "end"
        WHERE project_code IS NULL
    `).catch(() => {});

    // ========================================
    // 10. PROJECT_TASKS - Add standard columns
    // ========================================
    await safeAddColumn(knex, 'project_tasks', 'task_name', (table) => {
        table.string('task_name', 255);
    });
    await safeAddColumn(knex, 'project_tasks', 'assignee_id', (table) => {
        table.string('assignee_id', 50);
    });
    await safeAddColumn(knex, 'project_tasks', 'due_date', (table) => {
        table.date('due_date');
    });

    await knex.raw(`
        UPDATE project_tasks
        SET task_name = task,
            assignee_id = owner,
            due_date = deadline
        WHERE task_name IS NULL
    `).catch(() => {});

    // ========================================
    // 11. AUDIT_TRAIL - Add timestamp alias
    // ========================================
    await safeAddColumn(knex, 'audit_trail', 'timestamp', (table) => {
        table.timestamp('timestamp');
    });

    await knex.raw(`
        UPDATE audit_trail SET timestamp = created_at WHERE timestamp IS NULL
    `).catch(() => {});

    // ========================================
    // 12. BUDGET_ESTIMATES - Add account_code
    // ========================================
    await safeAddColumn(knex, 'budget_estimates', 'account_code', (table) => {
        table.string('account_code', 20);
    });

    // ========================================
    // 13. CREATE VIEWS FOR STANDARDIZED ACCESS
    // ========================================

    // View for voucher_items with standard names
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_voucher_items AS
        SELECT
            id,
            voucher_id,
            COALESCE(line_no, rowid) as line_no,
            description,
            COALESCE(debit_account, debit_acc) as debit_account,
            COALESCE(credit_account, credit_acc) as credit_account,
            amount,
            COALESCE(partner_code, '') as partner_code,
            COALESCE(product_code, item_code) as product_code,
            quantity,
            cost_price as unit_price,
            dim1, dim2, dim3, dim4, dim5,
            project_code,
            contract_code,
            fund_source_id,
            budget_estimate_id,
            deleted_at
        FROM voucher_items
    `).catch(() => {});

    // View for employees with standard names
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_employees AS
        SELECT
            id,
            COALESCE(employee_code, code) as employee_code,
            COALESCE(full_name, name) as full_name,
            date_of_birth,
            COALESCE(department_id, department) as department_id,
            position,
            salary_grade_id,
            salary_coefficient,
            start_date,
            contract_type,
            status,
            bank_account,
            bank_name,
            tax_code,
            insurance_number,
            created_at,
            updated_at,
            deleted_at
        FROM employees
    `).catch(() => {});

    // View for fixed_assets with standard names
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_fixed_assets AS
        SELECT
            id,
            COALESCE(asset_code, code) as asset_code,
            COALESCE(asset_name, name) as asset_name,
            asset_category,
            account_code,
            original_value,
            accumulated_depreciation,
            net_value,
            depreciation_method,
            useful_life,
            depreciation_rate,
            residual_value,
            purchase_date,
            usage_date,
            location,
            COALESCE(department, dept) as department,
            manager,
            status,
            fund_source_id,
            created_at,
            updated_at,
            deleted_at
        FROM fixed_assets
    `).catch(() => {});

    // View for contracts with standard names
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_contracts AS
        SELECT
            id,
            COALESCE(contract_no, code) as contract_no,
            COALESCE(contract_name, name) as contract_name,
            COALESCE(partner_code, partner) as partner_code,
            COALESCE(contract_type, type) as contract_type,
            COALESCE(sign_date, date) as sign_date,
            COALESCE(total_value, value) as total_value,
            received_or_paid,
            status,
            deleted_at
        FROM contracts
    `).catch(() => {});

    // View for projects with standard names
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_projects AS
        SELECT
            id,
            COALESCE(project_code, code) as project_code,
            COALESCE(project_name, name) as project_name,
            COALESCE(customer_code, customer) as customer_code,
            COALESCE(budget_amount, budget) as budget_amount,
            COALESCE(spent_amount, 0) as spent_amount,
            COALESCE(start_date, start) as start_date,
            COALESCE(end_date, "end") as end_date,
            progress,
            status,
            deleted_at
        FROM projects
    `).catch(() => {});

    console.log('[MIGRATION] Schema standardization completed');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Drop views
    await knex.raw('DROP VIEW IF EXISTS v_voucher_items').catch(() => {});
    await knex.raw('DROP VIEW IF EXISTS v_employees').catch(() => {});
    await knex.raw('DROP VIEW IF EXISTS v_fixed_assets').catch(() => {});
    await knex.raw('DROP VIEW IF EXISTS v_contracts').catch(() => {});
    await knex.raw('DROP VIEW IF EXISTS v_projects').catch(() => {});

    // Note: We don't remove the added columns to preserve data
    console.log('[MIGRATION] Schema standardization views dropped');
};
