/**
 * Authentication Routes
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { rateLimitLogin, logAction, clearLoginAttempts, SECRET_KEY, loginAttempts } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    /**
     * POST /api/login
     * User login and token generation
     */
    router.post('/login', rateLimitLogin, (req, res) => {
        const { username, password } = req.body;
        const sql = "SELECT * FROM users WHERE username = ?";

        db.get(sql, [username], (err, row) => {
            if (err || !row) {
                logAction(username, 'LOGIN_FAILED', 'auth', `Invalid password or user not found`);
                return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
            }

            // Check user status
            if (row.status && row.status !== 'Active') {
                logAction(username, 'LOGIN_FAILED', 'auth', `User account is inactive`);
                return res.status(403).json({ error: 'Tài khoản người dùng không hoạt động.' });
            }

            const valid = bcrypt.compareSync(password, row.password);
            if (!valid) {
                logAction(username, 'LOGIN_FAILED', 'auth', `Invalid password`);
                return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
            }

            const token = jwt.sign({ id: row.id, role: row.role }, SECRET_KEY, { expiresIn: '24h' });
            if (res.locals.loginRateKey) clearLoginAttempts(res.locals.loginRateKey);

            const now = new Date().toISOString();
            db.run("UPDATE users SET last_login = ? WHERE id = ?", [now, row.id]);
            logAction(username, 'LOGIN_SUCCESS', 'auth', `User logged in`);

            res.status(200).send({
                auth: true,
                token: token,
                user: { username: row.username, role: row.role }
            });
        });
    });

    /**
     * GET /api/debug/users
     * List all users (DEBUG ONLY - REMOVE IN PRODUCTION)
     */
    router.get('/debug/users', (req, res) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(404).json({ error: 'Not found' });
        }
        db.all("SELECT id, username, role, status FROM users", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * GET /api/debug/check-password
     * Check password hash (DEBUG ONLY - REMOVE IN PRODUCTION)
     */
    router.get('/debug/check-password', (req, res) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(404).json({ error: 'Not found' });
        }
        db.get("SELECT username, password FROM users WHERE username = 'admin'", [], (err, row) => {
            if (err || !row) return res.status(404).json({ error: 'User not found' });
            const testPassword = 'admin';
            const isValid = bcrypt.compareSync(testPassword, row.password);
            res.json({ username: row.username, hash_starts: row.password.substring(0, 20), test_result: isValid });
        });
    });

    return router;
};
