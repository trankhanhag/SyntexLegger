/**
 * Backup & Restore Routes
 * SyntexLegger - Database Backup Management
 */

const express = require('express');
const multer = require('multer');
const logger = require('../src/utils/logger');
const { verifyToken, requireRole, logAction } = require('../middleware');
const BackupService = require('../src/services/backup.service');
const { getInstance: getScheduler } = require('../src/services/backup-scheduler.service');

// Configure multer for file upload (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
    fileFilter: (req, file, cb) => {
        if (file.originalname.endsWith('.slbak') ||
            file.mimetype === 'application/zip' ||
            file.mimetype === 'application/octet-stream') {
            cb(null, true);
        } else {
            cb(new Error('Only .slbak backup files are allowed'), false);
        }
    }
});

// Store uploaded files temporarily for validation/restore
const uploadedFiles = new Map();

module.exports = (db) => {
    const router = express.Router();
    const knex = require('../knex_db');
    const backupService = new BackupService(knex);
    const scheduler = getScheduler(knex);

    // =====================
    // BACKUP ENDPOINTS
    // =====================

    /**
     * POST /api/backup/create
     * Create a full database backup and return as downloadable file
     */
    router.post('/backup/create', verifyToken, requireRole('admin'), async (req, res) => {
        logger.info('[Backup] Starting backup for user:', req.user.username);
        try {
            const { encrypt, password, notes } = req.body;

            if (encrypt && !password) {
                return res.status(400).json({ error: 'Mật khẩu là bắt buộc khi mã hóa backup' });
            }

            logger.info('[Backup] Options:', { encrypt: !!encrypt, hasPassword: !!password, notes });

            const result = await backupService.createBackup(req.user.username, {
                type: 'MANUAL',
                encrypt: !!encrypt,
                password: password || null,
                notes
            });

            logger.info('[Backup] Completed:', result.fileName, 'Size:', result.buffer.length);

            logAction(req.user.username, 'BACKUP_CREATE', 'backup', result.backupId);

            // Set headers for file download
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
            res.setHeader('Content-Length', result.buffer.length);
            res.setHeader('X-Backup-Id', result.backupId);
            res.setHeader('X-Is-Encrypted', result.isEncrypted ? 'true' : 'false');

            res.send(result.buffer);

        } catch (error) {
            logger.error('[Backup] Create error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/backup/history
     * Get backup history list with pagination
     */
    router.get('/backup/history', verifyToken, requireRole('admin'), async (req, res) => {
        try {
            const { limit = 50, offset = 0, status, type } = req.query;

            const history = await backupService.getBackupHistory({
                limit: parseInt(limit),
                offset: parseInt(offset),
                status,
                type
            });

            res.json(history);
        } catch (error) {
            logger.error('[Backup] History error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/backup/history/:id
     * Get specific backup details
     */
    router.get('/backup/history/:id', verifyToken, requireRole('admin'), async (req, res) => {
        try {
            const backup = await backupService.getBackupById(req.params.id);
            if (!backup) {
                return res.status(404).json({ error: 'Backup not found' });
            }
            res.json(backup);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/backup/download/:id
     * Download backup file from server storage (for scheduled backups)
     */
    router.get('/backup/download/:id', verifyToken, requireRole('admin'), async (req, res) => {
        try {
            const { buffer, fileName } = await backupService.getBackupFile(req.params.id);

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', buffer.length);

            res.send(buffer);
        } catch (error) {
            logger.error('[Backup] Download error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * DELETE /api/backup/history/:id
     * Delete backup record and file (Admin only)
     */
    router.delete('/backup/history/:id', verifyToken, requireRole('admin'), async (req, res) => {
        try {
            await backupService.deleteBackup(req.params.id);
            logAction(req.user.username, 'BACKUP_DELETE', 'backup', req.params.id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // =====================
    // RESTORE ENDPOINTS
    // =====================

    /**
     * POST /api/restore/upload
     * Upload backup file for validation
     */
    router.post('/restore/upload', verifyToken, requireRole('admin'),
        upload.single('backup'), async (req, res) => {
        logger.info('[Restore] Upload request received');
        try {
            if (!req.file) {
                logger.info('[Restore] No file in request');
                return res.status(400).json({ error: 'No file uploaded' });
            }

            logger.info('[Restore] File received:', req.file.originalname, req.file.size, 'bytes');
            const { password } = req.body;
            const validation = await backupService.validateBackup(req.file.buffer, password);
            logger.info('[Restore] Validation result:', validation.valid, validation.error || '');

            if (!validation.valid) {
                return res.json({
                    valid: false,
                    isEncrypted: validation.isEncrypted,
                    error: validation.error
                });
            }

            // Store file temporarily for restore
            const uploadId = require('uuid').v4();
            uploadedFiles.set(uploadId, {
                buffer: validation.decryptedBuffer || req.file.buffer,
                manifest: validation.manifest,
                uploadedAt: Date.now(),
                password
            });

            // Clean up old uploads (older than 1 hour)
            const oneHourAgo = Date.now() - 3600000;
            for (const [id, data] of uploadedFiles.entries()) {
                if (data.uploadedAt < oneHourAgo) {
                    uploadedFiles.delete(id);
                }
            }

            res.json({
                valid: true,
                uploadId,
                isEncrypted: validation.isEncrypted,
                manifest: validation.manifest,
                tables: validation.tables
            });

        } catch (error) {
            logger.error('[Restore] Upload error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/restore/preview/:uploadId
     * Preview what the restore will do
     */
    router.post('/restore/preview/:uploadId', verifyToken, requireRole('admin'),
        async (req, res) => {
        try {
            const upload = uploadedFiles.get(req.params.uploadId);
            if (!upload) {
                return res.status(404).json({ error: 'Upload expired or not found' });
            }

            // Get current record counts for comparison
            const tables = Object.keys(upload.manifest.statistics.tables);
            const currentCounts = {};

            for (const table of tables) {
                try {
                    const result = await knex(table).count('* as count').first();
                    currentCounts[table] = parseInt(result.count) || 0;
                } catch {
                    currentCounts[table] = 0;
                }
            }

            res.json({
                backupInfo: {
                    created_at: upload.manifest.created_at,
                    created_by: upload.manifest.created_by,
                    total_records: upload.manifest.statistics.total_records,
                    total_tables: upload.manifest.statistics.total_tables
                },
                tableCounts: {
                    backup: upload.manifest.statistics.tables,
                    current: currentCounts
                }
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/restore/execute/:uploadId
     * Execute the restore operation
     */
    router.post('/restore/execute/:uploadId', verifyToken, requireRole('admin'),
        async (req, res) => {
        logger.info('[Restore] Execute request for uploadId:', req.params.uploadId);
        try {
            const upload = uploadedFiles.get(req.params.uploadId);
            if (!upload) {
                logger.info('[Restore] Upload not found or expired');
                return res.status(404).json({ error: 'Upload expired or not found' });
            }

            logger.info('[Restore] Found upload, buffer size:', upload.buffer.length);
            const { createPreRestoreBackup = true } = req.body;

            logger.info('[Restore] Starting executeRestore, createPreRestoreBackup:', createPreRestoreBackup);
            const result = await backupService.executeRestore(
                upload.buffer,
                req.user.username,
                {
                    createPreRestoreBackup,
                    password: upload.password
                }
            );
            logger.info('[Restore] Restore completed:', result);

            // Clean up uploaded file
            uploadedFiles.delete(req.params.uploadId);

            logAction(req.user.username, 'RESTORE_EXECUTE', 'backup', result.restoreId);

            res.json({
                success: true,
                restoreId: result.restoreId,
                tablesRestored: result.tablesRestored,
                recordsRestored: result.recordsRestored,
                durationSeconds: result.durationSeconds,
                preRestoreBackupId: result.preRestoreBackupId
            });

        } catch (error) {
            logger.error('[Restore] Execute error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/restore/history
     * Get restore history
     */
    router.get('/restore/history', verifyToken, requireRole('admin'), async (req, res) => {
        try {
            const { limit = 50, offset = 0 } = req.query;

            const history = await backupService.getRestoreHistory({
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.json(history);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // =====================
    // SCHEDULE ENDPOINTS
    // =====================

    /**
     * GET /api/backup/schedule
     * Get schedule settings
     */
    router.get('/backup/schedule', verifyToken, requireRole('admin'), async (req, res) => {
        try {
            const settings = await backupService.getScheduleSettings();
            const status = scheduler.getStatus();

            res.json({
                ...settings,
                status
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/backup/schedule
     * Update schedule settings
     */
    router.post('/backup/schedule', verifyToken, requireRole('admin'), async (req, res) => {
        try {
            const {
                backup_schedule_enabled,
                backup_schedule_frequency,
                backup_schedule_time,
                backup_schedule_day,
                backup_retention_count,
                backup_encryption_default
            } = req.body;

            const settings = await scheduler.updateSchedule({
                backup_schedule_enabled,
                backup_schedule_frequency,
                backup_schedule_time,
                backup_schedule_day,
                backup_retention_count,
                backup_encryption_default
            });

            logAction(req.user.username, 'BACKUP_SCHEDULE_UPDATE', 'settings',
                JSON.stringify(settings));

            res.json({
                success: true,
                settings,
                status: scheduler.getStatus()
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/backup/trigger
     * Manually trigger scheduled backup (for testing)
     */
    router.post('/backup/trigger', verifyToken, requireRole('admin'), async (req, res) => {
        try {
            await scheduler.triggerManualBackup();
            res.json({ success: true, message: 'Backup triggered' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
