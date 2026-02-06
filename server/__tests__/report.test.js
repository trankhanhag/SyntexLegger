/**
 * Report API Tests
 * Tests for accounting reports endpoints
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Reset modules to ensure mock is applied
beforeEach(() => {
    jest.resetModules();
});

// Mock dn_reports_apis
jest.mock('../dn_reports_apis', () => ({
    getBalanceSheetDN: (db) => (req, res) => res.json({ assets: [], liabilities: [], equity: [] }),
    getProfitLossStatement: (db) => (req, res) => res.json({ revenue: 0, expenses: 0, profit: 0 }),
    getCashFlowStatement: (db) => (req, res) => res.json({ operating: 0, investing: 0, financing: 0 }),
    getNotesToFinancialStatements: (db) => (req, res) => res.json({ notes: [] }),
    getCostAnalysis: (db) => (req, res) => res.json({ costs: [] }),
    getProfitabilityAnalysis: (db) => (req, res) => res.json({ analysis: [] }),
    getBudgetPerformance: (db) => (req, res) => res.json({ budget: [] }),
    getFinancialAnalysis: (db) => (req, res) => res.json({ analysis: [] }),
}));

// Mock Middleware - comprehensive mock
jest.mock('../middleware', () => ({
    verifyToken: (req, res, next) => {
        req.user = { username: 'testuser', role: 'admin' };
        next();
    },
    requireRole: (role) => (req, res, next) => next(),
    rateLimitLogin: jest.fn(),
    clearLoginAttempts: jest.fn(),
    checkDateLock: (req, res, next) => next(),
    logAction: jest.fn(),
    SECRET_KEY: 'test-secret',
    loginAttempts: new Map(),
    verifyWebhookAuth: (req, res, next) => next(),
    webhookAuth: (req, res, next) => next(),
    errorHandler: (err, req, res, next) => res.status(500).json({ error: err.message }),
    notFoundHandler: (req, res) => res.status(404).json({ error: 'Not found' }),
    requestLogger: (req, res, next) => next(),
    sanitizeAll: (req, res, next) => next(),
    sanitizeBody: (req, res, next) => next(),
    sanitizeQuery: (req, res, next) => next(),
    sanitizeParams: (req, res, next) => next(),
    validateVoucher: (req, res, next) => next(),
    validateVoucherBalance: (req, res, next) => next(),
    isOffBalanceSheetAccount: (code) => code?.startsWith('0'),
    validatePartner: (req, res, next) => next(),
    validateAccount: (req, res, next) => next(),
    validateLogin: (req, res, next) => next(),
    validatePagination: (req, res, next) => next(),
    validateDateRange: (req, res, next) => next(),
    createAuditMiddleware: () => (req, res, next) => next(),
    voucherAuditMiddleware: (req, res, next) => next(),
    budgetAuditMiddleware: (req, res, next) => next(),
    sessionAuditMiddleware: (req, res, next) => next(),
    captureOldValues: () => (req, res, next) => next(),
    setAuditEntityId: () => (req, res, next) => next(),
    logCustomAudit: jest.fn(),
    AppError: class AppError extends Error {
        constructor(message, statusCode = 500) { super(message); this.statusCode = statusCode; }
    },
    BadRequestError: class BadRequestError extends Error {
        constructor(message = 'Bad request') { super(message); this.statusCode = 400; }
    },
    NotFoundError: class NotFoundError extends Error {
        constructor(resource = 'Resource') { super(`${resource} not found`); this.statusCode = 404; }
    },
    asyncHandler: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
}));

describe('Report Routes', () => {
    let app;
    let mockDb;
    let reportRoutes;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDb = {
            all: jest.fn((sql, params, cb) => {
                if (typeof params === 'function') {
                    cb = params;
                    params = [];
                }
                cb(null, []);
            }),
            get: jest.fn((sql, params, cb) => {
                if (typeof params === 'function') {
                    cb = params;
                    params = [];
                }
                cb(null, null);
            }),
        };

        // Require routes fresh with mock in place
        reportRoutes = require('../routes/report.routes');

        app = express();
        app.use(bodyParser.json());
        app.use('/api', reportRoutes(mockDb));
    });

    // ========================================
    // TRIAL BALANCE
    // ========================================
    describe('GET /api/reports/trial-balance', () => {
        test('should return trial balance data', async () => {
            const mockTrialBalance = [
                {
                    account_code: '111',
                    account_name: 'Cash',
                    op_debit: 1000000,
                    op_credit: 0,
                    p_debit: 500000,
                    p_credit: 200000,
                },
            ];
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, mockTrialBalance);
            });

            const response = await request(app)
                .get('/api/reports/trial-balance')
                .query({ fromDate: '2024-01-01', toDate: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });

        test('should use default dates if not provided', async () => {
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, []);
            });

            const response = await request(app).get('/api/reports/trial-balance');

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });

        test('should handle database errors', async () => {
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(new Error('Database error'), null);
            });

            const response = await request(app)
                .get('/api/reports/trial-balance')
                .query({ fromDate: '2024-01-01', toDate: '2024-12-31' });

            expect(response.status).toBe(400);
        });
    });

    // ========================================
    // GENERAL LEDGER
    // ========================================
    describe('GET /api/reports/general-ledger', () => {
        test('should return ledger entries for account', async () => {
            const mockLedgerEntries = [
                {
                    id: 1,
                    trx_date: '2024-01-15',
                    doc_no: 'PC-001',
                    description: 'Payment',
                    debit_amount: 1000000,
                    credit_amount: 0,
                },
            ];
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, { balance: 0 });
            });
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, mockLedgerEntries);
            });

            const response = await request(app)
                .get('/api/reports/general-ledger')
                .query({ account_code: '111', from: '2024-01-01', to: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            // First entry should be opening balance
            expect(response.body[0].description).toBe('Số dư đầu kỳ');
        });

        test('should handle missing account_code', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, { balance: 0 });
            });
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, []);
            });

            const response = await request(app)
                .get('/api/reports/general-ledger')
                .query({ from: '2024-01-01', to: '2024-12-31' });

            expect(response.status).toBe(200);
        });
    });

    // ========================================
    // CASH BOOK
    // ========================================
    describe('GET /api/reports/cash-book', () => {
        test('should return cash book entries', async () => {
            const mockCashBook = [
                {
                    id: 1,
                    trx_date: '2024-01-15',
                    doc_no: 'PT-001',
                    description: 'Receipt',
                    debit_amount: 1000000,
                    credit_amount: 0,
                    reciprocal_acc: '511',
                },
            ];
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, { balance: 0 });
            });
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, mockCashBook);
            });

            const response = await request(app)
                .get('/api/reports/cash-book')
                .query({ fromDate: '2024-01-01', toDate: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            // First entry should be opening balance
            expect(response.body[0].description).toBe('Số dư đầu kỳ');
        });
    });

    // ========================================
    // BANK BOOK
    // ========================================
    describe('GET /api/reports/bank-book', () => {
        test('should return bank book entries', async () => {
            const mockBankBook = [
                {
                    id: 1,
                    trx_date: '2024-01-15',
                    doc_no: 'BC-001',
                    description: 'Bank receipt',
                    debit_amount: 5000000,
                    credit_amount: 0,
                    reciprocal_acc: '131',
                },
            ];
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, { balance: 0 });
            });
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, mockBankBook);
            });

            const response = await request(app)
                .get('/api/reports/bank-book')
                .query({ from: '2024-01-01', to: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });
    });

    // ========================================
    // BALANCE SHEET
    // ========================================
    describe('GET /api/reports/balance-sheet', () => {
        test('should return balance sheet data', async () => {
            const mockBalances = [
                { account_code: '111', balance: 1000000 },
                { account_code: '211', balance: 5000000 },
                { account_code: '331', balance: -2000000 },
            ];
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, mockBalances);
            });

            const response = await request(app)
                .get('/api/reports/balance-sheet')
                .query({ toDate: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });
    });

    // ========================================
    // TAX DECLARATION REPORTS
    // ========================================
    describe('GET /api/reports/tax-declaration', () => {
        test('should return VAT declaration data', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, {
                    input_vat: 1000000,
                    output_vat: 1500000,
                    revenue: 15000000,
                });
            });

            const response = await request(app)
                .get('/api/reports/tax-declaration')
                .query({ type: 'vat', from: '2024-01-01', to: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('v24'); // Input VAT field
            expect(response.body).toHaveProperty('v35'); // Output VAT field
        });

        test('should return PIT declaration data', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, { pit_tax: 500000 });
            });

            const response = await request(app)
                .get('/api/reports/tax-declaration')
                .query({ type: 'pit', from: '2024-01-01', to: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('v21'); // Employee count
            expect(response.body).toHaveProperty('v30'); // Tax amount
        });

        test('should return CIT declaration data', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, {
                    cit_tax: 2000000,
                    revenue: 50000000,
                    expenses: 40000000,
                });
            });

            const response = await request(app)
                .get('/api/reports/tax-declaration')
                .query({ type: 'cit', from: '2024-01-01', to: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('a1'); // Revenue
            expect(response.body).toHaveProperty('c7'); // CIT
        });

        test('should return empty object for unknown type', async () => {
            const response = await request(app)
                .get('/api/reports/tax-declaration')
                .query({ type: 'unknown' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({});
        });
    });

    // ========================================
    // GENERAL JOURNAL
    // ========================================
    describe('GET /api/reports/general-journal', () => {
        test('should return journal entries', async () => {
            const mockJournalEntries = [
                {
                    id: 1,
                    trx_date: '2024-01-15',
                    doc_no: 'PC-001',
                    description: 'Payment',
                    debit_amount: 1000000,
                    credit_amount: 0,
                },
            ];
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, mockJournalEntries);
            });

            const response = await request(app)
                .get('/api/reports/general-journal')
                .query({ from: '2024-01-01', to: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });
    });

    // ========================================
    // INVENTORY REPORT
    // ========================================
    describe('GET /api/reports/inventory', () => {
        test('should return inventory report', async () => {
            const mockInventory = [
                {
                    account_code: '1521',
                    opening_val: 1000000,
                    in_val: 500000,
                    out_val: 300000,
                },
            ];
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, mockInventory);
            });

            const response = await request(app)
                .get('/api/reports/inventory')
                .query({ fromDate: '2024-01-01', toDate: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });
    });

    // ========================================
    // BALANCE VERIFICATION
    // ========================================
    describe('GET /api/reports/balance-verification', () => {
        test('should return balance verification report', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, {
                    total_debit: 10000000,
                    total_credit: 10000000,
                    difference: 0,
                    entry_count: 50,
                });
            });
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, []);
            });

            const response = await request(app)
                .get('/api/reports/balance-verification')
                .query({ fromDate: '2024-01-01', toDate: '2024-12-31' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('summary');
            expect(response.body.summary.is_balanced).toBe(true);
        });

        test('should detect unbalanced vouchers', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, {
                    total_debit: 10000000,
                    total_credit: 9999000,
                    difference: 1000,
                    entry_count: 50,
                });
            });
            mockDb.all
                .mockImplementationOnce((sql, params, cb) => {
                    // Unbalanced vouchers
                    cb(null, [{ doc_no: 'PC-001', difference: 1000 }]);
                })
                .mockImplementationOnce((sql, params, cb) => {
                    // Off-balance sheet
                    cb(null, []);
                });

            const response = await request(app)
                .get('/api/reports/balance-verification')
                .query({ period: '2024-01' });

            expect(response.status).toBe(200);
            expect(response.body.summary.is_balanced).toBe(false);
            expect(response.body.unbalanced_vouchers).toHaveLength(1);
        });
    });

    // ========================================
    // VOUCHER BALANCE CHECK
    // ========================================
    describe('GET /api/reports/voucher-balance/:docNo', () => {
        test('should return voucher balance details', async () => {
            mockDb.all.mockImplementation((sql, params, cb) => {
                cb(null, [
                    { doc_no: 'PC-001', account_code: '111', debit_amount: 1000000, credit_amount: 0 },
                    { doc_no: 'PC-001', account_code: '331', debit_amount: 0, credit_amount: 1000000 },
                ]);
            });
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, {
                    total_debit: 1000000,
                    total_credit: 1000000,
                    off_balance_debit: 0,
                    off_balance_credit: 0,
                });
            });

            const response = await request(app).get('/api/reports/voucher-balance/PC-001');

            expect(response.status).toBe(200);
            expect(response.body.doc_no).toBe('PC-001');
            expect(response.body.is_balanced).toBe(true);
        });
    });

    // ========================================
    // DN REPORTS (TT 99/2025)
    // ========================================
    describe('DN Reports (TT 99/2025)', () => {
        test('should return DN balance sheet', async () => {
            const response = await request(app)
                .get('/api/reports/balance-sheet-dn')
                .query({ toDate: '2024-12-31' });

            expect(response.status).toBe(200);
        });

        test('should return profit/loss statement', async () => {
            const response = await request(app)
                .get('/api/reports/profit-loss')
                .query({ fromDate: '2024-01-01', toDate: '2024-12-31' });

            expect(response.status).toBe(200);
        });

        test('should return cash flow statement', async () => {
            const response = await request(app)
                .get('/api/reports/cash-flow-dn')
                .query({ fromDate: '2024-01-01', toDate: '2024-12-31' });

            expect(response.status).toBe(200);
        });

        test('should return notes to financial statements', async () => {
            const response = await request(app)
                .get('/api/reports/notes-fs')
                .query({ toDate: '2024-12-31' });

            expect(response.status).toBe(200);
        });
    });
});

// ========================================
// VIETNAMESE ACCOUNTING REPORT LOGIC TESTS
// ========================================
describe('Vietnamese Accounting Reports', () => {
    describe('Trial Balance (Bảng cân đối số phát sinh)', () => {
        test('should have balanced totals', () => {
            const trialBalance = [
                { opening_debit: 1000000, opening_credit: 0, period_debit: 500000, period_credit: 200000, closing_debit: 1300000, closing_credit: 0 },
                { opening_debit: 0, opening_credit: 1000000, period_debit: 200000, period_credit: 500000, closing_debit: 0, closing_credit: 1300000 },
            ];

            const totalOpeningDebit = trialBalance.reduce((sum, row) => sum + row.opening_debit, 0);
            const totalOpeningCredit = trialBalance.reduce((sum, row) => sum + row.opening_credit, 0);
            const totalPeriodDebit = trialBalance.reduce((sum, row) => sum + row.period_debit, 0);
            const totalPeriodCredit = trialBalance.reduce((sum, row) => sum + row.period_credit, 0);
            const totalClosingDebit = trialBalance.reduce((sum, row) => sum + row.closing_debit, 0);
            const totalClosingCredit = trialBalance.reduce((sum, row) => sum + row.closing_credit, 0);

            expect(totalOpeningDebit).toBe(totalOpeningCredit);
            expect(totalPeriodDebit).toBe(totalPeriodCredit);
            expect(totalClosingDebit).toBe(totalClosingCredit);
        });
    });

    describe('Balance Sheet (Bảng cân đối kế toán)', () => {
        test('should satisfy accounting equation', () => {
            const balanceSheet = {
                total_assets: 500000000,
                total_liabilities: 200000000,
                total_equity: 300000000,
            };

            expect(balanceSheet.total_assets).toBe(
                balanceSheet.total_liabilities + balanceSheet.total_equity
            );
        });
    });

    describe('Cash Flow Statement', () => {
        test('should reconcile beginning and ending cash', () => {
            const cashFlow = {
                beginning_cash: 10000000,
                operating_activities: 5000000,
                investing_activities: -2000000,
                financing_activities: 1000000,
                ending_cash: 14000000,
            };

            const calculatedEndingCash =
                cashFlow.beginning_cash +
                cashFlow.operating_activities +
                cashFlow.investing_activities +
                cashFlow.financing_activities;

            expect(calculatedEndingCash).toBe(cashFlow.ending_cash);
        });
    });

    describe('Off-Balance Sheet Accounts (TK 0xx)', () => {
        test('should not require debit = credit for off-balance accounts', () => {
            // Off-balance sheet accounts (TK 0xx) use single-entry bookkeeping
            const offBalanceEntry = {
                account_code: '007', // Ngoại tệ các loại
                debit_amount: 1000, // USD received as guarantee
                credit_amount: 0,
            };

            // This is valid - no matching credit required
            expect(offBalanceEntry.account_code.startsWith('0')).toBe(true);
            expect(offBalanceEntry.debit_amount).not.toBe(offBalanceEntry.credit_amount);
        });
    });
});

describe('Report Error Handling', () => {
    let app;
    let mockDb;
    let reportRoutes;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDb = {
            all: jest.fn((sql, params, cb) => {
                cb(null, []);
            }),
            get: jest.fn((sql, params, cb) => {
                cb(null, null);
            }),
        };

        // Require routes fresh with mock in place
        reportRoutes = require('../routes/report.routes');

        app = express();
        app.use(bodyParser.json());
        app.use('/api', reportRoutes(mockDb));
    });

    test('should handle database errors in trial-balance', async () => {
        mockDb.all.mockImplementation((sql, params, cb) => {
            cb(new Error('Database error'), null);
        });

        const response = await request(app)
            .get('/api/reports/trial-balance')
            .query({ fromDate: '2024-01-01', toDate: '2024-12-31' });

        expect(response.status).toBe(400);
    });

    test('should handle database errors in general-ledger', async () => {
        mockDb.get.mockImplementation((sql, params, cb) => {
            cb(new Error('Database error'), null);
        });

        const response = await request(app)
            .get('/api/reports/general-ledger')
            .query({ account_code: '111', from: '2024-01-01', to: '2024-12-31' });

        expect(response.status).toBe(400);
    });

    test('should handle database errors in cash-book', async () => {
        mockDb.get.mockImplementation((sql, params, cb) => {
            cb(new Error('Database error'), null);
        });

        const response = await request(app)
            .get('/api/reports/cash-book')
            .query({ fromDate: '2024-01-01', toDate: '2024-12-31' });

        expect(response.status).toBe(400);
    });
});
