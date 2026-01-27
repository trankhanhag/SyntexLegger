/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        // Table: report_templates
        .createTableIfNotExists('report_templates', function (table) {
            table.uuid('id').primary();
            table.string('name').notNullable();
            table.string('description');
            table.text('template_data'); // JSON structure of parsed template
            table.text('field_mappings'); // JSON mapping config
            table.text('aggregation_rules'); // JSON aggregation rules
            table.string('original_filename');
            table.integer('original_file_size');
            table.string('created_by');
            table.string('company_id');
            table.boolean('is_shared').defaultTo(false);
            table.boolean('is_active').defaultTo(true);
            table.integer('usage_count').defaultTo(0);
            table.timestamp('last_used_at');
            table.timestamps(true, true);
        })
        // Table: report_generation_logs
        .createTableIfNotExists('report_generation_logs', function (table) {
            table.increments('id');
            table.uuid('template_id').references('id').inTable('report_templates');
            table.string('template_name');
            table.text('parameters'); // JSON parameters used
            table.integer('row_count');
            table.string('output_format'); // 'view', 'excel', 'pdf'
            table.integer('generation_time_ms');
            table.string('generated_by');
            table.string('status'); // 'success', 'failed'
            table.timestamp('generated_at').defaultTo(knex.fn.now());
        })
        // Table: db_schema_metadata
        .createTableIfNotExists('db_schema_metadata', function (table) {
            table.string('table_name').primary();
            table.string('friendly_name');
            table.string('description');
            table.text('common_aliases'); // JSON array of Vietnamese terms: ["Số chứng từ", "SCT"]
            table.text('key_columns'); // JSON array: ["id", "doc_no"]
            table.integer('priority').defaultTo(0); // For ranking suggestions
            table.text('sample_queries');
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('db_schema_metadata')
        .dropTableIfExists('report_generation_logs')
        .dropTableIfExists('report_templates');
};
