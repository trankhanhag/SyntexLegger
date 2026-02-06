/**
 * Validation Middleware
 * Input sanitization and request validation
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';

/**
 * Sanitize string to prevent XSS
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize request body
 */
export function sanitizeBody(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Sanitize query parameters
 */
export function sanitizeQuery(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
}

/**
 * Validate voucher request
 */
export function validateVoucher(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const { doc_date, post_date, type, items } = req.body;

  const errors: Record<string, string> = {};

  // Required fields
  if (!doc_date) {
    errors.doc_date = 'Document date is required';
  }

  if (!post_date) {
    errors.post_date = 'Post date is required';
  }

  if (!type) {
    errors.type = 'Voucher type is required';
  }

  // Validate items
  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.items = 'At least one line item is required';
  } else {
    items.forEach((item: any, index: number) => {
      if (!item.amount || item.amount <= 0) {
        errors[`items[${index}].amount`] = 'Amount must be greater than 0';
      }
      if (!item.debit_acc && !item.credit_acc) {
        errors[`items[${index}].accounts`] = 'Either debit or credit account is required';
      }
    });
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
}

/**
 * Validate login request
 */
export function validateLogin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const { username, password } = req.body;

  if (!username || typeof username !== 'string' || username.length < 3) {
    res.status(400).json({
      success: false,
      error: 'Username must be at least 3 characters'
    });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 4) {
    res.status(400).json({
      success: false,
      error: 'Password must be at least 4 characters'
    });
    return;
  }

  next();
}

/**
 * Validate date range parameters
 */
export function validateDateRange(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const { fromDate, toDate } = req.query;

  if (fromDate && toDate) {
    const from = new Date(fromDate as string);
    const to = new Date(toDate as string);

    if (isNaN(from.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid fromDate format'
      });
      return;
    }

    if (isNaN(to.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid toDate format'
      });
      return;
    }

    if (from > to) {
      res.status(400).json({
        success: false,
        error: 'fromDate cannot be after toDate'
      });
      return;
    }
  }

  next();
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const { page, pageSize } = req.query;

  if (page) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      res.status(400).json({
        success: false,
        error: 'Page must be a positive integer'
      });
      return;
    }
    req.query.page = String(pageNum);
  }

  if (pageSize) {
    const size = parseInt(pageSize as string, 10);
    if (isNaN(size) || size < 1 || size > 100) {
      res.status(400).json({
        success: false,
        error: 'Page size must be between 1 and 100'
      });
      return;
    }
    req.query.pageSize = String(size);
  }

  next();
}

/**
 * Validate account code format
 */
export function validateAccountCode(code: string): boolean {
  // Vietnamese account codes are typically 3-6 digits
  return /^\d{3,6}$/.test(code);
}

/**
 * Validate partner code format
 */
export function validatePartnerCode(code: string): boolean {
  // Alphanumeric, 3-20 characters
  return /^[A-Za-z0-9_-]{3,20}$/.test(code);
}

/**
 * Validate Vietnamese tax code
 */
export function validateTaxCode(taxCode: string): boolean {
  // Vietnamese tax code: 10 or 13 digits
  return /^\d{10}(-\d{3})?$/.test(taxCode);
}
