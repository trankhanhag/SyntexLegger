/**
 * Update Chart of Accounts Schema
 * Add missing columns for TT24 compliance
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    const hasTable = await knex.schema.hasTable('chart_of_accounts');
    if (hasTable) {
        const hasIsActive = await knex.schema.hasColumn('chart_of_accounts', 'is_active');
        if (!hasIsActive) {
            await knex.schema.alterTable('chart_of_accounts', (table) => {
                table.boolean('is_active').defaultTo(true);
            });
        }

        const hasIsOffBalance = await knex.schema.hasColumn('chart_of_accounts', 'is_off_balance');
        if (!hasIsOffBalance) {
            await knex.schema.alterTable('chart_of_accounts', (table) => {
                table.integer('is_off_balance').defaultTo(0);
            });
        }

        const hasIsParent = await knex.schema.hasColumn('chart_of_accounts', 'is_parent');
        if (!hasIsParent) {
            await knex.schema.alterTable('chart_of_accounts', (table) => {
                table.boolean('is_parent').defaultTo(false);
            });
        }
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    // SQLite does not support dropping columns easily in basic migrations without table recreation
    // ensuring simple rollback is tricky for added columns in SQLite
    return Promise.resolve();
};
