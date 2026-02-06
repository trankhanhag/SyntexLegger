/**
 * Migration: Clean All Sample Data
 * Removes all sample/demo data while preserving seed data (roles, users, chart_of_accounts, etc.)
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    console.log('[MIGRATION] Cleaning all sample data...');

    // Disable foreign key checks for SQLite
    await knex.raw('PRAGMA foreign_keys = OFF').catch(() => {});

    // ========================================
    // TABLES TO CLEAN (Sample/Transaction Data)
    // Order matters - delete child tables first
    // ========================================
    const tablesToClean = [
        // Transaction tables
        'vouchers',
        'voucher_items',
        'general_ledger',
        'staging_transactions',

        // Business data tables
        'partners',
        'bank_accounts',
        'employees',
        'timekeeping',
        'payroll_records',

        // Fixed assets & CCDC
        'fixed_assets',
        'ccdc_items',
        'allocation_history',
        'depreciation_records',

        // Sales & Purchase
        'sales_orders',
        'sales_invoices',
        'purchase_orders',
        'purchase_invoices',
        'allocations',

        // Contracts & Projects
        'contracts',
        'contract_appendices',
        'projects',
        'project_tasks',
        'project_budget_lines',

        // Loans
        'loan_contracts',
        'debt_notes',

        // Dimensions (sample values, not configs)
        'dimensions',
        'dimension_groups',
        'dimension_group_members',

        // Budget data
        'budgets',

        // Products & Materials
        'products',
        'materials',
        'material_receipts',
        'material_receipt_items',
        'material_issues',
        'material_issue_items',
        'inventory_transactions',

        // Off-balance
        'off_balance_tracking',

        // Receivables & Payables
        'receivables',
        'payables',

        // Audit & Logs (optional - keep for production)
        // 'audit_trail',
        // 'system_logs',
    ];

    for (const table of tablesToClean) {
        try {
            const hasTable = await knex.schema.hasTable(table);
            if (hasTable) {
                await knex(table).del();
                console.log(`[CLEAN] Deleted all records from ${table}`);
            }
        } catch (err) {
            console.log(`[SKIP] ${table}: ${err.message}`);
        }
    }

    // ========================================
    // TABLES TO PRESERVE (Seed Data)
    // ========================================
    // The following tables should NOT be cleaned:
    // - users (admin user)
    // - companies (default company)
    // - roles (admin, accountant, viewer)
    // - system_settings (config)
    // - chart_of_accounts (TT 99/2025)
    // - dimension_configs (5 dimension settings)
    // - checklist_tasks (period closing checklist)
    // - revenue_categories (revenue sources)
    // - expense_categories (expense types)
    // - salary_grades (salary grade levels)
    // - allowance_types (allowance definitions)
    // - fund_sources (funding sources)
    // - budget_estimates (budget structure)
    // - approval_workflow_rules (workflow settings)

    // Re-enable foreign key checks
    await knex.raw('PRAGMA foreign_keys = ON').catch(() => {});

    console.log('[MIGRATION] Sample data cleanup completed');
    console.log('[MIGRATION] Preserved: users, companies, roles, chart_of_accounts, system_settings');
    console.log('[MIGRATION] Preserved: dimension_configs, checklist_tasks, revenue_categories, expense_categories');
    console.log('[MIGRATION] Preserved: salary_grades, allowance_types, fund_sources, budget_estimates');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Cannot restore deleted sample data
    console.log('[MIGRATION] Sample data restoration not supported');
};
