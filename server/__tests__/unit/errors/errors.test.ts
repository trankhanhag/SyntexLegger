/**
 * Unit Tests for Custom Error Classes
 * Tests error handling infrastructure
 */

import { describe, it, expect } from '@jest/globals';

const {
    AppError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    ValidationError,
    LockedError,
    RateLimitError,
    InternalError,
    ServiceUnavailableError,
    asyncHandler,
} = require('../../../src/errors');

describe('Custom Error Classes', () => {
    describe('AppError', () => {
        it('should create error with all properties', () => {
            const error = new AppError('Test error', 500, 'TEST_ERROR', { foo: 'bar' });

            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('TEST_ERROR');
            expect(error.details).toEqual({ foo: 'bar' });
            expect(error.isOperational).toBe(true);
        });

        it('should use default values', () => {
            const error = new AppError('Test error');

            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('INTERNAL_ERROR');
            expect(error.details).toBeNull();
        });

        it('should serialize to JSON correctly', () => {
            const error = new AppError('Test error', 400, 'TEST', { info: 'details' });
            const json = error.toJSON();

            expect(json).toEqual({
                error: 'Test error',
                code: 'TEST',
                details: { info: 'details' },
            });
        });

        it('should not include details in JSON when null', () => {
            const error = new AppError('Test error');
            const json = error.toJSON();

            expect(json).toEqual({
                error: 'Test error',
                code: 'INTERNAL_ERROR',
            });
            expect(json.details).toBeUndefined();
        });

        it('should have correct name', () => {
            const error = new AppError('Test');
            expect(error.name).toBe('AppError');
        });

        it('should have stack trace', () => {
            const error = new AppError('Test');
            expect(error.stack).toBeDefined();
        });
    });

    describe('BadRequestError', () => {
        it('should have status 400', () => {
            const error = new BadRequestError('Invalid input');

            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('BAD_REQUEST');
        });

        it('should use default message', () => {
            const error = new BadRequestError();

            expect(error.message).toBe('Bad request');
        });

        it('should accept details', () => {
            const error = new BadRequestError('Invalid', { field: 'email' });

            expect(error.details).toEqual({ field: 'email' });
        });
    });

    describe('UnauthorizedError', () => {
        it('should have status 401', () => {
            const error = new UnauthorizedError('Invalid token');

            expect(error.statusCode).toBe(401);
            expect(error.code).toBe('UNAUTHORIZED');
        });

        it('should use default message', () => {
            const error = new UnauthorizedError();

            expect(error.message).toBe('Unauthorized');
        });
    });

    describe('ForbiddenError', () => {
        it('should have status 403', () => {
            const error = new ForbiddenError('Access denied');

            expect(error.statusCode).toBe(403);
            expect(error.code).toBe('FORBIDDEN');
        });

        it('should use default message', () => {
            const error = new ForbiddenError();

            expect(error.message).toBe('Forbidden');
        });
    });

    describe('NotFoundError', () => {
        it('should have status 404', () => {
            const error = new NotFoundError('User', '123');

            expect(error.statusCode).toBe(404);
            expect(error.code).toBe('NOT_FOUND');
        });

        it('should format message with resource and id', () => {
            const error = new NotFoundError('User', '123');

            expect(error.message).toBe("User with ID '123' not found");
            expect(error.details).toEqual({ resource: 'User', id: '123' });
        });

        it('should format message without id', () => {
            const error = new NotFoundError('User');

            expect(error.message).toBe('User not found');
        });

        it('should use default resource name', () => {
            const error = new NotFoundError();

            expect(error.message).toBe('Resource not found');
        });
    });

    describe('ConflictError', () => {
        it('should have status 409', () => {
            const error = new ConflictError('Duplicate entry');

            expect(error.statusCode).toBe(409);
            expect(error.code).toBe('CONFLICT');
        });

        it('should use default message', () => {
            const error = new ConflictError();

            expect(error.message).toBe('Conflict');
        });

        it('should accept details', () => {
            const error = new ConflictError('Duplicate', { field: 'email', value: 'test@test.com' });

            expect(error.details).toEqual({ field: 'email', value: 'test@test.com' });
        });
    });

    describe('ValidationError', () => {
        it('should have status 422', () => {
            const error = new ValidationError('Validation failed', [
                { field: 'email', message: 'Invalid email' },
            ]);

            expect(error.statusCode).toBe(422);
            expect(error.code).toBe('VALIDATION_ERROR');
        });

        it('should include errors array in details', () => {
            const errors = [
                { field: 'email', message: 'Invalid email' },
                { field: 'password', message: 'Too short' },
            ];
            const error = new ValidationError('Validation failed', errors);

            expect(error.details).toEqual({ errors });
        });

        it('should use default message', () => {
            const error = new ValidationError();

            expect(error.message).toBe('Validation failed');
        });

        it('should have empty errors array by default', () => {
            const error = new ValidationError();

            expect(error.details).toEqual({ errors: [] });
        });
    });

    describe('LockedError', () => {
        it('should have status 423', () => {
            const error = new LockedError('Period is closed');

            expect(error.statusCode).toBe(423);
            expect(error.code).toBe('LOCKED');
        });

        it('should use default message', () => {
            const error = new LockedError();

            expect(error.message).toBe('Resource is locked');
        });
    });

    describe('RateLimitError', () => {
        it('should have status 429', () => {
            const error = new RateLimitError('Too many requests', 60);

            expect(error.statusCode).toBe(429);
            expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
        });

        it('should include retryAfter in details', () => {
            const error = new RateLimitError('Slow down', 120);

            expect(error.details).toEqual({ retryAfter: 120 });
        });

        it('should use default retryAfter of 60', () => {
            const error = new RateLimitError();

            expect(error.details).toEqual({ retryAfter: 60 });
        });
    });

    describe('InternalError', () => {
        it('should have status 500', () => {
            const error = new InternalError('Database connection failed');

            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('INTERNAL_ERROR');
        });

        it('should not be operational', () => {
            const error = new InternalError('Unexpected error');

            expect(error.isOperational).toBe(false);
        });

        it('should use default message', () => {
            const error = new InternalError();

            expect(error.message).toBe('Internal server error');
        });
    });

    describe('ServiceUnavailableError', () => {
        it('should have status 503', () => {
            const error = new ServiceUnavailableError('Database is down');

            expect(error.statusCode).toBe(503);
            expect(error.code).toBe('SERVICE_UNAVAILABLE');
        });

        it('should use default message', () => {
            const error = new ServiceUnavailableError();

            expect(error.message).toBe('Service temporarily unavailable');
        });
    });
});

describe('asyncHandler', () => {
    it('should call the wrapped function', async () => {
        const mockFn = jest.fn().mockResolvedValue('success');
        const req = {};
        const res = {};
        const next = jest.fn();

        const handler = asyncHandler(mockFn);
        await handler(req, res, next);

        expect(mockFn).toHaveBeenCalledWith(req, res, next);
    });

    it('should forward errors to next', async () => {
        const error = new Error('Test error');
        const mockFn = jest.fn().mockRejectedValue(error);
        const req = {};
        const res = {};
        const next = jest.fn();

        const handler = asyncHandler(mockFn);
        await handler(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle async functions that throw', async () => {
        const error = new Error('Async error');
        const mockFn = jest.fn().mockImplementation(async () => {
            throw error;
        });
        const req = {};
        const res = {};
        const next = jest.fn();

        const handler = asyncHandler(mockFn);
        await handler(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});

describe('Error Inheritance', () => {
    it('all errors should be instances of AppError', () => {
        const errors = [
            new BadRequestError(),
            new UnauthorizedError(),
            new ForbiddenError(),
            new NotFoundError(),
            new ConflictError(),
            new ValidationError(),
            new LockedError(),
            new RateLimitError(),
            new InternalError(),
            new ServiceUnavailableError(),
        ];

        errors.forEach(error => {
            expect(error instanceof AppError).toBe(true);
            expect(error instanceof Error).toBe(true);
        });
    });

    it('all errors should have toJSON method', () => {
        const errors = [
            new BadRequestError(),
            new NotFoundError('User', '123'),
            new ValidationError('Invalid', [{ field: 'test', message: 'error' }]),
        ];

        errors.forEach(error => {
            expect(typeof error.toJSON).toBe('function');
            expect(error.toJSON()).toBeDefined();
        });
    });
});

describe('Vietnamese Error Messages', () => {
    it('should support Vietnamese messages', () => {
        const error = new NotFoundError('Chứng từ', 'PC-001');

        expect(error.message).toBe("Chứng từ with ID 'PC-001' not found");
    });

    it('should support Vietnamese validation errors', () => {
        const error = new ValidationError('Dữ liệu không hợp lệ', [
            { field: 'doc_date', message: 'Ngày chứng từ không được để trống' },
            { field: 'amount', message: 'Số tiền phải lớn hơn 0' },
        ]);

        expect(error.message).toBe('Dữ liệu không hợp lệ');
        expect(error.details.errors).toHaveLength(2);
    });
});
