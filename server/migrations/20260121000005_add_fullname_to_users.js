/**
 * Update Users Schema
 * Add full_name column
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    const hasTable = await knex.schema.hasTable('users');
    if (hasTable) {
        const hasFullName = await knex.schema.hasColumn('users', 'full_name');
        if (!hasFullName) {
            await knex.schema.alterTable('users', (table) => {
                table.string('full_name', 200);
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
