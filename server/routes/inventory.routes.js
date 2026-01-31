/**
 * Inventory Routes
 * SyntexLegger - Quản lý Vật tư, Hàng hóa theo TT 99/2025/TT-BTC
 *
 * Routes:
 * - /inventory/materials - Danh mục vật tư
 * - /inventory/receipts - Phiếu nhập kho
 * - /inventory/issues - Phiếu xuất kho
 * - /inventory/transfers - Phiếu chuyển kho
 * - /inventory/summary - Tồn kho tổng hợp
 * - /inventory/cards - Thẻ kho
 */

const express = require('express');
const { verifyToken, sanitizeBody, sanitizeQuery } = require('../middleware');
const materialApis = require('../material_apis');

module.exports = (db) => {
    const router = express.Router();

    // ================================================================
    // MATERIALS (Danh mục vật tư)
    // ================================================================

    /**
     * GET /api/inventory/materials
     * Lấy danh sách vật tư
     */
    router.get('/inventory/materials', sanitizeQuery, verifyToken, materialApis.getMaterials(db));

    /**
     * POST /api/inventory/materials
     * Tạo vật tư mới
     */
    router.post('/inventory/materials', sanitizeBody, verifyToken, materialApis.createMaterial(db));

    /**
     * PUT /api/inventory/materials/:id
     * Cập nhật vật tư
     */
    router.put('/inventory/materials/:id', sanitizeBody, verifyToken, materialApis.updateMaterial(db));

    /**
     * DELETE /api/inventory/materials/:id
     * Xóa vật tư
     */
    router.delete('/inventory/materials/:id', verifyToken, materialApis.deleteMaterial(db));

    /**
     * POST /api/inventory/materials/import
     * Import danh sách vật tư từ Excel
     */
    router.post('/inventory/materials/import', sanitizeBody, verifyToken, materialApis.importMaterials(db));

    // ================================================================
    // RECEIPTS (Phiếu nhập kho)
    // ================================================================

    /**
     * GET /api/inventory/receipts
     * Lấy danh sách phiếu nhập
     */
    router.get('/inventory/receipts', sanitizeQuery, verifyToken, materialApis.getReceipts(db));

    /**
     * GET /api/inventory/receipts/:id
     * Lấy chi tiết phiếu nhập
     */
    router.get('/inventory/receipts/:id', verifyToken, materialApis.getReceiptDetail(db));

    /**
     * POST /api/inventory/receipts
     * Tạo phiếu nhập kho
     */
    router.post('/inventory/receipts', sanitizeBody, verifyToken, materialApis.createReceipt(db));

    /**
     * PUT /api/inventory/receipts/:id
     * Cập nhật phiếu nhập
     */
    router.put('/inventory/receipts/:id', sanitizeBody, verifyToken, materialApis.updateReceipt(db));

    // ================================================================
    // ISSUES (Phiếu xuất kho)
    // ================================================================

    /**
     * GET /api/inventory/issues
     * Lấy danh sách phiếu xuất
     */
    router.get('/inventory/issues', sanitizeQuery, verifyToken, materialApis.getIssues(db));

    /**
     * GET /api/inventory/issues/:id
     * Lấy chi tiết phiếu xuất
     */
    router.get('/inventory/issues/:id', verifyToken, materialApis.getIssueDetail(db));

    /**
     * POST /api/inventory/issues
     * Tạo phiếu xuất kho
     */
    router.post('/inventory/issues', sanitizeBody, verifyToken, materialApis.createIssue(db));

    /**
     * PUT /api/inventory/issues/:id
     * Cập nhật phiếu xuất
     */
    router.put('/inventory/issues/:id', sanitizeBody, verifyToken, materialApis.updateIssue(db));

    // ================================================================
    // TRANSFERS (Phiếu chuyển kho)
    // ================================================================

    /**
     * GET /api/inventory/transfers
     * Lấy danh sách phiếu chuyển kho
     */
    router.get('/inventory/transfers', sanitizeQuery, verifyToken, materialApis.getTransfers(db));

    /**
     * GET /api/inventory/transfers/:id
     * Lấy chi tiết phiếu chuyển
     */
    router.get('/inventory/transfers/:id', verifyToken, materialApis.getTransferDetail(db));

    /**
     * POST /api/inventory/transfers
     * Tạo phiếu chuyển kho
     */
    router.post('/inventory/transfers', sanitizeBody, verifyToken, materialApis.createTransfer(db));

    /**
     * PUT /api/inventory/transfers/:id
     * Cập nhật phiếu chuyển
     */
    router.put('/inventory/transfers/:id', sanitizeBody, verifyToken, materialApis.updateTransfer(db));

    // ================================================================
    // REPORTS (Báo cáo tồn kho)
    // ================================================================

    /**
     * GET /api/inventory/summary
     * Báo cáo tồn kho tổng hợp
     */
    router.get('/inventory/summary', sanitizeQuery, verifyToken, materialApis.getInventorySummary(db));

    /**
     * GET /api/inventory/cards
     * Thẻ kho chi tiết
     */
    router.get('/inventory/cards', sanitizeQuery, verifyToken, materialApis.getInventoryCards(db));

    // ================================================================
    // LEGACY ROUTES (Backward compatibility với /hcsn/*)
    // Sẽ được xóa trong phiên bản tiếp theo
    // ================================================================

    router.get('/hcsn/materials', sanitizeQuery, verifyToken, materialApis.getMaterials(db));
    router.post('/hcsn/materials', sanitizeBody, verifyToken, materialApis.createMaterial(db));
    router.put('/hcsn/materials/:id', sanitizeBody, verifyToken, materialApis.updateMaterial(db));
    router.delete('/hcsn/materials/:id', verifyToken, materialApis.deleteMaterial(db));
    router.post('/hcsn/materials/import', sanitizeBody, verifyToken, materialApis.importMaterials(db));

    return router;
};
