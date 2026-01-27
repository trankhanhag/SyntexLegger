/**
 * Update System Settings Schema
 * Add description column
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    const hasTable = await knex.schema.hasTable('system_settings');
    if (hasTable) {
        const hasDescription = await knex.schema.hasColumn('system_settings', 'description');
        if (!hasDescription) {
            await knex.schema.alterTable('system_settings', (table) => {
                table.string('description', 500);
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
