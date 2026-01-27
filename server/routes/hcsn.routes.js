/**
 * Common HCSN Routes
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const express = require('express');
const materialApis = require('../material_apis');
const { verifyToken } = require('../middleware');

module.exports = (db) => {
    const router = express.Router();

    // ==================== FUND SOURCES ====================
    router.get('/hcsn/fund-sources', verifyToken, materialApis.getFundSources(db));
    router.get('/hcsn/budget-estimates', verifyToken, materialApis.getBudgetEstimates(db));
    router.get('/hcsn/budget-allocations', verifyToken, materialApis.getBudgetAllocations(db));

    // ==================== OFF-BALANCE TRACKING ====================
    const offBalanceApis = require('../off_balance_apis');
    router.get('/hcsn/off-balance/logs', verifyToken, offBalanceApis.getOffBalanceLogs(db));
    router.post('/hcsn/off-balance/logs', verifyToken, offBalanceApis.createOffBalanceLog(db));
    router.get('/hcsn/off-balance/summary', verifyToken, offBalanceApis.getOffBalanceSummary(db));

    return router;
};
