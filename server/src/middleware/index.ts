/**
 * Middleware Index
 * Re-exports all middleware for convenient importing
 */

// Authentication
export {
  verifyToken,
  requireRole,
  optionalAuth,
  generateToken,
  rateLimitLogin,
  recordFailedLogin,
  clearLoginAttempts
} from './auth.middleware';

// Validation
export {
  sanitizeBody,
  sanitizeQuery,
  validateVoucher,
  validateLogin,
  validateDateRange,
  validatePagination,
  validateAccountCode,
  validatePartnerCode,
  validateTaxCode
} from './validation.middleware';

// Error handling
export {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  errorHandler,
  requestLogger,
  asyncHandler,
  notFoundHandler
} from './error.middleware';
