/**
 * Error Handling Middleware
 * SyntexLegger - Enterprise Accounting System (TT 99/2025)
 */

const { AppError } = require('../src/errors');
const logger = require('../src/utils/logger');

/**
 * Global error handler
 * Handles all errors consistently and returns proper JSON responses
 */
const errorHandler = (err, req, res, next) => {
    // Skip if response already sent
    if (res.headersSent) {
        return next(err);
    }

    // Log error using winston logger
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction || !err.isOperational) {
        logger.logError(err, req);
    }

    // Handle custom AppError instances
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            ...err.toJSON(),
            ...(isProduction ? {} : { stack: err.stack }),
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Token không hợp lệ',
            code: 'INVALID_TOKEN',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token đã hết hạn',
            code: 'TOKEN_EXPIRED',
        });
    }

    // Handle SQLite constraint errors
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
            success: false,
            error: 'Vi phạm ràng buộc dữ liệu',
            code: 'CONSTRAINT_VIOLATION',
            details: isProduction ? undefined : err.message,
        });
    }

    // Handle SQLite busy errors
    if (err.code === 'SQLITE_BUSY') {
        return res.status(503).json({
            success: false,
            error: 'Database đang bận, vui lòng thử lại',
            code: 'DATABASE_BUSY',
        });
    }

    // Handle validation errors from express-validator or similar
    if (err.array && typeof err.array === 'function') {
        return res.status(422).json({
            success: false,
            error: 'Dữ liệu không hợp lệ',
            code: 'VALIDATION_ERROR',
            details: { errors: err.array() },
        });
    }

    // Handle SyntaxError (malformed JSON)
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'JSON không hợp lệ',
            code: 'INVALID_JSON',
        });
    }

    // Default error response for unexpected errors
    res.status(err.status || err.statusCode || 500).json({
        success: false,
        error: isProduction ? 'Lỗi hệ thống' : (err.message || 'Internal Server Error'),
        code: 'INTERNAL_ERROR',
        ...(isProduction ? {} : { stack: err.stack }),
    });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({ error: 'Route not found' });
};

/**
 * Request logging middleware
 * Logs HTTP requests with timing information
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log after response finishes
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.logRequest(req, duration);
    });

    next();
};

module.exports = {
    errorHandler,
    notFoundHandler,
    requestLogger
};
