/**
 * Database Schema Orchestrator
 * Initializes all database tables and seeds in the correct order
 *
 * Schema modules are executed in numerical order to ensure
 * proper foreign key dependencies
 */

import { Knex } from 'knex';

// Import all schema modules
import { createCoreAccountingSchema, seedCoreAccountingData } from './01-core-accounting.schema';
import { createVouchersSchema, seedVouchersData } from './02-vouchers.schema';
import { createHumanResourcesSchema, seedHumanResourcesData } from './03-human-resources.schema';
import { createFixedAssetsSchema, seedFixedAssetsData } from './04-fixed-assets.schema';
import { createInventorySchema, seedInventoryData } from './05-inventory.schema';
import { createReceivablesPayablesSchema, seedReceivablesPayablesData } from './06-receivables-payables.schema';
import { createBudgetManagementSchema, seedBudgetManagementData } from './07-budget-management.schema';
import { createAuditComplianceSchema, seedAuditComplianceData } from './08-audit-compliance.schema';
import { createCommercialSchema, seedCommercialData } from './09-commercial.schema';

/**
 * Create all database tables in the correct order
 * Tables are created with proper foreign key dependencies
 */
export async function createAllSchemas(knex: Knex): Promise<void> {
  console.log('Creating database schemas...');

  // 1. Core Accounting (companies, users, chart_of_accounts, partners, settings, roles, bank_accounts)
  console.log('  [1/9] Creating Core Accounting schema...');
  await createCoreAccountingSchema(knex);

  // 2. Vouchers (vouchers, voucher_items, general_ledger, staging_transactions, allocations)
  console.log('  [2/9] Creating Vouchers schema...');
  await createVouchersSchema(knex);

  // 3. Human Resources (employees, salary_grades, allowances, payroll, timekeeping)
  console.log('  [3/9] Creating Human Resources schema...');
  await createHumanResourcesSchema(knex);

  // 4. Fixed Assets (fixed_assets, ccdc_items, depreciation_log, movements)
  console.log('  [4/9] Creating Fixed Assets schema...');
  await createFixedAssetsSchema(knex);

  // 5. Inventory (materials, receipts, issues, transfers, products)
  console.log('  [5/9] Creating Inventory schema...');
  await createInventorySchema(knex);

  // 6. Receivables & Payables (receivables, payables, advances)
  console.log('  [6/9] Creating Receivables & Payables schema...');
  await createReceivablesPayablesSchema(knex);

  // 7. Budget Management (fund_sources, estimates, periods, transactions, categories)
  console.log('  [7/9] Creating Budget Management schema...');
  await createBudgetManagementSchema(knex);

  // 8. Audit & Compliance (audit_trail, sessions, anomalies, reconciliations, logs)
  console.log('  [8/9] Creating Audit & Compliance schema...');
  await createAuditComplianceSchema(knex);

  // 9. Commercial (contracts, projects, orders, invoices, dimensions, checklists)
  console.log('  [9/9] Creating Commercial schema...');
  await createCommercialSchema(knex);

  console.log('All schemas created successfully.');
}

/**
 * Seed all tables with initial data
 * Seeds are executed in the correct order to respect foreign key constraints
 */
export async function seedAllData(knex: Knex): Promise<void> {
  console.log('Seeding database with initial data...');

  // 1. Core Accounting (system_settings, roles, chart_of_accounts)
  console.log('  [1/9] Seeding Core Accounting data...');
  await seedCoreAccountingData(knex);

  // 2. Vouchers (no seed data - populated through operations)
  console.log('  [2/9] Seeding Vouchers data...');
  await seedVouchersData(knex);

  // 3. Human Resources (salary_grades)
  console.log('  [3/9] Seeding Human Resources data...');
  await seedHumanResourcesData(knex);

  // 4. Fixed Assets (no seed data - populated through operations)
  console.log('  [4/9] Seeding Fixed Assets data...');
  await seedFixedAssetsData(knex);

  // 5. Inventory (no seed data - populated through operations)
  console.log('  [5/9] Seeding Inventory data...');
  await seedInventoryData(knex);

  // 6. Receivables & Payables (no seed data - populated through operations)
  console.log('  [6/9] Seeding Receivables & Payables data...');
  await seedReceivablesPayablesData(knex);

  // 7. Budget Management (budget_periods, revenue/expense categories, approval rules)
  console.log('  [7/9] Seeding Budget Management data...');
  await seedBudgetManagementData(knex);

  // 8. Audit & Compliance (no seed data - populated through operations)
  console.log('  [8/9] Seeding Audit & Compliance data...');
  await seedAuditComplianceData(knex);

  // 9. Commercial (dimension_configs, dimensions, checklist_tasks)
  console.log('  [9/9] Seeding Commercial data...');
  await seedCommercialData(knex);

  console.log('All seed data inserted successfully.');
}

/**
 * Initialize database with all schemas and seed data
 * This is the main entry point for database setup
 */
export async function initializeDatabase(knex: Knex): Promise<void> {
  console.log('='.repeat(50));
  console.log('Initializing SyntexLegger Database');
  console.log('='.repeat(50));

  await createAllSchemas(knex);
  await seedAllData(knex);

  console.log('='.repeat(50));
  console.log('Database initialization complete.');
  console.log('='.repeat(50));
}

/**
 * Get list of all tables in the database
 * Supports both SQLite and PostgreSQL
 */
export async function getAllTables(knex: Knex): Promise<string[]> {
  const client = knex.client.config.client;

  if (client === 'better-sqlite3' || client === 'sqlite3') {
    // SQLite
    const result = await knex.raw(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knex_%' ORDER BY name"
    );
    return result.map((row: { name: string }) => row.name);
  } else if (client === 'postgresql' || client === 'pg') {
    // PostgreSQL
    const result = await knex.raw(
      "SELECT tablename AS name FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'knex_%' ORDER BY tablename"
    );
    return result.rows.map((row: { name: string }) => row.name);
  }

  throw new Error(`Unsupported database client: ${client}`);
}

/**
 * Drop all tables (use with caution - for testing/reset purposes only)
 * Supports both SQLite and PostgreSQL
 */
export async function dropAllTables(knex: Knex): Promise<void> {
  const client = knex.client.config.client;
  const tables = await getAllTables(knex);

  if (client === 'better-sqlite3' || client === 'sqlite3') {
    // SQLite - Disable foreign key checks
    await knex.raw('PRAGMA foreign_keys = OFF');

    for (const table of tables) {
      await knex.schema.dropTableIfExists(table);
    }

    // Re-enable foreign key checks
    await knex.raw('PRAGMA foreign_keys = ON');
  } else if (client === 'postgresql' || client === 'pg') {
    // PostgreSQL - Use CASCADE to handle foreign keys
    for (const table of tables) {
      await knex.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
  } else {
    throw new Error(`Unsupported database client: ${client}`);
  }
}

/**
 * Check database connection and return info
 */
export async function checkDatabaseConnection(knex: Knex): Promise<{
  connected: boolean;
  client: string;
  version: string;
}> {
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
      version,
    };
  } catch (error) {
    return {
      connected: false,
      client,
      version: 'unknown',
    };
  }
}

// Re-export individual schema creators for fine-grained control
export {
  createCoreAccountingSchema,
  seedCoreAccountingData,
  createVouchersSchema,
  seedVouchersData,
  createHumanResourcesSchema,
  seedHumanResourcesData,
  createFixedAssetsSchema,
  seedFixedAssetsData,
  createInventorySchema,
  seedInventoryData,
  createReceivablesPayablesSchema,
  seedReceivablesPayablesData,
  createBudgetManagementSchema,
  seedBudgetManagementData,
  createAuditComplianceSchema,
  seedAuditComplianceData,
  createCommercialSchema,
  seedCommercialData
};
