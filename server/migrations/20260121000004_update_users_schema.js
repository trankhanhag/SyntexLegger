/**
 * Update Users Schema
 * Add missing columns for full system support
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    const hasTable = await knex.schema.hasTable('users');
    if (hasTable) {
        const hasEmail = await knex.schema.hasColumn('users', 'email');
        if (!hasEmail) {
            await knex.schema.alterTable('users', (table) => {
                table.string('email', 200);
            });
        }

        const hasRole = await knex.schema.hasColumn('users', 'role');
        if (!hasRole) {
            await knex.schema.alterTable('users', (table) => {
                table.string('role', 50).defaultTo('user');
            });
        }

        const hasCompanyId = await knex.schema.hasColumn('users', 'company_id');
        if (!hasCompanyId) {
            await knex.schema.alterTable('users', (table) => {
                table.integer('company_id').defaultTo(1);
            });
        }

        const hasIsActive = await knex.schema.hasColumn('users', 'is_active');
        if (!hasIsActive) {
            await knex.schema.alterTable('users', (table) => {
                table.boolean('is_active').defaultTo(true);
            });
        }
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return Promise.resolve();
};
