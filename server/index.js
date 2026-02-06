/**
 * Server Entry Point
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

const db = require('./database');
const createApp = require('./app');
const knex = require('./knex_db');
const logger = require('./src/utils/logger');
const { getInstance: getBackupScheduler } = require('./src/services/backup-scheduler.service');

const PORT = process.env.PORT || 3000;

// Initialize App
const app = createApp(db);

// Start Server
const server = app.listen(PORT, async () => {
    logger.info('===============================================');
    logger.info('   SyntexLegger Backend Server is running!');
    logger.info(`   Port: ${PORT}`);
    logger.info(`   Mode: ${process.env.NODE_ENV || 'development'}`);
    logger.info('   Circular 99/2025/TT-BTC Compliance: ENABLED');
    logger.info('===============================================');

    // Initialize Backup Scheduler
    try {
        const scheduler = getBackupScheduler(knex);
        await scheduler.initialize();
        logger.info('BackupScheduler initialized');
    } catch (err) {
        logger.error('BackupScheduler init error', { error: err.message });
    }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');

    // Stop backup scheduler
    const scheduler = getBackupScheduler();
    if (scheduler) {
        scheduler.stopJob();
        logger.info('Backup scheduler stopped');
    }

    server.close(() => {
        logger.info('HTTP server closed');
        db.close(() => {
            logger.info('Database connection closed');
        });
    });
});

