/**
 * Custom Error Classes
 * SyntexLegger - Enterprise Accounting System
 */

/**
 * Base Application Error
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true; // Operational errors are expected errors
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: this.message,
            code: this.code,
            ...(this.details && { details: this.details }),
        };
    }
}

/**
 * 400 Bad Request - Invalid input or malformed request
 */
class BadRequestError extends AppError {
    constructor(message = 'Bad request', details = null) {
        super(message, 400, 'BAD_REQUEST', details);
    }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', details = null) {
        super(message, 401, 'UNAUTHORIZED', details);
    }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', details = null) {
        super(message, 403, 'FORBIDDEN', details);
    }
}

/**
 * 404 Not Found - Resource not found
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource', id = null) {
        const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
        super(message, 404, 'NOT_FOUND', { resource, id });
    }
}

/**
 * 409 Conflict - Resource conflict (e.g., duplicate entry)
 */
class ConflictError extends AppError {
    constructor(message = 'Conflict', details = null) {
        super(message, 409, 'CONFLICT', details);
    }
}

/**
 * 422 Unprocessable Entity - Validation errors
 */
class ValidationError extends AppError {
    constructor(message = 'Validation failed', errors = []) {
        super(message, 422, 'VALIDATION_ERROR', { errors });
    }
}

/**
 * 423 Locked - Resource is locked (e.g., accounting period)
 */
class LockedError extends AppError {
    constructor(message = 'Resource is locked', details = null) {
        super(message, 423, 'LOCKED', details);
    }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
class RateLimitError extends AppError {
    constructor(message = 'Too many requests', retryAfter = 60) {
        super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    }
}

/**
 * 500 Internal Server Error
 */
class InternalError extends AppError {
    constructor(message = 'Internal server error', details = null) {
        super(message, 500, 'INTERNAL_ERROR', details);
        this.isOperational = false; // Internal errors are unexpected
    }
}

/**
 * 503 Service Unavailable - Database or external service down
 */
class ServiceUnavailableError extends AppError {
    constructor(message = 'Service temporarily unavailable', details = null) {
        super(message, 503, 'SERVICE_UNAVAILABLE', details);
    }
}

/**
 * Async handler wrapper - catches async errors and forwards to error middleware
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
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
};
