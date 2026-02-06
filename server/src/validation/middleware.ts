/**
 * Zod Validation Middleware
 * SyntexLegger - Enterprise Accounting System
 *
 * Express middleware for validating requests using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors';

/**
 * Validate request body
 */
export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError('Dữ liệu không hợp lệ', errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request query parameters
 */
export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError('Query parameters không hợp lệ', errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request URL parameters
 */
export const validateParams = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError('URL parameters không hợp lệ', errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Combined validation for body, query, and params
 */
export const validate = <B = unknown, Q = unknown, P = unknown>(options: {
  body?: ZodSchema<B>;
  query?: ZodSchema<Q>;
  params?: ZodSchema<P>;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: { field: string; message: string }[] = [];

    // Validate params
    if (options.params) {
      try {
        req.params = options.params.parse(req.params) as typeof req.params;
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...error.errors.map((e) => ({
            field: `params.${e.path.join('.')}`,
            message: e.message,
          })));
        }
      }
    }

    // Validate query
    if (options.query) {
      try {
        req.query = options.query.parse(req.query) as typeof req.query;
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...error.errors.map((e) => ({
            field: `query.${e.path.join('.')}`,
            message: e.message,
          })));
        }
      }
    }

    // Validate body
    if (options.body) {
      try {
        req.body = options.body.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })));
        }
      }
    }

    if (errors.length > 0) {
      next(new ValidationError('Dữ liệu không hợp lệ', errors));
    } else {
      next();
    }
  };
};
