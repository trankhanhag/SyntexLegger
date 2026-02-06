/**
 * Routes Index
 * Registers all API routes with the Express app
 */

import { Express } from 'express';
import voucherRoutes from './voucher.routes';
import masterRoutes from './master.routes';

/**
 * Register all routes with the Express app
 */
export function registerRoutes(app: Express): void {
  // API v1 routes
  app.use('/api/vouchers', voucherRoutes);
  app.use('/api', masterRoutes);

  // Note: Additional routes can be added here as they are migrated
  // app.use('/api/reports', reportRoutes);
  // app.use('/api/assets', assetRoutes);
  // app.use('/api/hr', hrRoutes);
  // app.use('/api/inventory', inventoryRoutes);
  // etc.
}

export { voucherRoutes, masterRoutes };
