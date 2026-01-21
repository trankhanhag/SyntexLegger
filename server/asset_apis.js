// ========================================
// ASSET MANAGEMENT APIs - HCSN (TT 24/2024)
// ========================================
// Module xử lý 3 loại tài sản:
// 1. Tài sản Cố định (TSCĐ)
// 2. Tài sản Kết cấu Hạ tầng
// 3. Đầu tư Dài hạn

const { v4: uuidv4 } = require('uuid');
const assetAccounting = require('./asset_accounting');

// ========================================
// 1. TSCĐ - FIXED ASSETS APIs
// ========================================

/**
 * GET /api/assets/fixed - Danh sách TSCĐ
 */
exports.getFixedAssets = (db) => (req, res) => {
    const { category, status, department, fund_source } = req.query;

    let query = `
        SELECT fa.*, fs.name as fund_source_name 
        FROM fixed_assets fa
        LEFT JOIN fund_sources fs ON fa.fund_source_id = fs.id
        WHERE 1=1
    `;
    const params = [];

    if (category) {
        query += ` AND fa.asset_category = ?`;
        params.push(category);
    }
    if (status) {
        query += ` AND fa.status = ?`;
        params.push(status);
    }
    if (department) {
        query += ` AND fa.dept = ?`;
        params.push(department);
    }

    query += ` ORDER BY fa.code`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * POST /api/assets/fixed - Tạo TSCĐ mới (Ghi tăng)
 */
exports.createFixedAsset = (db) => (req, res) => {
    const {
        code, name, category, account_code, original_value,
        depreciation_method, useful_life, residual_value,
        purchase_date, usage_date, location, department, manager,
        fund_source_id, fund_source_code
    } = req.body;

    const id = uuidv4();
    const net_value = original_value - (residual_value || 0);
    const depreciation_rate = useful_life ? (100 / useful_life).toFixed(2) : 0;

    const sql = `
        INSERT INTO fixed_assets (
            id, code, name, asset_category, account_code, original_value,
            accumulated_depreciation, net_value, depreciation_method,
            useful_life, depreciation_rate, residual_value,
            purchase_date, usage_date, location, dept, manager,
            status, fund_source_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    db.run(sql, [
        id, code, name, category || 'TANGIBLE', account_code || '211', original_value,
        0, net_value, depreciation_method || 'STRAIGHT_LINE',
        useful_life, depreciation_rate, residual_value || 0,
        purchase_date, usage_date, location, department, manager,
        'ACTIVE', fund_source_id
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Ghi log biến động
        db.run(`
            INSERT INTO asset_movements (asset_id, movement_type, movement_date, to_department, to_location, value_change, reason, created_by)
            VALUES (?, 'INCREASE', ?, ?, ?, ?, ?, ?)
        `, [id, purchase_date, department, location, original_value, 'Ghi tăng TSCĐ mới', req.user?.username]);

        // ✨ Tạo chứng từ kế toán tự động
        db.get('SELECT * FROM fund_sources WHERE id = ?', [fund_source_id], (err, fundSource) => {
            if (!err && fundSource) {
                const asset = { ...req.body, id, account_code: account_code || '211' };
                assetAccounting.createAssetIncreaseVoucher(db, asset, fundSource, req);
            }
        });

        // ✨ Tạo Thẻ tài sản (Asset Card)
        createAssetCard(db, id, purchase_date, original_value);

        res.json({ success: true, id, message: 'Đã ghi tăng TSCĐ thành công' });
    });
};

/**
 * PUT /api/assets/fixed/:id - Cập nhật TSCĐ
 */
exports.updateFixedAsset = (db) => (req, res) => {
    const { id } = req.params;
    const { name, location, dept, manager, status, condition } = req.body;

    const sql = `
        UPDATE fixed_assets 
        SET name = ?, location = ?, dept = ?, manager = ?, status = ?, updated_at = datetime('now')
        WHERE id = ?
    `;

    db.run(sql, [name, location, dept, manager, status, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Đã cập nhật TSCĐ' });
    });
};

/**
 * DELETE /api/assets/fixed/:id - Ghi giảm TSCĐ
 */
exports.deleteFixedAsset = (db) => (req, res) => {
    const { id } = req.params;
    const { reason, approval_no, decrease_date } = req.body;

    // Lấy thông tin tài sản trước khi xóa
    db.get('SELECT * FROM fixed_assets WHERE id = ?', [id], (err, asset) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!asset) return res.status(404).json({ error: 'Không tìm thấy TSCĐ' });

        // Ghi log biến động
        db.run(`
            INSERT INTO asset_movements (asset_id, movement_type, movement_date, value_change, reason, approval_no, created_by)
            VALUES (?, 'DECREASE', ?, ?, ?, ?, ?)
        `, [id, decrease_date, -asset.net_value, reason, approval_no, req.user?.username]);

        // ✨ Tạo chứng từ ghi giảm
        const disposalValue = req.body.disposal_value || 0;
        assetAccounting.createAssetDecreaseVoucher(db, asset, disposalValue, req);

        // Cập nhật status thành DISPOSED thay vì xóa hẳn
        db.run('UPDATE fixed_assets SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', ['DISPOSED', id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Đã ghi giảm TSCĐ' });
        });
    });
};

/**
 * POST /api/assets/fixed/depreciation - Tính khấu hao TSCĐ
 */
exports.calculateDepreciation = (db) => (req, res) => {
    const { period, asset_ids } = req.body; // period: 'YYYY-MM'

    if (!period) return res.status(400).json({ error: 'Thiếu tham số period' });

    const assetFilter = asset_ids?.length ? `AND id IN (${asset_ids.map(() => '?').join(',')})` : '';
    const params = asset_ids?.length ? asset_ids : [];

    // Lấy danh sách TSCĐ đang hoạt động
    db.all(`SELECT * FROM fixed_assets WHERE status = 'ACTIVE' ${assetFilter}`, params, (err, assets) => {
        if (err) return res.status(500).json({ error: err.message });

        let processed = 0;
        let totalDepreciation = 0;

        assets.forEach(asset => {
            // Tính khấu hao theo phương pháp đường thẳng
            const monthlyDepreciation = asset.useful_life > 0
                ? (asset.original_value - (asset.residual_value || 0)) / (asset.useful_life * 12)
                : 0;

            const newAccumulated = (asset.accumulated_depreciation || 0) + monthlyDepreciation;
            const newNetValue = asset.original_value - newAccumulated;

            // Cập nhật TSCĐ
            db.run(`
                UPDATE fixed_assets 
                SET accumulated_depreciation = ?, net_value = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [newAccumulated, newNetValue, asset.id]);

            // Ghi log khấu hao
            db.run(`
                INSERT INTO asset_depreciation_log (asset_id, period, depreciation_amount, accumulated_depreciation, net_value, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [asset.id, period, monthlyDepreciation, newAccumulated, newNetValue, req.user?.username]);

            processed++;
            totalDepreciation += monthlyDepreciation;
        });

        res.json({
            success: true,
            message: `Đã tính khấu hao cho ${processed} TSCĐ`,
            total_depreciation: totalDepreciation,
            period
        });

        // ✨ Tạo chứng từ khấu hao tự động
        if (totalDepreciation > 0) {
            assetAccounting.createDepreciationVoucher(db, period, totalDepreciation, processed, req);
        }
    });
};

/**
 * POST /api/assets/fixed/transfer - Điều chuyển TSCĐ
 */
exports.transferFixedAsset = (db) => (req, res) => {
    const { asset_id, to_department, to_location, reason, approval_no, transfer_date } = req.body;

    // Lấy thông tin hiện tại
    db.get('SELECT * FROM fixed_assets WHERE id = ?', [asset_id], (err, asset) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!asset) return res.status(404).json({ error: 'Không tìm thấy TSCĐ' });

        // Cập nhật vị trí mới
        db.run(`
            UPDATE fixed_assets 
            SET dept = ?, location = ?, updated_at = datetime('now')
            WHERE id = ?
        `, [to_department, to_location, asset_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Ghi log điều chuyển
            db.run(`
                INSERT INTO asset_movements (asset_id, movement_type, movement_date, from_department, to_department, from_location, to_location, reason, approval_no, created_by)
                VALUES (?, 'TRANSFER', ?, ?, ?, ?, ?, ?, ?, ?)
            `, [asset_id, transfer_date, asset.dept, to_department, asset.location, to_location, reason, approval_no, req.user?.username]);

            res.json({ success: true, message: 'Đã điều chuyển TSCĐ thành công' });
        });
    });
};

/**
 * PUT /api/assets/fixed/:id/revaluation - Đánh giá lại TSCĐ
 */
exports.revaluateFixedAsset = (db) => (req, res) => {
    const { id } = req.params;
    const { new_value, reason, approval_no, revaluation_date } = req.body;

    db.get('SELECT * FROM fixed_assets WHERE id = ?', [id], (err, asset) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!asset) return res.status(404).json({ error: 'Không tìm thấy TSCĐ' });

        const value_change = new_value - asset.original_value;

        // Cập nhật giá trị
        db.run(`
            UPDATE fixed_assets 
            SET original_value = ?, net_value = ?, updated_at = datetime('now')
            WHERE id = ?
        `, [new_value, new_value - (asset.accumulated_depreciation || 0), id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Ghi log đánh giá lại
            db.run(`
                INSERT INTO asset_movements (asset_id, movement_type, movement_date, value_change, reason, approval_no, created_by)
                VALUES (?, 'REVALUATION', ?, ?, ?, ?, ?)
            `, [id, revaluation_date, value_change, reason, approval_no, req.user?.username]);

            res.json({ success: true, message: 'Đã đánh giá lại TSCĐ', value_change });
        });
    });
};

// ========================================
// ASSET INVENTORY (Kiểm kê Tài sản)
// ========================================

/**
 * GET /api/assets/inventory - Danh sách phiếu kiểm kê
 */
exports.getInventoryRecords = (db) => (req, res) => {
    const { fiscal_year, status, department } = req.query;

    let query = 'SELECT * FROM asset_inventory WHERE 1=1';
    const params = [];

    if (fiscal_year) {
        query += ' AND fiscal_year = ?';
        params.push(fiscal_year);
    }
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    if (department) {
        query += ' AND department = ?';
        params.push(department);
    }

    query += ' ORDER BY inventory_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * POST /api/assets/inventory - Tạo phiếu kiểm kê mới
 */
exports.createInventory = (db) => (req, res) => {
    const {
        inventory_no, inventory_date, fiscal_year, inventory_type,
        department, notes
    } = req.body;

    if (!inventory_no || !inventory_date) {
        return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const id = uuidv4();
    const year = fiscal_year || new Date(inventory_date).getFullYear();

    const sql = `INSERT INTO asset_inventory 
        (id, inventory_no, inventory_date, fiscal_year, inventory_type, department, status, notes, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, datetime('now'), datetime('now'))`;

    db.run(sql, [
        id, inventory_no, inventory_date, year,
        inventory_type || 'PERIODIC', department, notes,
        req.user?.username
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id, inventory_no, message: 'Đã tạo phiếu kiểm kê' });
    });
};

/**
 * POST /api/assets/inventory/:id/items - Thêm tài sản vào phiếu kiểm kê
 */
exports.addInventoryItem = (db) => (req, res) => {
    const { id } = req.params;
    const {
        asset_id, book_quantity, book_value,
        actual_quantity, actual_condition, actual_location,
        reason, notes
    } = req.body;

    // Tính chênh lệch
    const diff_quantity = actual_quantity - book_quantity;
    const diff_value = (book_value / book_quantity) * diff_quantity;

    const sql = `INSERT INTO asset_inventory_items 
        (inventory_id, asset_id, book_quantity, book_value, actual_quantity, actual_condition, actual_location,
         diff_quantity, diff_value, reason, notes, checked_by, checked_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;

    db.run(sql, [
        id, asset_id, book_quantity, book_value,
        actual_quantity, actual_condition, actual_location,
        diff_quantity, diff_value, reason, notes,
        req.user?.username
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Đã thêm tài sản vào phiếu kiểm kê' });
    });
};

/**
 * PUT /api/assets/inventory/:id/complete - Hoàn thành kiểm kê
 */
exports.completeInventory = (db) => (req, res) => {
    const { id } = req.params;
    const { approved_by } = req.body;

    db.run(`UPDATE asset_inventory 
            SET status = 'COMPLETED', approved_by = ?, approved_date = datetime('now'), updated_at = datetime('now')
            WHERE id = ?`,
        [approved_by, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy phiếu kiểm kê' });
            res.json({ success: true, message: 'Đã hoàn thành kiểm kê' });
        }
    );
};

/**
 * GET /api/assets/inventory/:id/report - Báo cáo chênh lệch kiểm kê
 */
exports.getInventoryReport = (db) => (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT 
            aii.*,
            fa.code as asset_code,
            fa.name as asset_name,
            fa.category
        FROM asset_inventory_items aii
        JOIN fixed_assets fa ON aii.asset_id = fa.id
        WHERE aii.inventory_id = ?
        ORDER BY aii.diff_value DESC
    `;

    db.all(sql, [id], (err, items) => {
        if (err) return res.status(500).json({ error: err.message });

        // Tính tổng chênh lệch
        const totalDiff = items.reduce((sum, item) => sum + (item.diff_value || 0), 0);
        const missing = items.filter(i => i.actual_condition === 'MISSING').length;
        const damaged = items.filter(i => i.actual_condition === 'DAMAGED').length;

        res.json({
            items,
            summary: {
                total_items: items.length,
                total_diff_value: totalDiff,
                missing_count: missing,
                damaged_count: damaged
            }
        });
    });
};

// ========================================
// ASSET CARDS (Thẻ Tài sản)
// ========================================

/**
 * GET /api/assets/cards/:asset_id - Xem thẻ tài sản
 */
exports.getAssetCard = (db) => (req, res) => {
    const { asset_id } = req.params;
    const { fiscal_year } = req.query;

    let query = 'SELECT * FROM asset_cards WHERE asset_id = ?';
    const params = [asset_id];

    if (fiscal_year) {
        query += ' AND fiscal_year = ?';
        params.push(fiscal_year);
    }

    query += ' ORDER BY fiscal_year DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * PUT /api/assets/cards/:id - Cập nhật thẻ tài sản
 */
exports.updateAssetCard = (db) => (req, res) => {
    const { id } = req.params;
    const {
        increase_value, decrease_value, revaluation_value,
        depreciation_current_year
    } = req.body;

    // Tính lại closing values
    db.get('SELECT * FROM asset_cards WHERE id = ?', [id], (err, card) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!card) return res.status(404).json({ error: 'Không tìm thấy thẻ tài sản' });

        const newIncrease = (card.increase_value || 0) + (increase_value || 0);
        const newDecrease = (card.decrease_value || 0) + (decrease_value || 0);
        const newRevaluation = (card.revaluation_value || 0) + (revaluation_value || 0);
        const newDepreciation = (card.depreciation_current_year || 0) + (depreciation_current_year || 0);

        const closingValue = card.opening_value + newIncrease - newDecrease + newRevaluation;
        const closingDepreciation = card.opening_depreciation + newDepreciation;
        const closingNetValue = closingValue - closingDepreciation;

        const sql = `UPDATE asset_cards 
            SET increase_value = ?, decrease_value = ?, revaluation_value = ?, 
                depreciation_current_year = ?, closing_value = ?, 
                closing_depreciation = ?, closing_net_value = ?, updated_at = datetime('now')
            WHERE id = ?`;

        db.run(sql, [
            newIncrease, newDecrease, newRevaluation, newDepreciation,
            closingValue, closingDepreciation, closingNetValue, id
        ], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Đã cập nhật thẻ tài sản' });
        });
    });
};

// ========================================
// 2. HẠ TẦNG - INFRASTRUCTURE APIs
// ========================================

/**
 * GET /api/infrastructure-assets - Danh sách Hạ tầng
 */
exports.getInfrastructureAssets = (db) => (req, res) => {
    const { category, condition, fund_source } = req.query;

    let query = `
        SELECT ia.*, fs.name as fund_source_name 
        FROM infrastructure_assets ia
        LEFT JOIN fund_sources fs ON ia.fund_source_id = fs.id
        WHERE 1=1
    `;
    const params = [];

    if (category) {
        query += ` AND ia.category = ?`;
        params.push(category);
    }
    if (condition) {
        query += ` AND ia.condition = ?`;
        params.push(condition);
    }

    query += ` ORDER BY ia.code`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * POST /api/infrastructure-assets - Tạo Hạ tầng mới
 */
exports.createInfrastructureAsset = (db) => (req, res) => {
    const {
        code, name, category, original_value, construction_year,
        location, condition, fund_source_id
    } = req.body;

    const id = uuidv4();

    const sql = `
        INSERT INTO infrastructure_assets (
            id, code, name, category, original_value, construction_year,
            location, condition, fund_source_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    db.run(sql, [
        id, code, name, category || 'ROAD', original_value || 0, construction_year,
        location, condition || 'GOOD', fund_source_id
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id, message: 'Đã tạo tài sản hạ tầng' });
    });
};

/**
 * PUT /api/infrastructure-assets/:id - Cập nhật Hạ tầng
 */
exports.updateInfrastructureAsset = (db) => (req, res) => {
    const { id } = req.params;
    const { name, category, original_value, construction_year, location, fund_source_id } = req.body;

    const sql = `
        UPDATE infrastructure_assets 
        SET name = ?, category = ?, original_value = ?, construction_year = ?, 
            location = ?, fund_source_id = ?, updated_at = datetime('now')
        WHERE id = ?
    `;

    db.run(sql, [name, category, original_value, construction_year, location, fund_source_id, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Đã cập nhật tài sản hạ tầng' });
    });
};

/**
 * POST /api/infrastructure/maintenance - Ghi nhận bảo trì
 */
exports.recordMaintenance = (db) => (req, res) => {
    const { infra_id, maintenance_type, cost, date, note, next_date } = req.body;

    db.run(`
        UPDATE infrastructure_assets 
        SET last_maintenance_date = ?, 
            next_maintenance_date = ?,
            maintenance_cost = maintenance_cost + ?,
            updated_at = datetime('now')
        WHERE id = ?
    `, [date, next_date, cost || 0, infra_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Đã ghi nhận bảo trì' });
    });
};

/**
 * PUT /api/infrastructure/:id/condition - Đánh giá tình trạng
 */
exports.assessCondition = (db) => (req, res) => {
    const { id } = req.params;
    const { condition, assessment_date, note } = req.body;

    db.run(`
        UPDATE infrastructure_assets 
        SET condition = ?, 
            condition_assessment_date = ?,
            condition_note = ?,
            updated_at = datetime('now')
        WHERE id = ?
    `, [condition, assessment_date, note, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Đã cập nhật tình trạng hạ tầng' });
    });
};

// ========================================
// 3. ĐẦU TƯ DÀI HẠN - INVESTMENTS APIs
// ========================================

/**
 * GET /api/investments/long-term - Danh sách đầu tư DH
 */
exports.getLongTermInvestments = (db) => (req, res) => {
    const { type, status } = req.query;

    let query = 'SELECT * FROM long_term_investments WHERE 1=1';
    const params = [];

    if (type) {
        query += ' AND type = ?';
        params.push(type);
    }
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY investment_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

/**
 * POST /api/investments/long-term - Tạo khoản đầu tư mới
 */
exports.createInvestment = (db) => (req, res) => {
    const {
        code, name, type, account_code, investee_name, investee_tax_code,
        investment_amount, ownership_percentage, investment_date, fund_source_id
    } = req.body;

    const id = uuidv4();

    const sql = `
        INSERT INTO long_term_investments (
            id, code, name, type, account_code, investee_name, investee_tax_code,
            investment_amount, ownership_percentage, investment_date,
            current_value, status, fund_source_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, datetime('now'), datetime('now'))
    `;

    db.run(sql, [
        id, code, name, type, account_code || '221', investee_name, investee_tax_code,
        investment_amount, ownership_percentage, investment_date,
        investment_amount, fund_source_id
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id, message: 'Đã tạo khoản đầu tư dài hạn' });
    });
};

/**
 * PUT /api/investments/long-term/:id - Cập nhật khoản đầu tư
 */
exports.updateInvestment = (db) => (req, res) => {
    const { id } = req.params;
    const {
        name, type, investee_name, investee_tax_code,
        investment_amount, ownership_percentage, investment_date, fund_source_id
    } = req.body;

    const sql = `
        UPDATE long_term_investments 
        SET name = ?, type = ?, investee_name = ?, investee_tax_code = ?,
            investment_amount = ?, ownership_percentage = ?, investment_date = ?,
            fund_source_id = ?, updated_at = datetime('now')
        WHERE id = ?
    `;

    db.run(sql, [
        name, type, investee_name, investee_tax_code,
        investment_amount, ownership_percentage, investment_date,
        fund_source_id, id
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Đã cập nhật khoản đầu tư' });
    });
};

/**
 * POST /api/investments/income - Ghi nhận thu nhập từ đầu tư
 */
exports.recordInvestmentIncome = (db) => (req, res) => {
    const { investment_id, income_amount, income_date, note } = req.body;

    db.run(`
        UPDATE long_term_investments 
        SET income_received = income_received + ?,
            updated_at = datetime('now')
        WHERE id = ?
    `, [income_amount, investment_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Đã ghi nhận thu nhập đầu tư', income_amount });
    });
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Tạo Thẻ Tài sản (Asset Card) khi ghi tăng TSCĐ mới
 */
function createAssetCard(db, assetId, purchaseDate, originalValue) {
    const fiscal_year = new Date(purchaseDate).getFullYear();
    const cardNo = `THE-${assetId.substring(0, 8).toUpperCase()}`;
    const cardId = uuidv4();

    const sql = `INSERT INTO asset_cards 
        (id, asset_id, card_no, fiscal_year, opening_value, opening_depreciation, 
         increase_value, closing_value, closing_net_value, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, datetime('now'), datetime('now'))`;

    db.run(sql, [
        cardId,
        assetId,
        cardNo,
        fiscal_year,
        originalValue,  // increase_value
        originalValue,  // closing_value
        originalValue   // closing_net_value (chưa khấu hao)
    ], (err) => {
        if (err) {
            console.error('Error creating asset_card:', err);
        } else {
            console.log(`✓ Created asset card ${cardNo} for fiscal year ${fiscal_year}`);
        }
    });
}

module.exports = exports;
