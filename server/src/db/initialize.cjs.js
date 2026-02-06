/**
 * Database Initialization - CommonJS Wrapper
 *
 * This module provides a CommonJS-compatible interface to the database
 * initialization functions. Use this in JavaScript files that need to
 * initialize the database.
 *
 * Usage:
 *   const { initializeDatabaseWithSchema } = require('./src/db/initialize.cjs');
 *   await initializeDatabaseWithSchema();
 */

const knex = require('../../knex_db');

// Import schema functions - these need to be available as compiled JS
// For now, we'll implement inline versions that work with the existing setup

/**
 * Check if a table exists
 */
async function tableExists(tableName) {
  try {
    const client = knex.client.config.client;
    if (client === 'better-sqlite3' || client === 'sqlite3') {
      const result = await knex.raw(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );
      return result.length > 0;
    } else {
      const result = await knex.raw(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = ?)`,
        [tableName]
      );
      return result.rows[0].exists;
    }
  } catch (err) {
    return false;
  }
}

/**
 * Get all tables in the database
 */
async function getAllTables() {
  const client = knex.client.config.client;

  if (client === 'better-sqlite3' || client === 'sqlite3') {
    const result = await knex.raw(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knex_%' ORDER BY name"
    );
    return result.map(row => row.name);
  } else if (client === 'postgresql' || client === 'pg') {
    const result = await knex.raw(
      "SELECT tablename AS name FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'knex_%' ORDER BY tablename"
    );
    return result.rows.map(row => row.name);
  }

  return [];
}

/**
 * Check database connection
 */
async function checkDatabaseConnection() {
  const client = knex.client.config.client;

  try {
    let version = '';

    if (client === 'better-sqlite3' || client === 'sqlite3') {
      const result = await knex.raw('SELECT sqlite_version() as version');
      version = result[0]?.version || 'unknown';
    } else if (client === 'postgresql' || client === 'pg') {
      const result = await knex.raw('SELECT version()');
      version = result.rows[0]?.version || 'unknown';
    }

    return {
      connected: true,
      client,
      version
    };
  } catch (error) {
    return {
      connected: false,
      client,
      version: 'unknown'
    };
  }
}

/**
 * Check if database is initialized (has core tables)
 */
async function isDatabaseInitialized() {
  try {
    const coreTables = ['users', 'companies', 'chart_of_accounts', 'vouchers'];
    for (const table of coreTables) {
      if (!(await tableExists(table))) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize database with Knex migrations
 * This runs any pending migrations to ensure schema is up to date
 */
async function initializeDatabaseWithSchema() {
  try {
    console.log('');
    console.log('==================================================');
    console.log('  SyntexLegger Database Initialization');
    console.log('  Enterprise Accounting - TT 99/2025');
    console.log('==================================================');
    console.log('');

    // Check database connection
    const connectionInfo = await checkDatabaseConnection();
    if (!connectionInfo.connected) {
      throw new Error(`Failed to connect to database: ${connectionInfo.client}`);
    }
    console.log(`[OK] Connected to ${connectionInfo.client} (${connectionInfo.version})`);

    // Run migrations
    console.log('[..] Running database migrations...');
    const [batchNo, migrations] = await knex.migrate.latest();
    if (migrations.length > 0) {
      console.log(`[OK] Ran ${migrations.length} migrations (batch ${batchNo})`);
      migrations.forEach(m => console.log(`     - ${m}`));
    } else {
      console.log('[OK] Database schema is up to date');
    }

    // Get table count
    const tables = await getAllTables();
    console.log(`[OK] Database has ${tables.length} tables`);
    console.log('');

    return {
      success: true,
      client: connectionInfo.client,
      tables: tables.length
    };
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    console.error('[ERROR] Database initialization failed:', errorMessage);
    return {
      success: false,
      client: 'unknown',
      tables: 0,
      error: errorMessage
    };
  }
}

/**
 * Get database status information
 */
async function getDatabaseStatus() {
  const connectionInfo = await checkDatabaseConnection();
  const tables = connectionInfo.connected ? await getAllTables() : [];

  return {
    initialized: await isDatabaseInitialized(),
    connected: connectionInfo.connected,
    client: connectionInfo.client,
    version: connectionInfo.version,
    tableCount: tables.length,
    tables
  };
}

module.exports = {
  initializeDatabaseWithSchema,
  isDatabaseInitialized,
  getDatabaseStatus,
  checkDatabaseConnection,
  getAllTables,
  knex
};
