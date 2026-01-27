/**
 * Revenue Routes (Thu sự nghiệp)
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');
const revenueApis = require('../revenue_apis');
const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    // ==================== REVENUE CATEGORIES ====================
    router.get('/revenue/categories', verifyToken, revenueApis.getCategories(db));
    router.post('/revenue/categories', verifyToken, revenueApis.createCategory(db));

    // ==================== REVENUE RECEIPTS ====================
    router.get('/revenue/receipts', verifyToken, revenueApis.getReceipts(db));
    router.get('/revenue/receipts/:id', verifyToken, revenueApis.getReceiptDetail(db));
    router.post('/revenue/receipts', verifyToken, revenueApis.createReceipt(db));
    router.put('/revenue/receipts/:id', verifyToken, revenueApis.updateReceipt(db));
    router.delete('/revenue/receipts/:id', verifyToken, revenueApis.deleteReceipt(db));

    // ==================== REVENUE REPORTS ====================
    router.get('/revenue/report', verifyToken, revenueApis.getRevenueReport(db));
    router.get('/revenue/budget-comparison', verifyToken, revenueApis.getBudgetComparison(db));

    return router;
};
