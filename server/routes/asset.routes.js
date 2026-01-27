/**
 * Asset Routes (Fixed Assets, CCDC, Infrastructure)
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');

const { verifyToken } = require('../middleware');
const assetApis = require('../asset_apis');

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
    // HCSN - FIXED ASSETS EXTENDED
    // ========================================

    router.get('/assets/fixed', verifyToken, assetApis.getFixedAssets(db));
    router.post('/assets/fixed', verifyToken, assetApis.createFixedAsset(db));
    router.put('/assets/fixed/:id', verifyToken, assetApis.updateFixedAsset(db));
    router.delete('/assets/fixed/:id', verifyToken, assetApis.deleteFixedAsset(db));
    router.post('/assets/fixed/depreciation', verifyToken, assetApis.calculateDepreciation(db));
    router.post('/assets/fixed/transfer', verifyToken, assetApis.transferFixedAsset(db));
    router.put('/assets/fixed/:id/revaluation', verifyToken, assetApis.revaluateFixedAsset(db));

    // ========================================
    // HCSN - INFRASTRUCTURE ASSETS
    // ========================================

    router.get('/infrastructure-assets', verifyToken, assetApis.getInfrastructureAssets(db));
    router.post('/infrastructure-assets', verifyToken, assetApis.createInfrastructureAsset(db));
    router.put('/infrastructure-assets/:id', verifyToken, assetApis.updateInfrastructureAsset(db));
    router.post('/infrastructure/maintenance', verifyToken, assetApis.recordMaintenance(db));
    router.put('/infrastructure/:id/condition', verifyToken, assetApis.assessCondition(db));

    // ========================================
    // HCSN - LONG-TERM INVESTMENTS
    // ========================================

    router.get('/investments/long-term', verifyToken, assetApis.getLongTermInvestments(db));
    router.post('/investments/long-term', verifyToken, assetApis.createInvestment(db));
    router.put('/investments/long-term/:id', verifyToken, assetApis.updateInvestment(db));
    router.post('/investments/income', verifyToken, assetApis.recordInvestmentIncome(db));

    // ========================================
    // HCSN - ASSET INVENTORY
    // ========================================

    router.get('/assets/inventory', verifyToken, assetApis.getInventoryRecords(db));
    router.post('/assets/inventory', verifyToken, assetApis.createInventory(db));
    router.post('/assets/inventory/:id/items', verifyToken, assetApis.addInventoryItem(db));
    router.put('/assets/inventory/:id/complete', verifyToken, assetApis.completeInventory(db));
    router.get('/assets/inventory/:id/report', verifyToken, assetApis.getInventoryReport(db));

    // ========================================
    // HCSN - ASSET CARDS
    // ========================================

    router.get('/assets/cards/:asset_id', verifyToken, assetApis.getAssetCard(db));
    router.put('/assets/cards/:id', verifyToken, assetApis.updateAssetCard(db));

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

    // ========================================
    // ALLOCATION HISTORY (Lịch sử phân bổ chi phí trả trước)
    // ========================================

    /**
     * GET /api/allocation-history
     * Get allocation history with optional filters
     */
    router.get('/allocation-history', verifyToken, (req, res) => {
        const { period, item_id, item_type } = req.query;
        let sql = "SELECT * FROM allocation_history WHERE 1=1";
        const params = [];

        if (period) {
            sql += " AND period = ?";
            params.push(period);
        }
        if (item_id) {
            sql += " AND item_id = ?";
            params.push(item_id);
        }
        if (item_type) {
            sql += " AND item_type = ?";
            params.push(item_type);
        }
        sql += " ORDER BY created_at DESC";

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        });
    });

    /**
     * GET /api/allocation-history/check-duplicate
     * Check if allocation already exists for item in period
     */
    router.get('/allocation-history/check-duplicate', verifyToken, (req, res) => {
        const { period, item_id } = req.query;
        if (!period || !item_id) {
            return res.status(400).json({ error: "period and item_id are required" });
        }

        const sql = "SELECT COUNT(*) as count FROM allocation_history WHERE period = ? AND item_id = ?";
        db.get(sql, [period, item_id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ exists: row.count > 0, count: row.count });
        });
    });

    /**
     * POST /api/allocation-history
     * Record allocation and update CCDC net book value
     */
    router.post('/allocation-history', verifyToken, (req, res) => {
        const { period, item_id, item_type, item_name, amount, target_account, voucher_id } = req.body;

        if (!period || !item_id || !amount) {
            return res.status(400).json({ error: "period, item_id, amount are required" });
        }

        const id = `alloc_${Date.now()}`;
        const sql = `INSERT INTO allocation_history 
            (id, period, item_id, item_type, item_name, amount, target_account, voucher_id, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;

        db.run(sql, [id, period, item_id, item_type || 'CCDC', item_name, amount, target_account, voucher_id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Update CCDC remaining value if applicable
            if (item_type === 'CCDC' || !item_type) {
                db.run("UPDATE ccdc_items SET allocated = allocated + ?, remaining = remaining - ? WHERE id = ? OR code = ?",
                    [amount, amount, item_id, item_id], function (updateErr) {
                        if (updateErr) console.error("Failed to update CCDC:", updateErr);
                    });
            }

            res.json({ message: "Allocation recorded", id, changes: this.changes });
        });
    });

    /**
     * GET /api/allocation-history/summary
     * Get allocation summary by item
     */
    router.get('/allocation-history/summary', verifyToken, (req, res) => {
        const sql = `SELECT 
            item_id, 
            item_name,
            item_type,
            COUNT(*) as periods_allocated,
            SUM(amount) as total_allocated,
            MAX(period) as last_period
            FROM allocation_history 
            GROUP BY item_id, item_name, item_type
            ORDER BY last_period DESC`;

        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        });
    });

    return router;
};
