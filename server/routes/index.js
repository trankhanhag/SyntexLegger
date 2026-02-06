/**
 * Routes Index - Export all routes
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

const logger = require('../src/utils/logger');
const authRoutes = require('./auth.routes');
const systemRoutes = require('./system.routes');
const masterRoutes = require('./master.routes');
const dashboardRoutes = require('./dashboard.routes');
const allocationRoutes = require('./allocation.routes');
const assetRoutes = require('./asset.routes');
const hrRoutes = require('./hr.routes');
const reportRoutes = require('./report.routes');
const commercialRoutes = require('./commercial.routes');
const revenueRoutes = require('./revenue.routes');
const expenseRoutes = require('./expense.routes');
const debtRoutes = require('./debt.routes');
const voucherRoutes = require('./voucher.routes');
const auditRoutes = require('./audit.routes');
const checklistRoutes = require('./checklist.routes');
const xmlExportRoutes = require('./xml-export.routes');
const openingBalanceRoutes = require('./opening-balance.routes');
const closingRoutes = require('./closing.routes');
const customReportRoutes = require('./custom-report.routes');
const einvoiceRoutes = require('./einvoice.routes');
const bankRoutes = require('./bank.routes');
const inventoryRoutes = require('./inventory.routes');
const backupRoutes = require('./backup.routes');

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

    // Report Routes
    app.use('/api', reportRoutes(db));

    // Commercial Routes (Sales, Purchase, Contracts, Projects)
    app.use('/api', commercialRoutes(db));

    // Revenue & Expense Routes
    app.use('/api', revenueRoutes(db));
    app.use('/api', expenseRoutes(db));

    // Debt & Advance Routes
    app.use('/api', debtRoutes(db));
    // Voucher Routes (General Vouchers, Staging)
    app.use('/api', voucherRoutes(db));

    // Audit Routes (Health Check)
    app.use('/api', auditRoutes(db));

    // Checklist Routes
    app.use('/api', checklistRoutes(db));

    // XML Export Routes (KBNN DVC)
    app.use('/api', xmlExportRoutes(db));

    // Opening Balance Routes
    app.use('/api', openingBalanceRoutes(db));

    // Closing Routes (Macros)
    app.use('/api', closingRoutes(db));

    // Custom Report Generator Routes
    const knex = require('../knex_db');
    app.set('db', db); // Legacy SQLite3 instance
    app.set('knex', knex); // Knex instance for new modules
    app.use('/api/reports/custom', customReportRoutes);

    // E-Invoice Integration Routes
    app.use('/api/einvoice', einvoiceRoutes(db));

    // Bank Routes
    app.use('/api/bank', bankRoutes(db));

    // Inventory Routes (Materials, Receipts, Issues, Transfers)
    app.use('/api', inventoryRoutes(db));

    // Backup & Restore Routes
    app.use('/api', backupRoutes(db));

    logger.info('All routes registered successfully');
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
    voucherRoutes,
    auditRoutes,
    closingRoutes,
    customReportRoutes,
    einvoiceRoutes,
    backupRoutes
};
