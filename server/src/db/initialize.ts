/**
 * Database Initialization Module
 *
 * This module provides functions to initialize the database using
 * the modular schema definitions. It replaces the monolithic database.js
 * with a cleaner, more maintainable approach.
 *
 * Usage:
 *   import { initializeDatabaseWithSchema } from './src/db/initialize';
 *   await initializeDatabaseWithSchema();
 */

import knex from './knex';
import { initializeDatabase, createAllSchemas, seedAllData, getAllTables, checkDatabaseConnection } from './schema';

/**
 * Initialize the database with all schemas and seed data
 * This is the main entry point for database setup
 */
export async function initializeDatabaseWithSchema(): Promise<{
  success: boolean;
  client: string;
  tables: number;
  error?: string;
}> {
  try {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  SyntexLegger Database Initialization            ║');
    console.log('║  Enterprise Accounting - TT 99/2025              ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    // Check database connection
    const connectionInfo = await checkDatabaseConnection(knex);
    if (!connectionInfo.connected) {
      throw new Error(`Failed to connect to database: ${connectionInfo.client}`);
    }
    console.log(`✓ Connected to ${connectionInfo.client} (${connectionInfo.version})`);

    // Initialize database (creates schemas and seeds data)
    await initializeDatabase(knex);

    // Get table count for verification
    const tables = await getAllTables(knex);
    console.log(`✓ Database initialized with ${tables.length} tables`);
    console.log('');

    return {
      success: true,
      client: connectionInfo.client,
      tables: tables.length
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('✗ Database initialization failed:', errorMessage);
    return {
      success: false,
      client: 'unknown',
      tables: 0,
      error: errorMessage
    };
  }
}

/**
 * Check if database tables exist (for determining if initialization is needed)
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const tables = await getAllTables(knex);
    // Check for core tables that should always exist
    const coreTables = ['users', 'companies', 'chart_of_accounts', 'vouchers'];
    const hasCoreTables = coreTables.every(table => tables.includes(table));
    return hasCoreTables;
  } catch {
    return false;
  }
}

/**
 * Reset and reinitialize database (DANGER: destroys all data)
 * Only use in development/testing
 */
export async function resetDatabase(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot reset database in production environment');
  }

  console.log('⚠ Resetting database...');

  // Import dropAllTables dynamically to avoid issues
  const { dropAllTables } = await import('./schema');
  await dropAllTables(knex);

  // Reinitialize
  await initializeDatabaseWithSchema();
}

/**
 * Run only schema creation (no seeding)
 * Useful for migrations
 */
export async function createSchemaOnly(): Promise<void> {
  await createAllSchemas(knex);
}

/**
 * Run only seed data (assumes schema exists)
 * Useful for refreshing seed data
 */
export async function seedDataOnly(): Promise<void> {
  await seedAllData(knex);
}

/**
 * Get database status information
 */
export async function getDatabaseStatus(): Promise<{
  initialized: boolean;
  connected: boolean;
  client: string;
  version: string;
  tableCount: number;
  tables: string[];
}> {
  const connectionInfo = await checkDatabaseConnection(knex);
  const tables = connectionInfo.connected ? await getAllTables(knex) : [];

  return {
    initialized: await isDatabaseInitialized(),
    connected: connectionInfo.connected,
    client: connectionInfo.client,
    version: connectionInfo.version,
    tableCount: tables.length,
    tables
  };
}

// Export knex instance for direct access if needed
export { knex };

// Default export for CommonJS compatibility
export default {
  initializeDatabaseWithSchema,
  isDatabaseInitialized,
  resetDatabase,
  createSchemaOnly,
  seedDataOnly,
  getDatabaseStatus,
  knex
};
