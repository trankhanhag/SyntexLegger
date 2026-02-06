/**
 * Express Application Configuration
 * Sets up middleware and routes
 */

import express, { Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { registerRoutes } from './routes';
import { errorHandler, notFoundHandler, requestLogger } from './middleware';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:4173'];

  app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Body parsing middleware
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging (optional, enable in development)
  if (process.env.NODE_ENV !== 'production') {
    app.use(requestLogger);
  }

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // Register API routes
  registerRoutes(app);

  // 404 handler for unknown routes
  app.use('/api/*', notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

export default createApp;
