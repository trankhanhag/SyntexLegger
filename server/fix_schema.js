const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig.development);

async function fixSchema() {
    try {
        console.log('Starting schema fix...');

        // 1. Drop conflicting tables
        console.log('Dropping tables...');
        await knex.schema.dropTableIfExists('db_schema_metadata');
        await knex.schema.dropTableIfExists('report_generation_logs');
        await knex.schema.dropTableIfExists('ai_mapping_cache');
        await knex.schema.dropTableIfExists('report_templates');

        // 2. Remove the old migration record from knex_migrations
        console.log('Removing old migration record...');
        await knex('knex_migrations')
            .where('name', 'like', '%20260125000001_custom_report_tables%')
            .del();

        await knex('knex_migrations')
            .where('name', 'like', '%20260125033553_create_custom_report_tables%')
            .del();

        console.log('Clean up complete. You can now run migrations.');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing schema:', error);
        process.exit(1);
    }
}

fixSchema();
