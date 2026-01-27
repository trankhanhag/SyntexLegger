/**
 * Debt Management Routes (Công nợ & Tạm ứng)
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');
const debtApis = require('../debt_management_apis');
const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    // ==================== TEMPORARY ADVANCES (TK 141) ====================
    router.get('/debt/temporary-advances', verifyToken, debtApis.getTemporaryAdvances(db));
    router.post('/debt/temporary-advances', verifyToken, debtApis.createTemporaryAdvance(db));
    router.post('/debt/temporary-advances/:id/settle', verifyToken, debtApis.settleTemporaryAdvance(db));
    router.delete('/debt/temporary-advances/:id', verifyToken, debtApis.deleteTemporaryAdvance(db));

    // ==================== BUDGET ADVANCES (TK 161) ====================
    router.get('/debt/budget-advances', verifyToken, debtApis.getBudgetAdvances(db));
    router.post('/debt/budget-advances', verifyToken, debtApis.createBudgetAdvance(db));
    router.post('/debt/budget-advances/:id/repay', verifyToken, debtApis.repayBudgetAdvance(db));
    router.delete('/debt/budget-advances/:id', verifyToken, debtApis.deleteBudgetAdvance(db));

    // ==================== RECEIVABLES (TK 136, 138) ====================
    router.get('/debt/receivables', verifyToken, debtApis.getReceivables(db));
    router.post('/debt/receivables', verifyToken, debtApis.createReceivable(db));
    router.post('/debt/receivables/:id/record-payment', verifyToken, debtApis.recordReceivablePayment(db));
    router.delete('/debt/receivables/:id', verifyToken, debtApis.deleteReceivable(db));

    // ==================== PAYABLES (TK 331, 336, 338) ====================
    router.get('/debt/payables', verifyToken, debtApis.getPayables(db));
    router.post('/debt/payables', verifyToken, debtApis.createPayable(db));
    router.post('/debt/payables/:id/record-payment', verifyToken, debtApis.recordPayablePayment(db));
    router.delete('/debt/payables/:id', verifyToken, debtApis.deletePayable(db));

    // ==================== REPORTS ====================
    router.get('/debt/aging-report', verifyToken, debtApis.getAgingReport(db));

    return router;
};
