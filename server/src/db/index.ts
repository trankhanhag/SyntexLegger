/**
 * Database Module Index
 * Re-exports database utilities, repositories, and initialization functions
 *
 * This module provides a clean API for database operations:
 * - Knex instance for direct queries
 * - Repository classes for structured data access
 * - Schema definitions for table creation
 * - Initialization functions for database setup
 */

// Knex instance
export { default as knex, Knex, checkConnection, closeConnection } from './knex';

// Repositories
export * from './repositories';

// Schema management
export * from './schema';

// Database initialization
export {
  initializeDatabaseWithSchema,
  isDatabaseInitialized,
  resetDatabase,
  createSchemaOnly,
  seedDataOnly,
  getDatabaseStatus
} from './initialize';
