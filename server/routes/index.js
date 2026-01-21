/**
 * Routes Index - Export all routes
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const authRoutes = require('./auth.routes');
const systemRoutes = require('./system.routes');
const masterRoutes = require('./master.routes');
const dashboardRoutes = require('./dashboard.routes');
const allocationRoutes = require('./allocation.routes');
const assetRoutes = require('./asset.routes');
const hrRoutes = require('./hr.routes');
const reportRoutes = require('./report.routes');
const commercialRoutes = require('./commercial.routes');
const voucherRoutes = require('./voucher.routes');

/**
 * Register all routes with Express app
 * @param {Express} app - Express application instance
 * @param {Object} db - Database connection
 */
const registerRoutes = (app, db) => {
    // Auth routes
    app.use('/api', authRoutes(db));

    // System routes (settings, users, roles, logs)
    app.use('/api', systemRoutes(db));

    // Master data routes (accounts, partners, products)
    app.use('/api', masterRoutes(db));

    // Dashboard routes (stats, reminders)
    app.use('/api', dashboardRoutes(db));

    // Allocation routes (payment matching)
    app.use('/api', allocationRoutes(db));

    // Asset routes (TSCĐ, CCDC)
    app.use('/api', assetRoutes(db));

    // HR Routes (Employees, Payroll, Insurance)
    app.use('/api', hrRoutes(db));

    // Report Routes (Standard & HCSN)
    app.use('/api', reportRoutes(db));

    // Commercial Routes (Sales, Purchase, Contracts, Projects)
    app.use('/api', commercialRoutes(db));

    // Voucher Routes (General Vouchers, Staging)
    app.use('/api', voucherRoutes(db));

    console.log('[ROUTES] Registered: auth, system, master, dashboard, allocation, asset, hr, report, commercial, voucher');
};

module.exports = {
    registerRoutes,
    authRoutes,
    systemRoutes,
    masterRoutes,
    dashboardRoutes,
    allocationRoutes,
    assetRoutes,
    hrRoutes,
    reportRoutes,
    commercialRoutes,
    voucherRoutes
};
