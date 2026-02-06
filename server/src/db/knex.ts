/**
 * Knex Database Instance
 * Provides a typed Knex instance for database operations
 */

import Knex from 'knex';
import path from 'path';

// Environment detection
const environment = process.env.NODE_ENV || 'development';

// Knex configuration
const config: Record<string, Knex.Knex.Config> = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: path.join(__dirname, '../../db_v2.sqlite')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn: any, done: Function) => {
        // Enable foreign keys for SQLite
        conn.run('PRAGMA foreign_keys = ON', done);
      }
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'syntex_legger_staging',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 20
    }
  }
};

// Create and export the Knex instance
const knex = Knex(config[environment]);

export default knex;

// Export for use in transactions
export { Knex };

// Utility function to check database connection
export async function checkConnection(): Promise<boolean> {
  try {
    await knex.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  await knex.destroy();
}
