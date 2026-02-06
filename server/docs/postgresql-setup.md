# PostgreSQL Setup Guide for SyntexLegger

## Prerequisites

1. PostgreSQL 14+ installed
2. Node.js 18+ installed
3. npm or yarn package manager

## Quick Setup

### 1. Install PostgreSQL Driver

```bash
cd server
npm install pg
```

### 2. Create Database

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE syntex_legger;

-- Create user (optional, for production)
CREATE USER syntex_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE syntex_legger TO syntex_user;

-- Exit
\q
```

### 3. Configure Environment

Create `.env` file in `server/` directory:

```env
NODE_ENV=staging
DB_HOST=localhost
DB_PORT=5432
DB_NAME=syntex_legger
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secure-jwt-secret
```

### 4. Run Migrations

```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 5. Start Server

```bash
npm run start:ts
```

## Production Deployment

### Using Connection String

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/syntex_legger?sslmode=require
JWT_SECRET=your-production-jwt-secret
```

### SSL Configuration

For cloud databases (Heroku, AWS RDS, etc.):

```env
DB_SSL=true
```

To disable SSL (local development):

```env
DB_SSL=false
```

## Database Comparison

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Setup | Zero config | Requires server |
| Concurrency | Single write | High concurrency |
| Scale | Small-medium | Large scale |
| Backup | File copy | pg_dump |
| Best for | Development, Small teams | Production, Enterprise |

## Switching Between Databases

The application automatically uses the appropriate database based on `NODE_ENV`:

- `development` → SQLite (db_v2.sqlite)
- `staging` → PostgreSQL (local)
- `production` → PostgreSQL (cloud)
- `test` → SQLite (in-memory)

## Troubleshooting

### Connection Refused

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL (Windows)
net start postgresql-x64-14

# Start PostgreSQL (Linux/Mac)
sudo systemctl start postgresql
```

### Permission Denied

```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO syntex_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO syntex_user;
```

### SSL Certificate Error

```env
# Disable SSL verification (development only!)
DB_SSL=false
```

## Data Migration from SQLite to PostgreSQL

```bash
# 1. Export SQLite data to JSON
node scripts/export-sqlite.js

# 2. Import to PostgreSQL
NODE_ENV=staging node scripts/import-postgres.js
```

## Recommended PostgreSQL Extensions

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search (optional)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Performance Optimization

### Indexing

Key indexes are created automatically by the schema. For additional optimization:

```sql
-- Index for voucher date queries
CREATE INDEX idx_vouchers_doc_date ON vouchers(doc_date);

-- Index for partner transactions
CREATE INDEX idx_voucher_items_partner ON voucher_items(partner_code);
```

### Connection Pooling

Production configuration uses connection pooling by default:

```javascript
pool: {
  min: 2,   // Minimum connections
  max: 20,  // Maximum connections
}
```

## Backup and Restore

### Backup

```bash
pg_dump -U postgres syntex_legger > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
psql -U postgres syntex_legger < backup_20250131.sql
```
