/**
 * Knex.js Configuration
 * SyntexHCSN - Database Migration Setup
 * 
 * Supports:
 * - Development: SQLite (db_v2.sqlite)
 * - Production: PostgreSQL
 */

const path = require('path');

module.exports = {
    development: {
        client: 'better-sqlite3',
        connection: {
            filename: path.join(__dirname, 'db_v2.sqlite')
        },
        useNullAsDefault: true,
        migrations: {
            directory: path.join(__dirname, 'migrations'),
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: path.join(__dirname, 'seeds')
        }
    },

    staging: {
        client: 'postgresql',
        connection: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'syntex_hcsn_staging',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: path.join(__dirname, 'migrations'),
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: path.join(__dirname, 'seeds')
        }
    },

    production: {
        client: 'postgresql',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        },
        pool: {
            min: 2,
            max: 20
        },
        migrations: {
            directory: path.join(__dirname, 'migrations'),
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: path.join(__dirname, 'seeds')
        }
    }
};
