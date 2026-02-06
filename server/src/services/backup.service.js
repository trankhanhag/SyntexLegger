/**
 * Backup Service
 * Handles database backup and restore operations for SQLite and PostgreSQL
 * Supports optional AES-256-GCM encryption
 */

const archiver = require('archiver');
const unzipper = require('unzipper');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const { NotFoundError, ValidationError } = require('../errors');
const logger = require('../utils/logger');

// Tables to exclude from backup (system/migration tables + backup history)
const EXCLUDED_TABLES = [
    'knex_migrations',
    'knex_migrations_lock',
    'sqlite_sequence',
    'backup_history',
    'restore_history'
];

// Encryption constants
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

class BackupService {
    constructor(knex) {
        this.knex = knex;
        this.progressCallbacks = new Map();
    }

    /**
     * Get database client type
     */
    getClientType() {
        const client = this.knex.client.config.client;
        if (client === 'better-sqlite3' || client === 'sqlite3') {
            return 'sqlite';
        }
        return 'postgresql';
    }

    /**
     * Get all table names from database
     */
    async getTableNames() {
        const clientType = this.getClientType();

        if (clientType === 'sqlite') {
            const tables = await this.knex.raw(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            );
            return tables.map(t => t.name).filter(name => !EXCLUDED_TABLES.includes(name));
        } else {
            const tables = await this.knex.raw(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            );
            return tables.rows.map(t => t.tablename).filter(name => !EXCLUDED_TABLES.includes(name));
        }
    }

    /**
     * Get record count for a table
     */
    async getTableCount(tableName) {
        const result = await this.knex(tableName).count('* as count').first();
        return parseInt(result.count) || 0;
    }

    /**
     * Export single table to JSON
     */
    async exportTable(tableName) {
        return await this.knex(tableName).select('*');
    }

    /**
     * Derive encryption key from password
     */
    deriveKey(password, salt) {
        return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
    }

    /**
     * Encrypt buffer with AES-256-GCM
     */
    encryptBuffer(buffer, password) {
        const salt = crypto.randomBytes(SALT_LENGTH);
        const key = this.deriveKey(password, salt);
        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // Format: salt (32) + iv (16) + authTag (16) + encrypted data
        return Buffer.concat([salt, iv, authTag, encrypted]);
    }

    /**
     * Decrypt buffer with AES-256-GCM
     */
    decryptBuffer(buffer, password) {
        const salt = buffer.subarray(0, SALT_LENGTH);
        const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

        const key = this.deriveKey(password, salt);
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }

    /**
     * Update progress for a backup/restore operation
     */
    updateProgress(id, data) {
        const callback = this.progressCallbacks.get(id);
        if (callback) callback(data);
    }

    /**
     * Subscribe to progress updates
     */
    subscribeProgress(id, callback) {
        this.progressCallbacks.set(id, callback);
    }

    /**
     * Unsubscribe from progress updates
     */
    unsubscribeProgress(id) {
        this.progressCallbacks.delete(id);
    }

    /**
     * Create full backup archive
     * @param {string} userId - User creating the backup
     * @param {Object} options - Backup options
     * @param {string} options.type - Backup type (MANUAL, SCHEDULED, PRE_RESTORE)
     * @param {boolean} options.encrypt - Whether to encrypt the backup
     * @param {string} options.password - Encryption password (required if encrypt=true)
     * @param {string} options.notes - Optional notes
     * @returns {Object} Backup result with buffer and metadata
     */
    async createBackup(userId, options = {}) {
        const backupId = uuidv4();
        const startTime = Date.now();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `backup_${timestamp}.slbak`;

        logger.info('[BackupService] Starting backup:', backupId);

        // Initialize progress
        this.updateProgress(backupId, { status: 'IN_PROGRESS', progress: 0, phase: 'Đang khởi tạo...' });

        try {
            // Record start in database
            logger.info('[BackupService] Recording backup start in database...');
            await this.knex('backup_history').insert({
                id: backupId,
                backup_type: options.type || 'MANUAL',
                file_name: fileName,
                status: 'IN_PROGRESS',
                progress: 0,
                started_at: new Date(),
                created_by: userId,
                notes: options.notes || null,
                is_encrypted: !!options.encrypt
            });

            // Get all tables
            logger.info('[BackupService] Getting table names...');
            const tables = await this.getTableNames();
            logger.info('[BackupService] Found', tables.length, 'tables');
            this.updateProgress(backupId, { progress: 5, phase: `Đang export ${tables.length} bảng dữ liệu...` });

            const manifest = {
                version: '1.0.0',
                created_at: new Date().toISOString(),
                created_by: userId,
                database_type: this.getClientType(),
                schema_version: '2.0.0',
                app_version: '1.0.0',
                is_encrypted: !!options.encrypt,
                statistics: {
                    total_tables: tables.length,
                    total_records: 0,
                    tables: {}
                },
                excluded_tables: EXCLUDED_TABLES
            };

            // Create ZIP archive in memory
            logger.info('[BackupService] Creating archive...');
            const archive = archiver('zip', { zlib: { level: 9 } });
            const chunks = [];

            // Set up event handlers BEFORE any operations
            const archivePromise = new Promise((resolve, reject) => {
                archive.on('end', () => {
                    logger.info('[BackupService] Archive finalized, total bytes:', chunks.reduce((a, c) => a + c.length, 0));
                    resolve();
                });
                archive.on('error', (err) => {
                    logger.error('[BackupService] Archive error:', err);
                    reject(err);
                });
                archive.on('warning', (err) => {
                    logger.warn('[BackupService] Archive warning:', err);
                });
            });

            archive.on('data', chunk => chunks.push(chunk));

            // Export each table
            for (let i = 0; i < tables.length; i++) {
                const tableName = tables[i];
                logger.info('[BackupService] Exporting table:', tableName);
                const data = await this.exportTable(tableName);

                manifest.statistics.tables[tableName] = data.length;
                manifest.statistics.total_records += data.length;

                archive.append(JSON.stringify(data, null, 2), {
                    name: `data/${tableName}.json`
                });

                // Update progress (5-85%)
                const progress = 5 + Math.round(((i + 1) / tables.length) * 80);
                this.updateProgress(backupId, {
                    progress,
                    phase: `Đang export bảng ${tableName} (${i + 1}/${tables.length})...`
                });
            }

            // Add manifest
            logger.info('[BackupService] Adding manifest, total records:', manifest.statistics.total_records);
            archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

            // Finalize and wait for completion
            logger.info('[BackupService] Finalizing archive...');
            archive.finalize();
            await archivePromise;

            let buffer = Buffer.concat(chunks);
            logger.info('[BackupService] Buffer created, size:', buffer.length);
            const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

            this.updateProgress(backupId, { progress: 90, phase: 'Đang hoàn tất...' });

            // Encrypt if requested
            if (options.encrypt && options.password) {
                this.updateProgress(backupId, { progress: 92, phase: 'Đang mã hóa...' });
                buffer = this.encryptBuffer(buffer, options.password);
            }

            const completedAt = new Date();
            const durationSeconds = Math.round((Date.now() - startTime) / 1000);

            // Update backup history
            await this.knex('backup_history').where('id', backupId).update({
                file_size: buffer.length,
                record_count: manifest.statistics.total_records,
                table_count: tables.length,
                status: 'COMPLETED',
                progress: 100,
                completed_at: completedAt,
                duration_seconds: durationSeconds,
                checksum: checksum,
                manifest: JSON.stringify(manifest)
            });

            this.updateProgress(backupId, { status: 'COMPLETED', progress: 100, phase: 'Hoàn thành!' });

            return {
                backupId,
                fileName,
                buffer,
                manifest,
                checksum,
                fileSize: buffer.length,
                isEncrypted: !!options.encrypt
            };

        } catch (error) {
            // Update status to failed
            await this.knex('backup_history').where('id', backupId).update({
                status: 'FAILED',
                error_message: error.message,
                completed_at: new Date()
            });

            this.updateProgress(backupId, { status: 'FAILED', error: error.message });
            throw error;
        }
    }

    /**
     * Validate uploaded backup file
     * @param {Buffer} buffer - Backup file buffer
     * @param {string} password - Decryption password (if encrypted)
     * @returns {Object} Validation result with manifest
     */
    async validateBackup(buffer, password = null) {
        try {
            let decryptedBuffer = buffer;

            // Check if encrypted (by trying to parse as ZIP first)
            let isEncrypted = false;
            try {
                await unzipper.Open.buffer(buffer);
            } catch {
                isEncrypted = true;
            }

            // Decrypt if needed
            if (isEncrypted) {
                if (!password) {
                    return {
                        valid: false,
                        isEncrypted: true,
                        error: 'File backup đã được mã hóa. Vui lòng nhập mật khẩu.'
                    };
                }
                try {
                    decryptedBuffer = this.decryptBuffer(buffer, password);
                } catch (err) {
                    return {
                        valid: false,
                        isEncrypted: true,
                        error: 'Mật khẩu không đúng hoặc file bị hỏng.'
                    };
                }
            }

            // Open ZIP archive
            const directory = await unzipper.Open.buffer(decryptedBuffer);

            // Check for manifest
            const manifestEntry = directory.files.find(f => f.path === 'manifest.json');
            if (!manifestEntry) {
                return {
                    valid: false,
                    error: 'File backup không hợp lệ: thiếu manifest.json'
                };
            }

            const manifestContent = await manifestEntry.buffer();
            const manifest = JSON.parse(manifestContent.toString());

            // Validate manifest structure
            if (!manifest.version || !manifest.created_at || !manifest.statistics) {
                return {
                    valid: false,
                    error: 'File backup không hợp lệ: manifest bị hỏng'
                };
            }

            // List available tables
            const dataFiles = directory.files.filter(f => f.path.startsWith('data/') && f.path.endsWith('.json'));
            const tables = dataFiles.map(f => f.path.replace('data/', '').replace('.json', ''));

            return {
                valid: true,
                isEncrypted,
                manifest,
                tables,
                fileCount: directory.files.length,
                decryptedBuffer
            };

        } catch (error) {
            return {
                valid: false,
                error: `Lỗi đọc file backup: ${error.message}`
            };
        }
    }

    /**
     * Execute restore operation
     * @param {Buffer} buffer - Backup file buffer (decrypted)
     * @param {string} userId - User performing restore
     * @param {Object} options - Restore options
     * @param {boolean} options.createPreRestoreBackup - Create backup before restore
     * @returns {Object} Restore result
     */
    async executeRestore(buffer, userId, options = {}) {
        const restoreId = uuidv4();
        const startTime = Date.now();

        logger.info('[BackupService] Starting restore:', restoreId);
        logger.info('[BackupService] Buffer size:', buffer.length);
        this.updateProgress(restoreId, { status: 'IN_PROGRESS', progress: 0, phase: 'Đang khởi tạo...' });

        try {
            // Validate backup first
            logger.info('[BackupService] Validating backup before restore...');
            const validation = await this.validateBackup(buffer, options.password);
            if (!validation.valid) {
                logger.error('[BackupService] Validation failed:', validation.error);
                throw new ValidationError(validation.error || 'File backup không hợp lệ');
            }
            logger.info('[BackupService] Validation passed, tables:', validation.tables?.length);

            // Use decrypted buffer
            const decryptedBuffer = validation.decryptedBuffer || buffer;

            // Create pre-restore backup if requested
            let preRestoreBackupId = null;
            if (options.createPreRestoreBackup !== false) {
                this.updateProgress(restoreId, { progress: 5, phase: 'Đang tạo bản sao lưu trước khi khôi phục...' });
                const preBackup = await this.createBackup(userId, { type: 'PRE_RESTORE' });
                preRestoreBackupId = preBackup.backupId;
            }

            // Record restore start
            await this.knex('restore_history').insert({
                id: restoreId,
                backup_file_name: validation.manifest.file_name || 'uploaded.slbak',
                status: 'IN_PROGRESS',
                progress: 0,
                started_at: new Date(),
                restored_by: userId,
                pre_restore_backup_id: preRestoreBackupId
            });

            this.updateProgress(restoreId, { progress: 15, phase: 'Đang chuẩn bị khôi phục...' });

            // Open the archive
            const directory = await unzipper.Open.buffer(decryptedBuffer);
            const dataFiles = directory.files.filter(f => f.path.startsWith('data/') && f.path.endsWith('.json'));

            let restoredTables = 0;
            let restoredRecords = 0;

            // Determine restore order (handle foreign key dependencies)
            const orderedTables = await this.getRestoreOrder(dataFiles);

            // Disable foreign key checks BEFORE transaction for SQLite
            const isSqlite = this.getClientType() === 'sqlite';
            if (isSqlite) {
                await this.knex.raw('PRAGMA foreign_keys = OFF');
                logger.info('[BackupService] Foreign keys disabled');
            }

            // Begin transaction for restore
            logger.info('[BackupService] Beginning restore transaction...');
            logger.info('[BackupService] Tables to restore:', orderedTables.length);

            await this.knex.transaction(async (trx) => {
                for (let i = 0; i < orderedTables.length; i++) {
                    const { file, tableName } = orderedTables[i];

                    try {
                        // Read and parse data
                        const content = await file.buffer();
                        const data = JSON.parse(content.toString());

                        logger.info('[BackupService] Restoring table:', tableName, 'rows:', data.length);

                        // Clear existing data
                        await trx(tableName).delete();

                        if (data.length > 0) {
                            // Insert in batches of 100
                            const batchSize = 100;
                            for (let j = 0; j < data.length; j += batchSize) {
                                const batch = data.slice(j, j + batchSize);
                                await trx(tableName).insert(batch);
                            }
                            restoredRecords += data.length;
                        }

                        restoredTables++;
                    } catch (tableError) {
                        logger.error('[BackupService] Error restoring table', tableName, ':', tableError.message);
                        throw tableError;
                    }

                    // Update progress (15-95%)
                    const progress = 15 + Math.round((i / orderedTables.length) * 80);
                    this.updateProgress(restoreId, {
                        progress,
                        phase: `Đang khôi phục bảng ${tableName} (${i + 1}/${orderedTables.length})...`
                    });
                }
            });

            logger.info('[BackupService] Transaction completed. Tables:', restoredTables, 'Records:', restoredRecords);

            // Re-enable foreign key checks AFTER transaction for SQLite
            if (isSqlite) {
                await this.knex.raw('PRAGMA foreign_keys = ON');
                logger.info('[BackupService] Foreign keys re-enabled');
            }

            const completedAt = new Date();
            const durationSeconds = Math.round((Date.now() - startTime) / 1000);

            // Update restore history
            await this.knex('restore_history').where('id', restoreId).update({
                status: 'COMPLETED',
                progress: 100,
                tables_restored: restoredTables,
                records_restored: restoredRecords,
                completed_at: completedAt,
                duration_seconds: durationSeconds
            });

            this.updateProgress(restoreId, { status: 'COMPLETED', progress: 100, phase: 'Hoàn thành!' });

            return {
                restoreId,
                success: true,
                preRestoreBackupId,
                tablesRestored: restoredTables,
                recordsRestored: restoredRecords,
                durationSeconds
            };

        } catch (error) {
            // Update status to failed
            await this.knex('restore_history').where('id', restoreId).update({
                status: 'FAILED',
                error_message: error.message,
                completed_at: new Date()
            });

            this.updateProgress(restoreId, { status: 'FAILED', error: error.message });
            throw error;
        }
    }

    /**
     * Determine restore order based on foreign key dependencies
     */
    async getRestoreOrder(dataFiles) {
        // Tables without foreign keys should be restored first
        const priorityOrder = [
            'companies', 'roles', 'users', 'chart_of_accounts', 'partners',
            'bank_accounts', 'system_settings', 'dimensions', 'dimension_configs',
            'fund_sources', 'salary_grades', 'allowance_types', 'departments',
            'checklist_tasks', 'revenue_categories', 'expense_categories'
        ];

        const ordered = [];
        const remaining = [];

        for (const file of dataFiles) {
            const tableName = file.path.replace('data/', '').replace('.json', '');

            // Skip excluded tables (backup_history, restore_history, etc.)
            if (EXCLUDED_TABLES.includes(tableName)) {
                logger.info('[BackupService] Skipping excluded table:', tableName);
                continue;
            }

            const priority = priorityOrder.indexOf(tableName);

            if (priority >= 0) {
                ordered[priority] = { file, tableName };
            } else {
                remaining.push({ file, tableName });
            }
        }

        // Filter out undefined and combine
        return [...ordered.filter(Boolean), ...remaining];
    }

    /**
     * Get backup history
     */
    async getBackupHistory(options = {}) {
        let query = this.knex('backup_history')
            .select('*')
            .orderBy('created_at', 'desc');

        if (options.limit) query = query.limit(options.limit);
        if (options.offset) query = query.offset(options.offset);
        if (options.status) query = query.where('status', options.status);
        if (options.type) query = query.where('backup_type', options.type);

        return query;
    }

    /**
     * Get restore history
     */
    async getRestoreHistory(options = {}) {
        let query = this.knex('restore_history')
            .select('*')
            .orderBy('created_at', 'desc');

        if (options.limit) query = query.limit(options.limit);
        if (options.offset) query = query.offset(options.offset);

        return query;
    }

    /**
     * Get backup by ID
     */
    async getBackupById(id) {
        return this.knex('backup_history').where('id', id).first();
    }

    /**
     * Delete backup record
     */
    async deleteBackup(id) {
        const backup = await this.getBackupById(id);
        if (!backup) {
            throw new NotFoundError('Bản sao lưu', id);
        }

        // Delete file if stored on server
        if (backup.file_path) {
            try {
                await fs.unlink(backup.file_path);
            } catch (err) {
                logger.warn('Could not delete backup file:', err.message);
            }
        }

        await this.knex('backup_history').where('id', id).delete();
        return true;
    }

    /**
     * Save backup to server (for scheduled backups)
     */
    async saveBackupToServer(buffer, fileName) {
        const backupsDir = path.join(process.cwd(), 'backups');

        // Create backups directory if not exists
        try {
            await fs.mkdir(backupsDir, { recursive: true });
        } catch (err) {
            // Directory exists
        }

        const filePath = path.join(backupsDir, fileName);
        await fs.writeFile(filePath, buffer);

        return filePath;
    }

    /**
     * Get backup file from server
     */
    async getBackupFile(id) {
        const backup = await this.getBackupById(id);
        if (!backup) {
            throw new NotFoundError('Bản sao lưu', id);
        }

        if (!backup.file_path) {
            throw new ValidationError('File backup không được lưu trên server');
        }

        const buffer = await fs.readFile(backup.file_path);
        return { buffer, fileName: backup.file_name };
    }

    /**
     * Get schedule settings
     */
    async getScheduleSettings() {
        const settings = await this.knex('system_settings')
            .whereIn('key', [
                'backup_schedule_enabled',
                'backup_schedule_frequency',
                'backup_schedule_time',
                'backup_schedule_day',
                'backup_retention_count',
                'backup_encryption_default'
            ]);

        const result = {};
        for (const setting of settings) {
            if (setting.key === 'backup_schedule_enabled' || setting.key === 'backup_encryption_default') {
                result[setting.key] = setting.value === 'true';
            } else if (setting.key === 'backup_retention_count' || setting.key === 'backup_schedule_day') {
                result[setting.key] = parseInt(setting.value) || 0;
            } else {
                result[setting.key] = setting.value;
            }
        }

        return result;
    }

    /**
     * Update schedule settings
     */
    async updateScheduleSettings(settings) {
        for (const [key, value] of Object.entries(settings)) {
            await this.knex('system_settings')
                .where('key', key)
                .update({ value: String(value) });
        }
        return this.getScheduleSettings();
    }

    /**
     * Clean up old backups based on retention policy
     */
    async cleanupOldBackups(retentionCount) {
        const scheduledBackups = await this.knex('backup_history')
            .where('backup_type', 'SCHEDULED')
            .where('status', 'COMPLETED')
            .orderBy('created_at', 'desc');

        if (scheduledBackups.length > retentionCount) {
            const toDelete = scheduledBackups.slice(retentionCount);
            for (const backup of toDelete) {
                await this.deleteBackup(backup.id);
            }
            return toDelete.length;
        }

        return 0;
    }
}

module.exports = BackupService;
