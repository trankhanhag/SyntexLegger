/**
 * Authentication & Authorization Middleware
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');

if (!process.env.JWT_SECRET) {
    console.warn('[SECURITY WARNING] JWT_SECRET environment variable is not set. Using a randomly generated secret. Set JWT_SECRET in production for persistent sessions.');
}
const SECRET_KEY = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const LOGIN_WINDOW_MS = Number.parseInt(process.env.LOGIN_WINDOW_MS || '900000', 10);
const LOGIN_MAX_ATTEMPTS = Number.parseInt(process.env.LOGIN_MAX_ATTEMPTS || '10', 10);
const loginAttempts = new Map();

/**
 * Verify JWT Token Middleware
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).send({ auth: false, message: 'No token provided.' });

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ auth: false, message: 'Failed to authenticate token.' });
        }

        db.get("SELECT id, username, role, status, company_id FROM users WHERE id = ?", [decoded.id], (dbErr, user) => {
            if (dbErr) {
                return res.status(401).json({ error: 'Auth lookup failed.' });
            }
            if (!user) return res.status(401).json({ auth: false, message: 'User not found.' });
            if (user.status && user.status !== 'Active') {
                return res.status(403).json({ auth: false, message: 'User is inactive.' });
            }
            req.user = { id: user.id, username: user.username, role: user.role, status: user.status, company_id: user.company_id };
            req.userId = user.id;
            next();
        });
    });
};

/**
 * Role-based Authorization Middleware
 * @param  {...string} roles - Allowed roles
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

/**
 * Rate Limiting for Login Attempts
 */
const rateLimitLogin = (req, res, next) => {
    const username = (req.body && req.body.username) ? String(req.body.username) : '';
    const key = `${req.ip}:${username}`;
    const now = Date.now();
    const entry = loginAttempts.get(key);

    if (!entry || (now - entry.firstAttempt) > LOGIN_WINDOW_MS) {
        loginAttempts.set(key, { firstAttempt: now, count: 1 });
        res.locals.loginRateKey = key;
        return next();
    }

    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
        return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    entry.count += 1;
    loginAttempts.set(key, entry);
    res.locals.loginRateKey = key;
    next();
};

/**
 * Clear login attempts on successful login
 */
const clearLoginAttempts = (key) => {
    if (key) loginAttempts.delete(key);
};

/**
 * Check Date Lock for transactions
 */
const checkDateLock = (date) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT value FROM system_settings WHERE key = 'locked_until_date'", [], (err, row) => {
            if (err) return reject(err);
            const lockedUntil = row ? row.value : '1900-01-01';
            if (date <= lockedUntil) {
                resolve({ locked: true, lockedUntil });
            } else {
                resolve({ locked: false });
            }
        });
    });
};

/**
 * Log user actions to audit trail
 */
const logAction = (user, action, target, details) => {
    const timestamp = new Date().toISOString();
    const sql = "INSERT INTO system_logs (timestamp, user, action, target, details) VALUES (?,?,?,?,?)";
    db.run(sql, [timestamp, user || 'system', action, target, details || '']);
};

module.exports = {
    verifyToken,
    requireRole,
    rateLimitLogin,
    clearLoginAttempts,
    checkDateLock,
    logAction,
    SECRET_KEY,
    loginAttempts
};
