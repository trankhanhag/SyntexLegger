/**
 * System Settings Routes
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');

const { verifyToken, requireRole, logAction } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    /**
     * GET /api/settings
     * Get all system settings (Admin only)
     */
    router.get('/settings', verifyToken, requireRole('admin'), (req, res) => {
        db.all("SELECT key, value FROM system_settings", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const settings = {};
            rows.forEach(r => settings[r.key] = r.value);
            res.json(settings);
        });
    });

    /**
     * POST /api/settings
     * Update a system setting (Admin only)
     */
    router.post('/settings', verifyToken, requireRole('admin'), (req, res) => {
        const { key, value } = req.body;

        db.get("SELECT key FROM system_settings WHERE key = ?", [key], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            const callback = (err) => {
                if (err) return res.status(500).json({ error: err.message });
                logAction(req.user.username, 'UPDATE_SETTING', key, `Value: ${value}`);
                res.json({ status: 'success' });
            };

            if (row) {
                db.run("UPDATE system_settings SET value = ? WHERE key = ?", [value, key], callback);
            } else {
                db.run("INSERT INTO system_settings (key, value) VALUES (?, ?)", [key, value], callback);
            }
        });
    });

    /**
     * GET /api/system/params
     * Get system parameters
     */
    router.get('/system/params', verifyToken, (req, res) => {
        db.all("SELECT key, value FROM system_settings", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/system/params
     * Save system parameters (Admin only)
     */
    router.post('/system/params', verifyToken, requireRole('admin'), (req, res) => {
        const params = req.body;
        if (!params || typeof params !== 'object') {
            return res.status(400).json({ error: 'Invalid parameters' });
        }

        db.serialize(() => {
            const stmt = db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)");
            Object.entries(params).forEach(([key, value]) => {
                stmt.run(key, String(value));
            });
            stmt.finalize((err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ status: 'success' });
            });
        });
    });

    /**
     * GET /api/system/users
     * Get all users (Admin only)
     */
    router.get('/system/users', verifyToken, requireRole('admin'), (req, res) => {
        db.all("SELECT id, username, fullname, role, status, email, last_login FROM users", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/system/users
     * Create or update user (Admin only)
     */
    router.post('/system/users', verifyToken, requireRole('admin'), (req, res) => {
        const { id, username, password, fullname, role, status, email } = req.body;
        const bcrypt = require('bcryptjs');

        if (id) {
            // Update existing user
            if (password) {
                const hashedPassword = bcrypt.hashSync(password, 8);
                db.run(
                    "UPDATE users SET username=?, password=?, fullname=?, role=?, status=?, email=? WHERE id=?",
                    [username, hashedPassword, fullname, role, status, email, id],
                    function (err) {
                        if (err) return res.status(500).json({ error: err.message });
                        logAction(req.user.username, 'UPDATE_USER', username, 'User updated with new password');
                        res.json({ message: 'User updated', id });
                    }
                );
            } else {
                db.run(
                    "UPDATE users SET username=?, fullname=?, role=?, status=?, email=? WHERE id=?",
                    [username, fullname, role, status, email, id],
                    function (err) {
                        if (err) return res.status(500).json({ error: err.message });
                        logAction(req.user.username, 'UPDATE_USER', username, 'User updated');
                        res.json({ message: 'User updated', id });
                    }
                );
            }
        } else {
            // Create new user
            const hashedPassword = bcrypt.hashSync(password || 'password123', 8);
            db.run(
                "INSERT INTO users (username, password, fullname, role, status, email) VALUES (?, ?, ?, ?, ?, ?)",
                [username, hashedPassword, fullname, role || 'user', status || 'Active', email],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    logAction(req.user.username, 'CREATE_USER', username, 'New user created');
                    res.json({ message: 'User created', id: this.lastID });
                }
            );
        }
    });

    /**
     * GET /api/system/roles
     * Get all roles
     */
    router.get('/system/roles', verifyToken, (req, res) => {
        db.all("SELECT * FROM roles", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/system/roles
     * Create or update role (Admin only)
     */
    router.post('/system/roles', verifyToken, requireRole('admin'), (req, res) => {
        const { id, role_name, permissions } = req.body;

        if (id) {
            db.run(
                "UPDATE roles SET role_name=?, permissions=? WHERE id=?",
                [role_name, JSON.stringify(permissions), id],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Role updated', id });
                }
            );
        } else {
            db.run(
                "INSERT INTO roles (role_name, permissions) VALUES (?, ?)",
                [role_name, JSON.stringify(permissions || [])],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Role created', id: this.lastID });
                }
            );
        }
    });

    /**
     * DELETE /api/system/roles/:id
     * Delete a role (Admin only)
     */
    router.delete('/system/roles/:id', verifyToken, requireRole('admin'), (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM roles WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Role deleted', changes: this.changes });
        });
    });

    /**
     * GET /api/system/logs
     * Get system audit logs (Admin only)
     */
    router.get('/system/logs', verifyToken, requireRole('admin'), (req, res) => {
        const limit = parseInt(req.query.limit) || 100;
        db.all("SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ?", [limit], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    return router;
};
