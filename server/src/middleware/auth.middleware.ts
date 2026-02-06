/**
 * Authentication Middleware
 * JWT token verification and user authentication
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthenticatedUser } from '../types/api.types';

const SECRET_KEY = process.env.JWT_SECRET || 'syntex-legger-secret-key-2025';

/**
 * Verify JWT token and attach user to request
 */
export function verifyToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token.'
    });
  }
}

/**
 * Check if user has required role
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions.'
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET_KEY) as AuthenticatedUser;
      req.user = decoded;
    } catch {
      // Token invalid, continue without user
    }
  }

  next();
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: {
  id: number;
  username: string;
  role: string;
  company_id?: string;
}): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      company_id: user.company_id
    },
    SECRET_KEY,
    { expiresIn: '24h' }
  );
}

/**
 * Rate limiting map for login attempts
 */
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

/**
 * Rate limit login attempts
 */
export function rateLimitLogin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const attempts = loginAttempts.get(ip);

  if (attempts) {
    // Reset if window expired
    if (now - attempts.lastAttempt > windowMs) {
      loginAttempts.delete(ip);
    } else if (attempts.count >= maxAttempts) {
      res.status(429).json({
        success: false,
        error: 'Too many login attempts. Please try again later.'
      });
      return;
    }
  }

  next();
}

/**
 * Record failed login attempt
 */
export function recordFailedLogin(ip: string): void {
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: Date.now() };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(ip, attempts);
}

/**
 * Clear login attempts on successful login
 */
export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}
