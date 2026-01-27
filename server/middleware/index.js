/**
 * Middleware Index - Export all middleware
 * SyntexHCSN - Ke toan HCSN theo TT 24/2024/TT-BTC
 */

const authMiddleware = require('./auth.middleware');
const webhookMiddleware = require('./webhook.middleware');
const errorMiddleware = require('./error.middleware');
const validationMiddleware = require('./validation.middleware');
const auditMiddleware = require('./audit.middleware');

module.exports = {
    // Auth middleware
    verifyToken: authMiddleware.verifyToken,
    requireRole: authMiddleware.requireRole,
    rateLimitLogin: authMiddleware.rateLimitLogin,
    clearLoginAttempts: authMiddleware.clearLoginAttempts,
    checkDateLock: authMiddleware.checkDateLock,
    logAction: authMiddleware.logAction,
    SECRET_KEY: authMiddleware.SECRET_KEY,
    loginAttempts: authMiddleware.loginAttempts,

    // Webhook middleware
    verifyWebhookAuth: webhookMiddleware.verifyWebhookAuth,
    webhookAuth: webhookMiddleware.webhookAuth,

    // Error middleware
    errorHandler: errorMiddleware.errorHandler,
    notFoundHandler: errorMiddleware.notFoundHandler,
    requestLogger: errorMiddleware.requestLogger,

    // Validation middleware
    sanitizeAll: validationMiddleware.sanitizeAll,
    sanitizeBody: validationMiddleware.sanitizeBody,
    sanitizeQuery: validationMiddleware.sanitizeQuery,
    sanitizeParams: validationMiddleware.sanitizeParams,
    validateVoucher: validationMiddleware.validateVoucher,
    validatePartner: validationMiddleware.validatePartner,
    validateAccount: validationMiddleware.validateAccount,
    validateLogin: validationMiddleware.validateLogin,
    validatePagination: validationMiddleware.validatePagination,
    validateDateRange: validationMiddleware.validateDateRange,

    // Audit middleware
    createAuditMiddleware: auditMiddleware.createAuditMiddleware,
    voucherAuditMiddleware: auditMiddleware.voucherAuditMiddleware,
    budgetAuditMiddleware: auditMiddleware.budgetAuditMiddleware,
    sessionAuditMiddleware: auditMiddleware.sessionAuditMiddleware,
    captureOldValues: auditMiddleware.captureOldValues,
    setAuditEntityId: auditMiddleware.setAuditEntityId,
    logCustomAudit: auditMiddleware.logCustomAudit
};
