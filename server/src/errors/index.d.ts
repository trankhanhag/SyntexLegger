/**
 * Type declarations for Custom Error Classes
 */

export class AppError extends Error {
    statusCode: number;
    code: string;
    details: any;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string, details?: any);
    toJSON(): { error: string; code: string; details?: any };
}

export class BadRequestError extends AppError {
    constructor(message?: string, details?: any);
}

export class UnauthorizedError extends AppError {
    constructor(message?: string, details?: any);
}

export class ForbiddenError extends AppError {
    constructor(message?: string, details?: any);
}

export class NotFoundError extends AppError {
    constructor(resource?: string, id?: string | null);
}

export class ConflictError extends AppError {
    constructor(message?: string, details?: any);
}

export class ValidationError extends AppError {
    constructor(message?: string, errors?: Array<{ field: string; message: string }>);
}

export class LockedError extends AppError {
    constructor(message?: string, details?: any);
}

export class RateLimitError extends AppError {
    constructor(message?: string, retryAfter?: number);
}

export class InternalError extends AppError {
    constructor(message?: string, details?: any);
}

export class ServiceUnavailableError extends AppError {
    constructor(message?: string, details?: any);
}

export function asyncHandler<T>(
    fn: (req: any, res: any, next: any) => Promise<T>
): (req: any, res: any, next: any) => void;
