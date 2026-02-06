/**
 * Migration: Add Soft Delete Support
 * Adds deleted_at column to main tables for soft delete functionality
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Tables that should support soft delete
    const softDeleteTables = [
        // Core master data
        'partners',
        'products',
        'departments',
        'bank_accounts',
        // Transactions (important to keep history)
        'vouchers',
        'voucher_items',
        // HR
        'employees',
        'employee_contracts',
        'employee_allowances',
        'salary_grades',
        'allowance_types',
        // Assets
        'fixed_assets',
        'ccdc_items',
        // Inventory
        'materials',
        'material_receipts',
        'material_issues',
        // AR/AP
        'receivables',
        'payables',
        'temporary_advances',
        'budget_advances',
        // Budget
        'fund_sources',
        'budget_estimates',
        // Commercial
        'contracts',
        'projects',
        'project_tasks',
        'loan_contracts',
        'debt_notes',
        // Dimensions
        'dimensions',
        // Reports
        'report_templates',
        'financial_notes',
    ];

    for (const tableName of softDeleteTables) {
        const hasTable = await knex.schema.hasTable(tableName);
        if (!hasTable) continue;

        const hasDeletedAt = await knex.schema.hasColumn(tableName, 'deleted_at');
        if (!hasDeletedAt) {
            try {
                await knex.schema.alterTable(tableName, (table) => {
                    table.timestamp('deleted_at').nullable();
                });

                // Create index for soft delete queries
                await knex.schema.alterTable(tableName, (table) => {
                    table.index('deleted_at', `idx_${tableName.slice(0, 20)}_deleted`);
                }).catch(() => { });

            } catch (err) {
                console.log(`[MIGRATION] Skipping soft delete for ${tableName}: ${err.message}`);
            }
        }
    }

    // ========================================
    // CREATE VIEWS FOR ACTIVE RECORDS ONLY
    // ========================================

    // View for active partners
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_active_partners AS
        SELECT * FROM partners WHERE deleted_at IS NULL AND (is_active = 1 OR is_active IS NULL);
    `).catch(() => { });

    // View for active employees
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_active_employees AS
        SELECT * FROM employees WHERE deleted_at IS NULL AND (status = 'ACTIVE' OR status IS NULL);
    `).catch(() => { });

    // View for active materials
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_active_materials AS
        SELECT * FROM materials WHERE deleted_at IS NULL AND (is_active = 1 OR is_active IS NULL);
    `).catch(() => { });

    // View for active fixed assets
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_active_fixed_assets AS
        SELECT * FROM fixed_assets WHERE deleted_at IS NULL AND (is_active = 1 OR is_active IS NULL);
    `).catch(() => { });

    // View for non-voided vouchers
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_valid_vouchers AS
        SELECT * FROM vouchers WHERE deleted_at IS NULL AND status != 'VOIDED';
    `).catch(() => { });

    // View for active projects
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_active_projects AS
        SELECT * FROM projects WHERE deleted_at IS NULL AND status NOT IN ('CANCELLED', 'COMPLETED');
    `).catch(() => { });

    // View for open receivables
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_open_receivables AS
        SELECT * FROM receivables WHERE deleted_at IS NULL AND status IN ('OPEN', 'PARTIAL', 'OVERDUE');
    `).catch(() => { });

    // View for open payables
    await knex.raw(`
        CREATE VIEW IF NOT EXISTS v_open_payables AS
        SELECT * FROM payables WHERE deleted_at IS NULL AND status IN ('OPEN', 'PARTIAL', 'OVERDUE');
    `).catch(() => { });

    console.log('[MIGRATION] Soft delete support added');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Drop views
    await knex.raw('DROP VIEW IF EXISTS v_active_partners').catch(() => { });
    await knex.raw('DROP VIEW IF EXISTS v_active_employees').catch(() => { });
    await knex.raw('DROP VIEW IF EXISTS v_active_materials').catch(() => { });
    await knex.raw('DROP VIEW IF EXISTS v_active_fixed_assets').catch(() => { });
    await knex.raw('DROP VIEW IF EXISTS v_valid_vouchers').catch(() => { });
    await knex.raw('DROP VIEW IF EXISTS v_active_projects').catch(() => { });
    await knex.raw('DROP VIEW IF EXISTS v_open_receivables').catch(() => { });
    await knex.raw('DROP VIEW IF EXISTS v_open_payables').catch(() => { });

    // Note: We don't remove deleted_at columns to preserve data
    console.log('[MIGRATION] Soft delete views dropped');
};
