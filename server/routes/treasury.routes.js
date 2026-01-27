/**
 * Treasury API Routes (Kho bạc Nhà nước)
 * SyntexHCSN - Express Router for Treasury integration
 */

const express = require('express');
const TreasuryService = require('../services/treasury.service');

module.exports = (db) => {
    const router = express.Router();
    const treasury = new TreasuryService();

    /**
     * GET /api/treasury/connection-test
     * Test connection to Treasury API
     */
    router.get('/connection-test', async (req, res) => {
        const result = await treasury.testConnection();
        res.json(result);
    });

    /**
     * GET /api/treasury/budget/allocation
     * Get budget allocation details
     */
    router.get('/budget/allocation', async (req, res) => {
        const { fiscalYear, budgetType } = req.query;
        const result = await treasury.getBudgetAllocation(fiscalYear || new Date().getFullYear().toString(), budgetType);
        res.json(result);
    });

    /**
     * GET /api/treasury/budget/execution
     * Get budget execution status
     */
    router.get('/budget/execution', async (req, res) => {
        const { fiscalYear, fromDate, toDate } = req.query;
        const year = fiscalYear || new Date().getFullYear().toString();
        const result = await treasury.getBudgetExecution(year, fromDate, toDate);
        res.json(result);
    });

    /**
     * GET /api/treasury/reconciliation/detail
     * Get detailed reconciliation data
     */
    router.get('/reconciliation/detail', async (req, res) => {
        const { fiscalMonth } = req.query;
        const result = await treasury.getReconciliationDetail(fiscalMonth);
        res.json(result);
    });

    /**
     * POST /api/treasury/reconciliation/action
     * Handle reconciliation item action
     */
    router.post('/reconciliation/action', async (req, res) => {
        const { itemId, action, note } = req.body;
        const result = await treasury.handleReconciliationAction(itemId, action, note);
        res.json(result);
    });

    /**
     * POST /api/treasury/reconciliation
     * Reconcile local data with TABMIS
     */
    router.post('/reconciliation', async (req, res) => {
        try {
            const { fromDate, toDate } = req.body;

            // Get local vouchers for reconciliation
            const sql = `
                SELECT 
                    v.id, v.doc_no, v.doc_date, v.post_date, v.description,
                    v.type, v.total_amount, v.status
                FROM vouchers v
                WHERE v.post_date BETWEEN ? AND ?
                AND v.status = 'posted'
                ORDER BY v.post_date
            `;

            db.all(sql, [fromDate, toDate], async (err, localVouchers) => {
                if (err) {
                    return res.status(500).json({ success: false, error: { message: err.message } });
                }

                // Transform to TABMIS format
                const localData = localVouchers.map(v => ({
                    docNo: v.doc_no,
                    docDate: v.doc_date,
                    postDate: v.post_date,
                    amount: v.total_amount,
                    type: v.type,
                    description: v.description
                }));

                const result = await treasury.reconcileWithTABMIS(localData);
                res.json(result);
            });
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * POST /api/treasury/payment-orders
     * Submit electronic payment order
     */
    router.post('/payment-orders', async (req, res) => {
        const paymentOrder = req.body;
        const result = await treasury.submitPaymentOrder(paymentOrder);
        res.json(result);
    });

    /**
     * GET /api/treasury/payment-orders/:id/status
     * Get payment order status
     */
    router.get('/payment-orders/:id/status', async (req, res) => {
        const result = await treasury.getPaymentOrderStatus(req.params.id);
        res.json(result);
    });

    /**
     * GET /api/treasury/transactions/import
     * Import transactions from Treasury
     */
    router.get('/transactions/import', async (req, res) => {
        const { fromDate, toDate } = req.query;
        const result = await treasury.importTransactions(fromDate, toDate);
        res.json(result);
    });

    /**
     * GET /api/treasury/accounts/:code/balance
     * Get account balance from Treasury
     */
    router.get('/accounts/:code/balance', async (req, res) => {
        const result = await treasury.getAccountBalance(req.params.code);
        res.json(result);
    });

    /**
     * POST /api/treasury/transactions/import-save
     * Import and save transactions to local database
     */
    router.post('/transactions/import-save', async (req, res) => {
        try {
            const { fromDate, toDate } = req.body;
            const importResult = await treasury.importTransactions(fromDate, toDate);

            if (!importResult.success) {
                return res.json(importResult);
            }

            const transactions = importResult.data.transactions;
            let savedCount = 0;

            // Save to staging table
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO treasury_imports 
                (id, import_date, transaction_date, type, amount, description, budget_code, status, tabmis_ref)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            transactions.forEach(tx => {
                stmt.run(
                    tx.id,
                    new Date().toISOString().split('T')[0],
                    tx.date,
                    tx.type,
                    tx.amount,
                    tx.description,
                    tx.budgetCode,
                    tx.status,
                    tx.tabmisRef
                );
                savedCount++;
            });

            stmt.finalize();

            res.json({
                success: true,
                data: {
                    imported: savedCount,
                    period: { fromDate, toDate }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    /**
     * POST /api/treasury/transactions/import-batch
     * Save imported transactions from uploaded file
     */
    router.post('/transactions/import-batch', async (req, res) => {
        try {
            const { transactions } = req.body;

            if (!Array.isArray(transactions) || transactions.length === 0) {
                return res.status(400).json({ success: false, error: { message: 'Không có dữ liệu giao dịch để lưu.' } });
            }

            let savedCount = 0;
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO treasury_imports
                (id, import_date, transaction_date, type, amount, description, budget_code, status, tabmis_ref)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            transactions.forEach(tx => {
                stmt.run(
                    tx.id,
                    new Date().toISOString().split('T')[0],
                    tx.date || tx.transaction_date,
                    tx.type || '',
                    tx.amount || 0,
                    tx.description || '',
                    tx.budgetCode || tx.budget_code || '',
                    tx.status || '',
                    tx.tabmisRef || tx.tabmis_ref || ''
                );
                savedCount++;
            });

            stmt.finalize();

            res.json({
                success: true,
                data: {
                    imported: savedCount
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: { message: error.message } });
        }
    });

    return router;
};
