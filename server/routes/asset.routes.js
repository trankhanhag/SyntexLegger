/**
 * Asset Routes (Fixed Assets, CCDC, Infrastructure)
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');

const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    // ========================================
    // FIXED ASSETS (TSCĐ)
    // ========================================

    /**
     * GET /api/assets
     * Get all fixed assets
     */
    router.get('/assets', verifyToken, (req, res) => {
        const sql = "SELECT * FROM fixed_assets ORDER BY code ASC";
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/assets
     * Create a new fixed asset
     */
    router.post('/assets', verifyToken, (req, res) => {
        const { code, name, start_date, cost, life_years, dept } = req.body;
        const id = `asset_${Date.now()}`;
        const sql = `INSERT INTO fixed_assets (id, code, name, start_date, cost, life_years, accumulated, residual, dept) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [id, code, name, start_date, cost, life_years, 0, cost, dept], function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.json({ message: "Asset created", id });
        });
    });

    /**
     * DELETE /api/assets/:id
     * Delete a fixed asset
     */
    router.delete('/assets/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM fixed_assets WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Asset deleted", changes: this.changes });
        });
    });

    /**
     * POST /api/assets/depreciate
     * Calculate monthly depreciation for all assets
     */
    router.post('/assets/depreciate', verifyToken, (req, res) => {
        const { period } = req.body;

        db.all("SELECT * FROM fixed_assets WHERE residual > 0", [], (err, assets) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all("SELECT * FROM ccdc_items WHERE remaining > 0", [], (err, ccdc) => {
                if (err) return res.status(500).json({ error: err.message });

                db.serialize(() => {
                    let totalDepreciation = 0;
                    const now = new Date().toISOString();
                    const voucherId = `PK_${Date.now()}`;

                    // Process Fixed Assets
                    assets.forEach(asset => {
                        const monthly = asset.cost / (asset.life_years * 12);
                        const actualDep = Math.min(monthly, asset.residual);
                        totalDepreciation += actualDep;

                        db.run("UPDATE fixed_assets SET accumulated = accumulated + ?, residual = residual - ? WHERE id = ?",
                            [actualDep, actualDep, asset.id]);
                    });

                    // Process CCDC
                    ccdc.forEach(item => {
                        const monthly = item.cost / item.life_months;
                        const actualAlloc = Math.min(monthly, item.remaining);
                        totalDepreciation += actualAlloc;

                        db.run("UPDATE ccdc_items SET allocated = allocated + ?, remaining = remaining - ? WHERE id = ?",
                            [actualAlloc, actualAlloc, item.id]);
                    });

                    res.json({
                        message: "Depreciation calculated",
                        period,
                        totalDepreciation,
                        assetsProcessed: assets.length,
                        ccdcProcessed: ccdc.length
                    });
                });
            });
        });
    });

    /**
     * POST /api/assets/dispose
     * Dispose an asset
     */
    router.post('/assets/dispose', verifyToken, (req, res) => {
        const { asset_id, dispose_date, dispose_value, reason } = req.body;

        db.get("SELECT * FROM fixed_assets WHERE id = ?", [asset_id], (err, asset) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!asset) return res.status(404).json({ error: "Asset not found" });

            // Update asset status
            db.run("UPDATE fixed_assets SET status = 'DISPOSED', dispose_date = ?, dispose_value = ? WHERE id = ?",
                [dispose_date, dispose_value, asset_id], function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({
                        message: "Asset disposed",
                        asset_id,
                        gain_loss: dispose_value - asset.residual
                    });
                });
        });
    });

    // ========================================
    // CCDC (Công cụ dụng cụ)
    // ========================================

    /**
     * GET /api/ccdc
     * Get all CCDC items
     */
    router.get('/ccdc', verifyToken, (req, res) => {
        const sql = "SELECT * FROM ccdc_items ORDER BY code ASC";
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            res.json(rows);
        });
    });

    /**
     * POST /api/ccdc
     * Create a new CCDC item
     */
    router.post('/ccdc', verifyToken, (req, res) => {
        const { code, name, start_date, cost, life_months } = req.body;
        const id = `ccdc_${Date.now()}`;
        const sql = `INSERT INTO ccdc_items (id, code, name, start_date, cost, life_months, allocated, remaining) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [id, code, name, start_date, cost, life_months, 0, cost], function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.json({ message: "CCDC created", id });
        });
    });

    /**
     * DELETE /api/ccdc/:id
     * Delete a CCDC item
     */
    router.delete('/ccdc/:id', verifyToken, (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM ccdc_items WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "CCDC deleted", changes: this.changes });
        });
    });

    return router;
};
