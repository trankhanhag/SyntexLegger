/**
 * Migration: Create backup_history and restore_history tables
 * Sao lưu và khôi phục dữ liệu kế toán
 */

exports.up = function(knex) {
    return knex.schema
        // Bảng lịch sử backup
        .createTable('backup_history', function(table) {
            table.string('id', 36).primary(); // UUID
            table.string('backup_type', 20).notNullable(); // MANUAL, SCHEDULED, PRE_RESTORE
            table.string('file_name', 255).notNullable();
            table.bigInteger('file_size').defaultTo(0); // Size in bytes
            table.integer('record_count').defaultTo(0);
            table.integer('table_count').defaultTo(0);

            // Status tracking
            table.string('status', 20).defaultTo('COMPLETED'); // IN_PROGRESS, COMPLETED, FAILED, CANCELLED
            table.integer('progress').defaultTo(0); // 0-100 percentage
            table.text('error_message');

            // Timing
            table.timestamp('started_at').notNullable();
            table.timestamp('completed_at');
            table.integer('duration_seconds').defaultTo(0);

            // User and metadata
            table.string('created_by', 100).notNullable();
            table.text('notes');
            table.string('checksum', 64); // SHA256 hash
            table.text('manifest'); // JSON manifest

            // Encryption
            table.boolean('is_encrypted').defaultTo(false);

            // Restore tracking
            table.timestamp('last_restored_at');
            table.integer('restore_count').defaultTo(0);

            // File path for scheduled backups stored on server
            table.string('file_path', 500);

            table.timestamps(true, true);

            // Indexes
            table.index('status');
            table.index('backup_type');
            table.index('created_at');
        })
        // Bảng lịch sử restore
        .createTable('restore_history', function(table) {
            table.string('id', 36).primary(); // UUID
            table.string('backup_id', 36).references('id').inTable('backup_history').onDelete('SET NULL');
            table.string('backup_file_name', 255).notNullable();

            // Status tracking
            table.string('status', 20).defaultTo('COMPLETED'); // IN_PROGRESS, COMPLETED, FAILED, ROLLED_BACK
            table.integer('progress').defaultTo(0);
            table.text('error_message');

            // Statistics
            table.integer('tables_restored').defaultTo(0);
            table.integer('records_restored').defaultTo(0);

            // Timing
            table.timestamp('started_at').notNullable();
            table.timestamp('completed_at');
            table.integer('duration_seconds').defaultTo(0);

            // User and metadata
            table.string('restored_by', 100).notNullable();
            table.text('notes');
            table.string('pre_restore_backup_id', 36).references('id').inTable('backup_history').onDelete('SET NULL');

            table.timestamps(true, true);

            // Indexes
            table.index('status');
            table.index('created_at');
        })
        // Thêm settings cho scheduled backup
        .then(function() {
            return knex('system_settings').insert([
                { key: 'backup_schedule_enabled', value: 'false', description: 'Bật/tắt backup tự động' },
                { key: 'backup_schedule_frequency', value: 'daily', description: 'Tần suất backup: daily, weekly' },
                { key: 'backup_schedule_time', value: '02:00', description: 'Giờ chạy backup (HH:mm)' },
                { key: 'backup_schedule_day', value: '0', description: 'Ngày trong tuần (0=CN, 1-6) - chỉ dùng cho weekly' },
                { key: 'backup_retention_count', value: '7', description: 'Số bản backup giữ lại' },
                { key: 'backup_encryption_default', value: 'false', description: 'Mặc định mã hóa backup' }
            ]).catch(function() {
                // Ignore if settings already exist
            });
        });
};

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('restore_history')
        .dropTableIfExists('backup_history')
        .then(function() {
            return knex('system_settings')
                .whereIn('key', [
                    'backup_schedule_enabled',
                    'backup_schedule_frequency',
                    'backup_schedule_time',
                    'backup_schedule_day',
                    'backup_retention_count',
                    'backup_encryption_default'
                ])
                .delete();
        });
};
