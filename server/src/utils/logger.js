/**
 * Logger Utility
 * SyntexLegger - Enterprise Accounting System
 *
 * Centralized logging with winston
 * Supports console, file, and external transports
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

winston.addColors(colors);

// Get log level from environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const logLevel = process.env.LOG_LEVEL;
    if (logLevel) return logLevel;
    return env === 'development' ? 'debug' : 'info';
};

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

// Format for file output (JSON)
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create transports array
const transports = [
    // Console transport (always enabled)
    new winston.transports.Console({
        format: consoleFormat,
    }),
];

// Add file transport if LOG_FILE is configured
if (process.env.LOG_FILE) {
    const logDir = path.dirname(process.env.LOG_FILE);

    // Error logs
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );

    // Combined logs
    transports.push(
        new winston.transports.File({
            filename: process.env.LOG_FILE,
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Create the logger
const logger = winston.createLogger({
    level: level(),
    levels,
    transports,
    exitOnError: false,
});

// Helper methods for structured logging
logger.logRequest = (req, duration) => {
    logger.http('Request completed', {
        method: req.method,
        url: req.originalUrl,
        status: req.res?.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
};

logger.logError = (err, req = null) => {
    const errorLog = {
        message: err.message,
        code: err.code,
        stack: err.stack,
    };

    if (req) {
        errorLog.request = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userId: req.user?.id,
        };
    }

    logger.error('Error occurred', errorLog);
};

logger.logAudit = (action, userId, details = {}) => {
    logger.info('Audit log', {
        action,
        userId,
        ...details,
        timestamp: new Date().toISOString(),
    });
};

logger.logDatabase = (operation, table, duration) => {
    logger.debug('Database operation', {
        operation,
        table,
        duration: `${duration}ms`,
    });
};

module.exports = logger;
