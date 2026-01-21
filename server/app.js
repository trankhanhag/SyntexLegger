/**
 * App Configuration
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
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
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173')
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

    // Health Check
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Register All Routes
    registerRoutes(app, db);

    // Global Error Handler (Should be last)
    app.use(middleware.errorHandler);

    return app;
};

module.exports = createApp;
