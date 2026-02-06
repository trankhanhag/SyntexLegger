/**
 * Checklist Routes
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 */

const express = require('express');
const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    /**
     * GET /api/checklist
     * Get all checklist tasks
     */
    router.get('/checklist', verifyToken, (req, res) => {
        const sql = `SELECT * FROM checklist_tasks WHERE is_visible = 1 ORDER BY id ASC`;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/checklist
     * Add a new task
     */
    router.post('/checklist', verifyToken, (req, res) => {
        const { title, category } = req.body;
        const sql = `INSERT INTO checklist_tasks (title, category) VALUES (?, ?)`;
        db.run(sql, [title, category], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, title, category, status: 'todo' });
        });
    });

    /**
     * PUT /api/checklist/:id
     * Update task status or details
     */
    router.put('/checklist/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        const { status, title, category } = req.body;

        // Build dynamic update query
        let updates = [];
        let params = [];
        if (status) { updates.push('status = ?'); params.push(status); }
        if (title) { updates.push('title = ?'); params.push(title); }
        if (category) { updates.push('category = ?'); params.push(category); }

        params.push(id);

        if (updates.length === 0) return res.json({ message: "No changes" });

        const sql = `UPDATE checklist_tasks SET ${updates.join(', ')} WHERE id = ?`;

        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated", changes: this.changes });
        });
    });

    /**
     * DELETE /api/checklist/:id
     * Soft delete (hide) or hard delete a task
     */
    router.delete('/checklist/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        // Soft delete by setting is_visible = 0
        const sql = `UPDATE checklist_tasks SET is_visible = 0 WHERE id = ?`;
        db.run(sql, [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted", changes: this.changes });
        });
    });

    return router;
};
