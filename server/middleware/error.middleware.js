/**
 * Error Handling Middleware
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    console.error('[ERROR]', err.stack);

    // Handle specific error types
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    }

    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Constraint violation', details: err.message });
    }

    // Default error response
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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
 */
const requestLogger = (req, res, next) => {
    const logRequests = process.env.LOG_REQUESTS === 'true';
    if (logRequests) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
};

module.exports = {
    errorHandler,
    notFoundHandler,
    requestLogger
};
