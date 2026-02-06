/**
 * Backup Scheduler Service
 * Handles scheduled/automatic backups using node-cron
 */

const cron = require('node-cron');
const BackupService = require('./backup.service');

class BackupSchedulerService {
    constructor(knex) {
        this.knex = knex;
        this.backupService = new BackupService(knex);
        this.currentJob = null;
        this.isRunning = false;
    }

    /**
     * Initialize scheduler based on current settings
     */
    async initialize() {
        const settings = await this.backupService.getScheduleSettings();

        if (settings.backup_schedule_enabled) {
            await this.scheduleBackup(settings);
            console.log('[BackupScheduler] Initialized with schedule:', this.getCronExpression(settings));
        } else {
            console.log('[BackupScheduler] Disabled in settings');
        }
    }

    /**
     * Get cron expression from settings
     */
    getCronExpression(settings) {
        const [hours, minutes] = (settings.backup_schedule_time || '02:00').split(':');

        if (settings.backup_schedule_frequency === 'weekly') {
            const day = settings.backup_schedule_day || 0;
            return `${minutes} ${hours} * * ${day}`;
        }

        // Daily
        return `${minutes} ${hours} * * *`;
    }

    /**
     * Schedule backup job
     */
    async scheduleBackup(settings) {
        // Stop existing job if any
        this.stopJob();

        const cronExpression = this.getCronExpression(settings);

        // Validate cron expression
        if (!cron.validate(cronExpression)) {
            console.error('[BackupScheduler] Invalid cron expression:', cronExpression);
            return false;
        }

        this.currentJob = cron.schedule(cronExpression, async () => {
            await this.runScheduledBackup(settings);
        }, {
            scheduled: true,
            timezone: 'Asia/Ho_Chi_Minh'
        });

        console.log('[BackupScheduler] Job scheduled with expression:', cronExpression);
        return true;
    }

    /**
     * Run scheduled backup
     */
    async runScheduledBackup(settings = null) {
        if (this.isRunning) {
            console.log('[BackupScheduler] Backup already in progress, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('[BackupScheduler] Starting scheduled backup at', new Date().toISOString());

        try {
            // Get settings if not provided
            if (!settings) {
                settings = await this.backupService.getScheduleSettings();
            }

            // Create backup
            const result = await this.backupService.createBackup('SYSTEM', {
                type: 'SCHEDULED',
                encrypt: settings.backup_encryption_default,
                notes: 'Automated scheduled backup'
            });

            // Save to server
            const filePath = await this.backupService.saveBackupToServer(
                result.buffer,
                result.fileName
            );

            // Update backup record with file path
            await this.knex('backup_history')
                .where('id', result.backupId)
                .update({ file_path: filePath });

            console.log('[BackupScheduler] Backup completed:', result.fileName);

            // Cleanup old backups
            const retentionCount = settings.backup_retention_count || 7;
            const deletedCount = await this.backupService.cleanupOldBackups(retentionCount);
            if (deletedCount > 0) {
                console.log(`[BackupScheduler] Cleaned up ${deletedCount} old backup(s)`);
            }

            // Log success to system_logs if table exists
            await this.logBackupResult('SUCCESS', `Backup completed: ${result.fileName}`);

        } catch (error) {
            console.error('[BackupScheduler] Backup failed:', error.message);
            await this.logBackupResult('ERROR', `Backup failed: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Log backup result to system_logs
     */
    async logBackupResult(level, message) {
        try {
            // Check if system_logs table exists
            const hasTable = await this.knex.schema.hasTable('system_logs');
            if (hasTable) {
                await this.knex('system_logs').insert({
                    log_level: level,
                    message: message,
                    source: 'BackupScheduler',
                    created_at: new Date()
                });
            }
        } catch (err) {
            // Ignore logging errors
        }
    }

    /**
     * Stop current job
     */
    stopJob() {
        if (this.currentJob) {
            this.currentJob.stop();
            this.currentJob = null;
            console.log('[BackupScheduler] Job stopped');
        }
    }

    /**
     * Update schedule settings and restart job
     */
    async updateSchedule(settings) {
        // Update settings in database
        await this.backupService.updateScheduleSettings(settings);

        // Restart job with new settings
        const newSettings = await this.backupService.getScheduleSettings();

        if (newSettings.backup_schedule_enabled) {
            await this.scheduleBackup(newSettings);
        } else {
            this.stopJob();
        }

        return newSettings;
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isEnabled: this.currentJob !== null,
            isRunning: this.isRunning,
            nextRun: this.currentJob ? this.getNextRun() : null
        };
    }

    /**
     * Get next scheduled run time (approximate)
     */
    getNextRun() {
        // node-cron doesn't expose next run time directly
        // This is an approximation
        return 'Scheduled';
    }

    /**
     * Manually trigger backup
     */
    async triggerManualBackup() {
        const settings = await this.backupService.getScheduleSettings();
        return this.runScheduledBackup(settings);
    }
}

// Singleton instance
let instance = null;

module.exports = {
    BackupSchedulerService,
    getInstance: (knex) => {
        if (!instance && knex) {
            instance = new BackupSchedulerService(knex);
        }
        return instance;
    }
};
