/**
 * Authentication Routes
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { rateLimitLogin, logAction, clearLoginAttempts, SECRET_KEY, loginAttempts, validateLogin, sanitizeBody } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    /**
     * POST /api/login
     * User login and token generation
     */
    router.post('/login', sanitizeBody, validateLogin, rateLimitLogin, (req, res) => {
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

    return router;
};
