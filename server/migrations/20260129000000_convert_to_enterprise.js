/**
 * Migration: Convert HCSN to Enterprise Accounting
 * SyntexLegger - Chuyển đổi từ TT 24/2024 (HCSN) sang TT 99/2025 (DN)
 *
 * This migration:
 * 1. Updates chart_of_accounts schema (tt24_class → tt99_class)
 * 2. Drops HCSN-specific tables that are no longer needed
 * 3. Updates terminology in settings and metadata
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    console.log('=== Converting to Enterprise Accounting (TT 99/2025) ===');

    // 1. Update chart_of_accounts schema
    const hasCOA = await knex.schema.hasTable('chart_of_accounts');
    if (hasCOA) {
        // Check if tt24_class column exists
        const hasOldColumn = await knex.schema.hasColumn('chart_of_accounts', 'tt24_class');
        const hasNewColumn = await knex.schema.hasColumn('chart_of_accounts', 'tt99_class');

        if (hasOldColumn && !hasNewColumn) {
            console.log('Renaming tt24_class to tt99_class in chart_of_accounts...');
            await knex.schema.alterTable('chart_of_accounts', (table) => {
                table.renameColumn('tt24_class', 'tt99_class');
            });
        } else if (!hasNewColumn) {
            console.log('Adding tt99_class column to chart_of_accounts...');
            await knex.schema.alterTable('chart_of_accounts', (table) => {
                table.string('tt99_class', 50);
            });
        }
    }

    // 2. Drop HCSN-specific tables (soft drop - only if exist)
    const tablesToDrop = [
        'treasury_imports',
        'treasury_exports',
        'treasury_reconciliation',
        'budget_commitments',
        'off_balance_logs'
    ];

    for (const tableName of tablesToDrop) {
        const exists = await knex.schema.hasTable(tableName);
        if (exists) {
            console.log(`Dropping HCSN table: ${tableName}...`);
            await knex.schema.dropTable(tableName);
        }
    }

    // 3. Update settings - change default accounting standard reference
    const hasSettings = await knex.schema.hasTable('settings');
    if (hasSettings) {
        console.log('Updating settings for enterprise accounting...');
        await knex('settings')
            .where('key', 'accounting_standard')
            .update({
                value: 'TT 99/2025',
                updated_at: knex.fn.now()
            });

        // Insert if not exists
        const standardExists = await knex('settings')
            .where('key', 'accounting_standard')
            .first();

        if (!standardExists) {
            await knex('settings').insert({
                key: 'accounting_standard',
                value: 'TT 99/2025',
                description: 'Chế độ kế toán áp dụng (TT 99/2025/TT-BTC)',
                created_at: knex.fn.now(),
                updated_at: knex.fn.now()
            });
        }

        // Update system type
        await knex('settings')
            .where('key', 'system_type')
            .update({
                value: 'ENTERPRISE',
                updated_at: knex.fn.now()
            });

        const typeExists = await knex('settings')
            .where('key', 'system_type')
            .first();

        if (!typeExists) {
            await knex('settings').insert({
                key: 'system_type',
                value: 'ENTERPRISE',
                description: 'Loại hệ thống kế toán (ENTERPRISE = Doanh nghiệp)',
                created_at: knex.fn.now(),
                updated_at: knex.fn.now()
            });
        }
    }

    console.log('=== Enterprise conversion completed ===');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    console.log('=== Reverting to HCSN Accounting (TT 24/2024) ===');

    // 1. Revert chart_of_accounts schema
    const hasCOA = await knex.schema.hasTable('chart_of_accounts');
    if (hasCOA) {
        const hasNewColumn = await knex.schema.hasColumn('chart_of_accounts', 'tt99_class');
        const hasOldColumn = await knex.schema.hasColumn('chart_of_accounts', 'tt24_class');

        if (hasNewColumn && !hasOldColumn) {
            console.log('Renaming tt99_class back to tt24_class in chart_of_accounts...');
            await knex.schema.alterTable('chart_of_accounts', (table) => {
                table.renameColumn('tt99_class', 'tt24_class');
            });
        }
    }

    // 2. Recreate HCSN-specific tables (basic structure)
    // Treasury imports
    const hasTreasuryImports = await knex.schema.hasTable('treasury_imports');
    if (!hasTreasuryImports) {
        console.log('Recreating treasury_imports table...');
        await knex.schema.createTable('treasury_imports', (table) => {
            table.string('id', 50).primary();
            table.date('import_date').notNullable();
            table.string('file_name', 255);
            table.text('description');
            table.string('status', 20).defaultTo('pending');
            table.integer('record_count').defaultTo(0);
            table.string('created_by', 100);
            table.timestamp('created_at').defaultTo(knex.fn.now());
        });
    }

    // Budget commitments
    const hasBudgetCommitments = await knex.schema.hasTable('budget_commitments');
    if (!hasBudgetCommitments) {
        console.log('Recreating budget_commitments table...');
        await knex.schema.createTable('budget_commitments', (table) => {
            table.string('id', 50).primary();
            table.string('commitment_no', 50).notNullable();
            table.date('commitment_date').notNullable();
            table.string('budget_estimate_id', 50);
            table.decimal('committed_amount', 18, 2).defaultTo(0);
            table.text('description');
            table.string('status', 20).defaultTo('active');
            table.string('created_by', 100);
            table.timestamp('created_at').defaultTo(knex.fn.now());
        });
    }

    // 3. Revert settings
    const hasSettings = await knex.schema.hasTable('settings');
    if (hasSettings) {
        console.log('Reverting settings for HCSN accounting...');
        await knex('settings')
            .where('key', 'accounting_standard')
            .update({
                value: 'TT 24/2024',
                updated_at: knex.fn.now()
            });

        await knex('settings')
            .where('key', 'system_type')
            .update({
                value: 'HCSN',
                updated_at: knex.fn.now()
            });
    }

    console.log('=== HCSN reversion completed ===');
};
