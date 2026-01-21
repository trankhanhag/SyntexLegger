/**
 * Middleware Index - Export all middleware
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const authMiddleware = require('./auth.middleware');
const webhookMiddleware = require('./webhook.middleware');
const errorMiddleware = require('./error.middleware');

module.exports = {
    // Auth middleware
    verifyToken: authMiddleware.verifyToken,
    requireRole: authMiddleware.requireRole,
    rateLimitLogin: authMiddleware.rateLimitLogin,
    clearLoginAttempts: authMiddleware.clearLoginAttempts,
    checkDateLock: authMiddleware.checkDateLock,
    logAction: authMiddleware.logAction,
    SECRET_KEY: authMiddleware.SECRET_KEY,

    // Webhook middleware
    verifyWebhookAuth: webhookMiddleware.verifyWebhookAuth,
    webhookAuth: webhookMiddleware.webhookAuth,

    // Error middleware
    errorHandler: errorMiddleware.errorHandler,
    notFoundHandler: errorMiddleware.notFoundHandler,
    requestLogger: errorMiddleware.requestLogger
};
