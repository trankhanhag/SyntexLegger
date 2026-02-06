/**
 * App Configuration
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const middleware = require('./middleware'); // Import centralized middleware
const { registerRoutes } = require('./routes');

const createApp = (db) => {
    const app = express();

    app.disable('x-powered-by');
    app.set('trust proxy', 1);

    // CORS Configuration
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:4173')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true
    }));

    // Body Parser
    app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for imports
    app.use(bodyParser.urlencoded({ extended: true }));

    // Global Middleware (Logging, etc. - if needed from middleware/index.js)
    if (process.env.LOG_REQUESTS === 'true') {
        app.use(middleware.requestLogger);
    }

    // Health Check - Basic (for load balancers)
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Health Check - Detailed (for monitoring)
    app.get('/api/health/detailed', async (req, res) => {
        const startTime = Date.now();
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            checks: {}
        };

        // Check database connection
        try {
            await new Promise((resolve, reject) => {
                db.get('SELECT 1', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            health.checks.database = { status: 'ok', responseTime: Date.now() - startTime };
        } catch (err) {
            health.status = 'degraded';
            health.checks.database = { status: 'error', error: err.message };
        }

        // Memory usage
        const memUsage = process.memoryUsage();
        health.checks.memory = {
            status: 'ok',
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
            rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
        };

        // Warn if memory usage is high (>500MB)
        if (memUsage.heapUsed > 500 * 1024 * 1024) {
            health.checks.memory.status = 'warning';
            health.status = health.status === 'ok' ? 'warning' : health.status;
        }

        health.responseTime = Date.now() - startTime + 'ms';
        res.status(health.status === 'ok' ? 200 : 503).json(health);
    });

    // Register All Routes
    registerRoutes(app, db);

    // Global Error Handler (Should be last)
    app.use(middleware.errorHandler);

    return app;
};

module.exports = createApp;
