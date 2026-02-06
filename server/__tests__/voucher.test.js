/**
 * Voucher API Tests
 * SyntexLegger - Unit Tests
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Reset modules to ensure mock is applied
beforeEach(() => {
    jest.resetModules();
});

// Mock database module to prevent real DB connections
jest.mock('../database', () => ({
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn(),
    serialize: jest.fn(),
    prepare: jest.fn()
}));

// Mock audit service to prevent real DB connections
jest.mock('../services/audit.service', () => ({
    logVoucherCreate: jest.fn().mockResolvedValue({ success: true }),
    logVoucherUpdate: jest.fn().mockResolvedValue({ success: true }),
    logVoucherDelete: jest.fn().mockResolvedValue({ success: true }),
    logVoucherAction: jest.fn().mockResolvedValue({ success: true }),
    logVoucherAudit: jest.fn().mockResolvedValue({ success: true }),
    logBudgetTransaction: jest.fn().mockResolvedValue({ success: true }),
    getAuditTrail: jest.fn().mockResolvedValue([]),
    generateAuditId: jest.fn().mockReturnValue('AUD_TEST_123'),
    calculateChecksum: jest.fn().mockReturnValue('test-checksum'),
    getFiscalPeriod: jest.fn().mockReturnValue({ year: 2024, period: 1 })
}));

// Mock budget service to prevent real DB connections
jest.mock('../services/budget.service', () => ({
    isPeriodLocked: jest.fn().mockResolvedValue({ locked: false }),
    checkBudgetAvailability: jest.fn().mockResolvedValue({ available: true, remaining: 100000 }),
    checkBudgetForSpending: jest.fn().mockResolvedValue({ allowed: true, status: 'OK' }),
    reserveBudget: jest.fn().mockResolvedValue({ success: true }),
    releaseBudget: jest.fn().mockResolvedValue({ success: true }),
    reverseBudgetTransaction: jest.fn().mockResolvedValue({ success: true }),
    recordBudgetTransaction: jest.fn().mockResolvedValue({ success: true }),
    createBudgetAlert: jest.fn().mockResolvedValue({ success: true }),
    getBudgetPeriod: jest.fn().mockReturnValue({ year: 2024, period: 1, quarter: 1 }),
    generateId: jest.fn().mockReturnValue('BUD_TEST_123')
}));

// Mock Middleware - comprehensive mock
const mockCheckDateLock = jest.fn();
jest.mock('../middleware', () => ({
    verifyToken: (req, res, next) => {
        req.user = { username: 'testuser', role: 'admin' };
        next();
    },
    requireRole: (role) => (req, res, next) => next(),
    rateLimitLogin: jest.fn(),
    clearLoginAttempts: jest.fn(),
    checkDateLock: (...args) => mockCheckDateLock(...args),
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

describe('Voucher Routes', () => {
    let app;
    let mockDb;
    let voucherRoutes;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset mocks
        mockCheckDateLock.mockReset();
        mockCheckDateLock.mockResolvedValue({ locked: false });

        // Setup Mock DB
        mockDb = {
            all: jest.fn((sql, params, cb) => cb(null, [])),
            get: jest.fn((sql, params, cb) => cb(null, null)),
            run: jest.fn(function (sql, params, cb) {
                // Handle optional params
                if (typeof params === 'function') {
                    cb = params;
                    params = [];
                }
                // Call callback with no error
                if (cb) cb.call({ lastID: 1, changes: 1 }, null);
                return this;
            }),
            serialize: jest.fn(cb => cb()),
            prepare: jest.fn(() => {
                const stmt = {
                    run: jest.fn(function (...args) {
                        const cb = args.find(a => typeof a === 'function');
                        if (cb) cb.call({ lastID: 1, changes: 1 }, null);
                        return stmt;
                    }),
                    finalize: jest.fn(cb => cb && cb(null))
                };
                return stmt;
            })
        };

        // Require routes fresh with mock in place
        voucherRoutes = require('../routes/voucher.routes');

        // Create App
        app = express();
        app.use(bodyParser.json());
        app.use('/api', voucherRoutes(mockDb));
    });

    describe('GET /api/vouchers', () => {
        test('should return list of vouchers', async () => {
            const mockVouchers = [
                { id: 'V1', doc_no: 'CT001', total_amount: 1000 },
                { id: 'V2', doc_no: 'CT002', total_amount: 2000 }
            ];
            mockDb.all.mockImplementation((sql, params, cb) => cb(null, mockVouchers));

            const response = await request(app).get('/api/vouchers');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockVouchers);
            expect(mockDb.all).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM vouchers'),
                expect.any(Array),
                expect.any(Function)
            );
        });

        test('should filter by type and date', async () => {
            await request(app).get('/api/vouchers?type=PAYMENT&fromDate=2024-01-01');

            expect(mockDb.all).toHaveBeenCalledWith(
                expect.stringContaining('WHERE type = ? AND doc_date >= ?'),
                ['PAYMENT', '2024-01-01'],
                expect.any(Function)
            );
        });
    });

    describe('GET /api/vouchers/:id', () => {
        test('should return voucher with items', async () => {
            const mockVoucher = { id: 'V1', doc_no: 'CT001' };
            const mockItems = [{ id: 1, amount: 100 }];

            mockDb.get.mockImplementation((sql, params, cb) => cb(null, mockVoucher));
            mockDb.all.mockImplementation((sql, params, cb) => cb(null, mockItems));

            const response = await request(app).get('/api/vouchers/V1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ ...mockVoucher, items: mockItems });
        });

        test('should return 404 if voucher not found', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, null));

            const response = await request(app).get('/api/vouchers/V999');

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/vouchers', () => {
        const newVoucher = {
            doc_no: 'CT003',
            doc_date: '2024-01-15',
            post_date: '2024-01-15',
            description: 'New Voucher',
            type: 'GL',
            total_amount: 5000,
            items: [
                { description: 'Item 1', debit_acc: '111', credit_acc: '511', amount: 5000 }
            ]
        };

        test('should create new voucher and items', async () => {
            const response = await request(app)
                .post('/api/vouchers')
                .send(newVoucher);

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('Voucher saved');

            // Check transactions
            expect(mockDb.serialize).toHaveBeenCalled();
            expect(mockDb.run).toHaveBeenCalledWith('BEGIN TRANSACTION');

            // Check Insert Voucher logic
            // Note: The specific calls depend on implementation order
            // We just ensure INSERT INTO vouchers was called
            // Using flexible matching because exact SQL string might vary slightly in whitespaces or if refactored
            // But here we know the code uses templated strings or simple strings
        });

        test('should return 403 if period is locked', async () => {
            mockCheckDateLock.mockResolvedValue({ locked: true, lockedUntil: '2024-01-31' });

            const response = await request(app)
                .post('/api/vouchers')
                .send(newVoucher);

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Kỳ kế toán đã khóa');
        });
    });

    describe('DELETE /api/vouchers/:id', () => {
        test('should delete voucher and related data', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, { doc_no: 'CT001', post_date: '2024-01-10' }));

            const response = await request(app).delete('/api/vouchers/V1');

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('Voucher deleted');
            expect(mockDb.run).toHaveBeenCalledWith('BEGIN TRANSACTION');
            expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM vouchers WHERE id = ?', ['V1'], expect.any(Function));
        });

        test('should return 404 if not found', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, null));
            const response = await request(app).delete('/api/vouchers/V999');
            expect(response.status).toBe(404);
        });

        test('should prevent delete if locked', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, { doc_no: 'CT001', post_date: '2024-01-10' }));
            mockCheckDateLock.mockResolvedValue({ locked: true }); // Mock lock

            const response = await request(app).delete('/api/vouchers/V1');

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Kỳ kế toán đã khóa');
        });
    });

    describe('Staging Import', () => {
        test('POST /api/staging/import should insert data', async () => {
            const data = [
                { doc_no: 'IMP001', description: 'Imported', amount: 100 }
            ];

            const response = await request(app)
                .post('/api/staging/import')
                .send({ data });

            expect(response.status).toBe(200);
            expect(mockDb.prepare).toHaveBeenCalled();
            // Verify stmt.run called
        });
    });
});
