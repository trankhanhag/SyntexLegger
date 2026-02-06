/**
 * Migration: Fix CCDC Items Schema
 * Add missing columns to ccdc_items table
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    const hasTable = await knex.schema.hasTable('ccdc_items');

    if (!hasTable) {
        // Create the table if it doesn't exist
        await knex.schema.createTable('ccdc_items', (table) => {
            table.string('id', 50).primary();
            table.string('code', 50).unique().notNullable();
            table.string('name', 255).notNullable();
            table.date('start_date');
            table.decimal('cost', 18, 2).defaultTo(0);
            table.integer('life_months').defaultTo(12);
            table.decimal('allocated', 18, 2).defaultTo(0);
            table.decimal('remaining', 18, 2).defaultTo(0);
            table.string('target_account', 20).defaultTo('642');
            table.string('status', 20).defaultTo('ACTIVE');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
        });
    } else {
        // Add missing columns if table exists
        const hasCreatedAt = await knex.schema.hasColumn('ccdc_items', 'created_at');
        if (!hasCreatedAt) {
            await knex.schema.alterTable('ccdc_items', (table) => {
                table.timestamp('created_at').defaultTo(knex.fn.now());
            });
        }

        const hasUpdatedAt = await knex.schema.hasColumn('ccdc_items', 'updated_at');
        if (!hasUpdatedAt) {
            await knex.schema.alterTable('ccdc_items', (table) => {
                table.timestamp('updated_at').defaultTo(knex.fn.now());
            });
        }

        const hasTargetAccount = await knex.schema.hasColumn('ccdc_items', 'target_account');
        if (!hasTargetAccount) {
            await knex.schema.alterTable('ccdc_items', (table) => {
                table.string('target_account', 20).defaultTo('642');
            });
        }

        const hasStatus = await knex.schema.hasColumn('ccdc_items', 'status');
        if (!hasStatus) {
            await knex.schema.alterTable('ccdc_items', (table) => {
                table.string('status', 20).defaultTo('ACTIVE');
            });
        }
    }

    console.log('[MIGRATION] CCDC Items schema fixed');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Cannot safely remove columns as data might depend on them
    console.log('[MIGRATION] CCDC Items schema fix - no rollback available');
};
