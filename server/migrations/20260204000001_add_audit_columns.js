/**
 * Migration: Add Audit Columns
 * Ensures all main tables have created_at, updated_at, created_by, updated_by
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // List of tables that need audit columns
    const tablesToAudit = [
        // Core tables
        'bank_accounts',
        'partners',
        'products',
        'departments',
        // Voucher tables
        'allocations',
        'staging_transactions',
        // HR tables
        'employees',
        'salary_grades',
        'allowance_types',
        'employee_allowances',
        'payroll_periods',
        'payroll_details',
        'employee_contracts',
        'salary_history',
        'timekeeping',
        // Asset tables
        'fixed_assets',
        'asset_depreciation_log',
        'allocation_history',
        'asset_inventory',
        'asset_inventory_items',
        'asset_movements',
        // Inventory tables
        'materials',
        'material_receipts',
        'material_receipt_items',
        'material_issues',
        'material_issue_items',
        'material_transfers',
        'material_transfer_items',
        'inventory_cards',
        // AR/AP tables
        'receivables',
        'payables',
        'receivable_payments',
        'payable_payments',
        'temporary_advances',
        'budget_advances',
        // Budget tables
        'fund_sources',
        'budget_estimates',
        'budget_allocations',
        'budget_transactions',
        'budget_periods',
        'budget_authorizations',
        'budget_alerts',
        'approval_workflow_rules',
        'revenue_categories',
        'expense_categories',
        // Commercial tables
        'contracts',
        'contract_appendices',
        'projects',
        'project_tasks',
        'project_budget_lines',
        'sales_orders',
        'sales_invoices',
        'purchase_orders',
        'purchase_invoices',
        'loan_contracts',
        'debt_notes',
        'dimensions',
        'dimension_configs',
        'checklist_tasks',
        // Treasury tables
        'treasury_imports',
        'reconciliation_logs',
        'payment_orders',
        // E-Invoice tables
        'einvoice_providers',
        'einvoice_imports',
        'einvoice_sync_logs',
        'einvoice_voucher_matches',
        // Report tables
        'report_templates',
        'report_generation_logs',
        // Financial notes
        'financial_notes',
        'financial_note_values',
    ];

    for (const tableName of tablesToAudit) {
        const hasTable = await knex.schema.hasTable(tableName);
        if (!hasTable) {
            continue; // Skip if table doesn't exist
        }

        try {
            // Check and add created_at
            const hasCreatedAt = await knex.schema.hasColumn(tableName, 'created_at');
            if (!hasCreatedAt) {
                await knex.schema.alterTable(tableName, (table) => {
                    table.timestamp('created_at').defaultTo(knex.fn.now());
                });
            }

            // Check and add updated_at
            const hasUpdatedAt = await knex.schema.hasColumn(tableName, 'updated_at');
            if (!hasUpdatedAt) {
                await knex.schema.alterTable(tableName, (table) => {
                    table.timestamp('updated_at').defaultTo(knex.fn.now());
                });
            }

            // Check and add created_by
            const hasCreatedBy = await knex.schema.hasColumn(tableName, 'created_by');
            if (!hasCreatedBy) {
                await knex.schema.alterTable(tableName, (table) => {
                    table.string('created_by', 100).nullable();
                });
            }

            // Check and add updated_by
            const hasUpdatedBy = await knex.schema.hasColumn(tableName, 'updated_by');
            if (!hasUpdatedBy) {
                await knex.schema.alterTable(tableName, (table) => {
                    table.string('updated_by', 100).nullable();
                });
            }
        } catch (err) {
            console.log(`[MIGRATION] Skipping ${tableName}: ${err.message}`);
        }
    }

    // ========================================
    // CREATE UPDATE TRIGGERS FOR updated_at
    // ========================================
    const triggersToCreate = [
        'vouchers',
        'voucher_items',
        'partners',
        'employees',
        'fixed_assets',
        'materials',
        'receivables',
        'payables',
        'contracts',
        'projects',
    ];

    for (const tableName of triggersToCreate) {
        const hasTable = await knex.schema.hasTable(tableName);
        if (!hasTable) continue;

        try {
            await knex.raw(`
                CREATE TRIGGER IF NOT EXISTS trg_${tableName}_updated_at
                AFTER UPDATE ON ${tableName}
                FOR EACH ROW
                BEGIN
                    UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE rowid = NEW.rowid;
                END;
            `);
        } catch (err) {
            // Trigger may already exist
        }
    }

    console.log('[MIGRATION] Audit columns added to all tables');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Note: We don't remove audit columns in down migration
    // as it would cause data loss
    console.log('[MIGRATION] Audit columns rollback - no action taken to preserve data');
};
