/**
 * Master Data API Tests
 * Tests for accounts, partners, products, departments endpoints
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Reset modules before each test to ensure mock is applied
beforeEach(() => {
    jest.resetModules();
});

// Mock Middleware
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
        constructor(message, statusCode = 500) {
            super(message);
            this.statusCode = statusCode;
        }
    },
    BadRequestError: class BadRequestError extends Error {
        constructor(message = 'Bad request') { super(message); this.statusCode = 400; }
    },
    NotFoundError: class NotFoundError extends Error {
        constructor(resource = 'Resource') { super(`${resource} not found`); this.statusCode = 404; }
    },
    asyncHandler: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
}));

describe('Master Data Routes', () => {
    let app;
    let mockDb;
    let masterRoutes;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Mock DB
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
            run: jest.fn(function (sql, params, cb) {
                if (typeof params === 'function') {
                    cb = params;
                    params = [];
                }
                if (cb) cb.call({ lastID: 1, changes: 1 }, null);
                return this;
            }),
            serialize: jest.fn((callback) => {
                if (callback) callback();
            }),
            prepare: jest.fn(() => {
                const stmt = {
                    run: jest.fn(function (...args) {
                        // Handle both sync and async calls
                        const cb = args.find(a => typeof a === 'function');
                        if (cb) cb.call({ lastID: 1, changes: 1 }, null);
                        return stmt;
                    }),
                    get: jest.fn((params, cb) => {
                        if (cb) cb(null, null);
                        return stmt;
                    }),
                    finalize: jest.fn((cb) => {
                        if (cb) cb(null);
                        return stmt;
                    }),
                };
                return stmt;
            }),
        };

        // Require routes fresh with mock in place
        masterRoutes = require('../routes/master.routes');

        // Create App
        app = express();
        app.use(bodyParser.json());
        app.use('/api', masterRoutes(mockDb));
    });

    // ========================================
    // ACCOUNTS TESTS
    // ========================================
    describe('GET /api/accounts', () => {
        test('should return list of accounts', async () => {
            const mockAccounts = [
                { account_code: '111', account_name: 'Cash', type: 'ASSET' },
                { account_code: '112', account_name: 'Bank', type: 'ASSET' },
            ];
            mockDb.all.mockImplementation((sql, params, cb) => {
                if (typeof params === 'function') {
                    cb = params;
                }
                cb(null, mockAccounts);
            });

            const response = await request(app).get('/api/accounts');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockAccounts);
        });

        test('should handle database errors', async () => {
            mockDb.all.mockImplementation((sql, params, cb) => {
                if (typeof params === 'function') {
                    cb = params;
                }
                cb(new Error('Database error'), null);
            });

            const response = await request(app).get('/api/accounts');

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/master/accounts', () => {
        test('should save accounts', async () => {
            const accounts = [
                { account_code: '111', account_name: 'Cash', parent_account: '1', level: 2, type: 'ASSET', is_parent: 0 },
            ];

            const response = await request(app)
                .post('/api/master/accounts')
                .send({ accounts });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Chart of Accounts updated');
        });

        test('should reject invalid data format', async () => {
            const response = await request(app)
                .post('/api/master/accounts')
                .send({ invalid: 'data' });

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/accounts/:code', () => {
        test('should delete account not used in ledger', async () => {
            mockDb.get
                .mockImplementationOnce((sql, params, cb) => cb(null, { account_code: '999' }))
                .mockImplementationOnce((sql, params, cb) => cb(null, { count: 0 }))
                .mockImplementationOnce((sql, params, cb) => cb(null, { count: 0 }))
                .mockImplementationOnce((sql, params, cb) => cb(null, { count: 0 }));

            const response = await request(app).delete('/api/accounts/999');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Account deleted');
        });

        test('should return 404 for non-existent account', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, null));

            const response = await request(app).delete('/api/accounts/NOTFOUND');

            expect(response.status).toBe(404);
        });

        test('should prevent deletion if account used in GL', async () => {
            mockDb.get
                .mockImplementationOnce((sql, params, cb) => cb(null, { account_code: '111' }))
                .mockImplementationOnce((sql, params, cb) => cb(null, { count: 5 }));

            const response = await request(app).delete('/api/accounts/111');

            expect(response.status).toBe(409);
            expect(response.body.error).toContain('used in general ledger');
        });
    });

    describe('GET /api/accounts/balances', () => {
        test('should return account balances', async () => {
            const mockBalances = [
                { account_code: '111', total_debit: 1000000, total_credit: 500000, balance: 500000 },
            ];
            mockDb.all.mockImplementation((sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                cb(null, mockBalances);
            });

            const response = await request(app).get('/api/accounts/balances');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockBalances);
        });
    });

    describe('GET /api/accounts/balance/:code', () => {
        test('should return balance for specific account', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, { balance: 1000000 });
            });

            const response = await request(app).get('/api/accounts/balance/111');

            expect(response.status).toBe(200);
            expect(response.body.account_code).toBe('111');
            expect(response.body.balance).toBe(1000000);
        });

        test('should return 0 for account with no transactions', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => {
                cb(null, { balance: null });
            });

            const response = await request(app).get('/api/accounts/balance/999');

            expect(response.status).toBe(200);
            expect(response.body.balance).toBe(0);
        });
    });

    // ========================================
    // PARTNERS TESTS
    // ========================================
    describe('GET /api/partners', () => {
        test('should return list of partners', async () => {
            const mockPartners = [
                { partner_code: 'KH001', partner_name: 'Customer A', partner_type: 'CUSTOMER' },
            ];
            mockDb.all.mockImplementation((sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                cb(null, mockPartners);
            });

            const response = await request(app).get('/api/partners');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockPartners);
        });
    });

    describe('POST /api/partners', () => {
        test('should create new partner', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, null));

            const response = await request(app)
                .post('/api/partners')
                .send({
                    partner_code: 'KH002',
                    partner_name: 'New Customer',
                    tax_code: '0123456789',
                    address: '123 Main St',
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Partner created');
        });

        test('should update existing partner', async () => {
            mockDb.get.mockImplementation((sql, params, cb) =>
                cb(null, { partner_code: 'KH001' })
            );

            const response = await request(app)
                .post('/api/partners')
                .send({
                    partner_code: 'KH001',
                    partner_name: 'Updated Customer',
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Partner updated');
        });

        test('should reject missing required fields', async () => {
            const response = await request(app)
                .post('/api/partners')
                .send({ partner_name: 'Missing code' });

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/partners/:id', () => {
        test('should delete partner', async () => {
            const response = await request(app).delete('/api/partners/KH001');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Partner deleted');
        });
    });

    describe('POST /api/master/partners (bulk import)', () => {
        test('should import partners', async () => {
            const partners = [
                { partner_code: 'KH001', partner_name: 'Customer 1' },
                { partner_code: 'KH002', partner_name: 'Customer 2' },
            ];

            const response = await request(app)
                .post('/api/master/partners')
                .send({ partners });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Partners imported successfully');
        });

        test('should reject invalid data format', async () => {
            const response = await request(app)
                .post('/api/master/partners')
                .send({ invalid: 'data' });

            expect(response.status).toBe(400);
        });
    });

    // ========================================
    // PRODUCTS TESTS
    // ========================================
    describe('GET /api/products', () => {
        test('should return list of products', async () => {
            const mockProducts = [
                { id: 1, product_code: 'SP001', product_name: 'Product A' },
            ];
            mockDb.all.mockImplementation((sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                cb(null, mockProducts);
            });

            const response = await request(app).get('/api/products');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockProducts);
        });
    });

    describe('POST /api/products', () => {
        test('should create new product', async () => {
            const response = await request(app)
                .post('/api/products')
                .send({
                    product_code: 'SP002',
                    product_name: 'New Product',
                    unit: 'Cái',
                    category: 'GOODS',
                    unit_price: 50000,
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Product created');
        });
    });

    describe('DELETE /api/products/:id', () => {
        test('should delete product', async () => {
            const response = await request(app).delete('/api/products/1');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Product deleted');
        });
    });

    describe('POST /api/master/products (bulk import)', () => {
        test('should import products', async () => {
            const products = [
                { product_code: 'SP001', product_name: 'Product 1' },
                { product_code: 'SP002', product_name: 'Product 2' },
            ];

            const response = await request(app)
                .post('/api/master/products')
                .send({ products });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Products imported successfully');
        });

        test('should reject invalid data format', async () => {
            const response = await request(app)
                .post('/api/master/products')
                .send({ invalid: 'data' });

            expect(response.status).toBe(400);
        });
    });

    // ========================================
    // DEPARTMENTS TESTS
    // ========================================
    describe('GET /api/master/departments', () => {
        test('should return list of departments', async () => {
            const mockDepts = [
                { id: 1, code: 'BP01', name: 'Bộ phận Kế toán', type: 'DEPARTMENT' },
            ];
            mockDb.all.mockImplementation((sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                cb(null, mockDepts);
            });

            const response = await request(app).get('/api/master/departments');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockDepts);
        });
    });

    describe('POST /api/master/departments', () => {
        test('should create new department', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, null));

            const response = await request(app)
                .post('/api/master/departments')
                .send({ code: 'BP01', name: 'Bộ phận Kế toán' });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Tạo bộ phận thành công');
        });

        test('should update existing department', async () => {
            mockDb.get.mockImplementation((sql, params, cb) =>
                cb(null, { id: 1 })
            );

            const response = await request(app)
                .post('/api/master/departments')
                .send({ code: 'BP01', name: 'Bộ phận Kế toán Updated' });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Cập nhật bộ phận thành công');
        });

        test('should reject missing required fields', async () => {
            const response = await request(app)
                .post('/api/master/departments')
                .send({ name: 'Missing code' });

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/master/departments/:code', () => {
        test('should soft delete department', async () => {
            const response = await request(app).delete('/api/master/departments/BP01');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Đã xóa bộ phận');
        });

        test('should return 404 for non-existent department', async () => {
            mockDb.run.mockImplementation(function (sql, params, cb) {
                if (typeof params === 'function') cb = params;
                if (cb) cb.call({ changes: 0 }, null);
            });

            const response = await request(app).delete('/api/master/departments/NOTFOUND');

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/master/departments/import', () => {
        test('should import departments', async () => {
            const departments = [
                { code: 'BP01', name: 'Kế toán' },
                { code: 'BP02', name: 'Nhân sự' },
            ];

            const response = await request(app)
                .post('/api/master/departments/import')
                .send({ departments });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Import thành công');
        });

        test('should reject invalid data format', async () => {
            const response = await request(app)
                .post('/api/master/departments/import')
                .send({ invalid: 'data' });

            expect(response.status).toBe(400);
        });
    });

    // ========================================
    // BALANCES (CASH & BANK) TESTS
    // ========================================
    describe('GET /api/balances', () => {
        test('should return cash and bank balances', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                cb(null, { cash_balance: 1000000, bank_balance: 5000000 });
            });
            mockDb.all.mockImplementation((sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                cb(null, []);
            });

            const response = await request(app).get('/api/balances');

            expect(response.status).toBe(200);
            expect(response.body.cash).toBe(1000000);
            expect(response.body.bank).toBe(5000000);
            expect(response.body.history).toEqual([]);
        });

        test('should return 0 for empty balances', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                cb(null, { cash_balance: null, bank_balance: null });
            });
            mockDb.all.mockImplementation((sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                cb(null, []);
            });

            const response = await request(app).get('/api/balances');

            expect(response.status).toBe(200);
            expect(response.body.cash).toBe(0);
            expect(response.body.bank).toBe(0);
        });
    });
});
