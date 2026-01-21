/**
 * Webhook Authentication Middleware
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const crypto = require('crypto');

const bankWebhookSecret = process.env.BANK_WEBHOOK_SECRET || '';
const allowInsecureWebhooks = process.env.ALLOW_INSECURE_WEBHOOKS === 'true';

/**
 * Verify Webhook Authentication
 * Supports both header secret and HMAC signature
 */
const verifyWebhookAuth = (req) => {
    if (!bankWebhookSecret) return false;
    const headerSecret = req.headers['x-webhook-secret'];
    if (headerSecret && headerSecret === bankWebhookSecret) return true;

    const signature = req.headers['x-webhook-signature'];
    if (!signature) return false;

    try {
        const payload = JSON.stringify(req.body || {});
        const expected = crypto.createHmac('sha256', bankWebhookSecret).update(payload).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
};

/**
 * Webhook authentication middleware
 */
const webhookAuth = (req, res, next) => {
    if (allowInsecureWebhooks || verifyWebhookAuth(req)) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized webhook request' });
};

module.exports = {
    verifyWebhookAuth,
    webhookAuth,
    bankWebhookSecret,
    allowInsecureWebhooks
};
