/**
 * Expense Routes (Chi sự nghiệp)
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');
const expenseApis = require('../expense_apis');
const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    // ==================== EXPENSE CATEGORIES ====================
    router.get('/expense/categories', verifyToken, expenseApis.getCategories(db));
    router.post('/expense/categories', verifyToken, expenseApis.createCategory(db));

    // ==================== EXPENSE VOUCHERS ====================
    router.get('/expense/vouchers', verifyToken, expenseApis.getVouchers(db));
    router.get('/expense/vouchers/:id', verifyToken, expenseApis.getVoucherDetail(db));
    router.post('/expense/vouchers', verifyToken, expenseApis.createVoucher(db));
    router.put('/expense/vouchers/:id', verifyToken, expenseApis.updateVoucher(db));
    router.delete('/expense/vouchers/:id', verifyToken, expenseApis.deleteVoucher(db));

    // ==================== EXPENSE REPORTS ====================
    router.get('/expense/report', verifyToken, expenseApis.getExpenseReport(db));
    router.get('/expense/budget-comparison', verifyToken, expenseApis.getBudgetComparison(db));

    return router;
};
