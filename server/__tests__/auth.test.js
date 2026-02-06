/**
 * Authentication API Tests
 * SyntexLegger - Unit Tests
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('../routes/auth.routes');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock Middleware
jest.mock('../middleware', () => ({
    rateLimitLogin: (req, res, next) => next(),
    logAction: jest.fn(),
    clearLoginAttempts: jest.fn(),
    SECRET_KEY: 'test-secret',
    loginAttempts: {}
}));

describe('Auth Routes', () => {
    let app;
    let mockDb;

    beforeEach(() => {
        // Setup Mock DB
        mockDb = {
            get: jest.fn(),
            run: jest.fn((sql, params, cb) => {
                if (typeof params === 'function') cb = params;
                cb && cb.call({ lastID: 1, changes: 1 }, null);
                return this;
            }),
            all: jest.fn()
        };

        // Create App
        app = express();
        app.use(bodyParser.json());
        app.use('/api', authRoutes(mockDb));
    });

    describe('POST /api/login', () => {
        const validPasswordHash = bcrypt.hashSync('admin123', 8);
        const mockUser = {
            id: 1,
            username: 'admin',
            password: validPasswordHash,
            role: 'admin',
            status: 'Active'
        };

        test('should return token for valid credentials', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, mockUser));

            const response = await request(app)
                .post('/api/login')
                .send({ username: 'admin', password: 'admin123' });

            expect(response.status).toBe(200);
            expect(response.body.auth).toBe(true);
            expect(response.body.token).toBeDefined();
            expect(response.body.user.username).toBe('admin');
        });

        test('should return 401 for invalid password', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, mockUser));

            const response = await request(app)
                .post('/api/login')
                .send({ username: 'admin', password: 'wrongpassword' });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('Sai tên đăng nhập hoặc mật khẩu');
        });

        test('should return 401 if user not found', async () => {
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, null));

            const response = await request(app)
                .post('/api/login')
                .send({ username: 'unknown', password: 'password' });

            expect(response.status).toBe(401);
        });

        test('should return 403 if user is inactive', async () => {
            const inactiveUser = { ...mockUser, status: 'Inactive' };
            mockDb.get.mockImplementation((sql, params, cb) => cb(null, inactiveUser));

            const response = await request(app)
                .post('/api/login')
                .send({ username: 'admin', password: 'admin123' });

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('không hoạt động');
        });
    });
});
