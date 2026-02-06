# SyntexLegger Architecture

## Overview

SyntexLegger is an enterprise accounting system built for Vietnamese businesses following **Thông tư 99/2025/TT-BTC** (Enterprise Accounting Standards).

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  React 19 + TypeScript + Vite                                   │
│  ├── Components (68 modules)                                    │
│  ├── Zustand Stores (8 stores)                                  │
│  ├── API Services                                               │
│  └── Tailwind CSS + Material Symbols                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  Express.js 5.x                                                 │
│  ├── Routes (25 route files)                                    │
│  ├── Middleware (auth, validation, audit)                       │
│  ├── Services (voucher, account, report, budget)                │
│  └── Error Handling                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│  Knex.js Query Builder                                          │
│  ├── Repositories (account, partner, voucher)                   │
│  ├── Migrations (11 migration files)                            │
│  └── Database: SQLite (dev) / PostgreSQL (prod)                 │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
SyntexLegger/
├── app/                          # Frontend React application
│   ├── src/
│   │   ├── components/           # React components (68 files)
│   │   │   ├── *Module.tsx       # Main module components
│   │   │   ├── *View.tsx         # View components
│   │   │   └── SmartTable.tsx    # Reusable data table
│   │   ├── stores/               # Zustand state stores
│   │   ├── hooks/                # Custom React hooks
│   │   └── api.ts                # API service layer
│   └── package.json
│
├── server/                       # Backend Node.js application
│   ├── routes/                   # Express route handlers (25 files)
│   ├── middleware/               # Express middleware
│   ├── services/                 # Business logic services
│   ├── src/                      # TypeScript source
│   │   ├── db/
│   │   │   ├── repositories/     # Data access layer
│   │   │   └── schema/           # Database schemas
│   │   ├── services/             # TypeScript services
│   │   ├── types/                # TypeScript type definitions
│   │   └── validation/           # Zod validation schemas
│   ├── migrations/               # Knex migrations
│   ├── __tests__/                # Jest test files
│   └── package.json
│
└── docs/                         # Documentation
```

## Core Modules

### 1. Accounting Core
- **Voucher Management**: Create, edit, post, void vouchers
- **General Ledger**: Double-entry bookkeeping
- **Chart of Accounts**: TT 99/2025 compliant account structure
- **Trial Balance**: Automated balance verification

### 2. Master Data
- **Partners**: Customers, suppliers, employees
- **Products**: Inventory items with cost tracking
- **Departments**: Cost centers and profit centers
- **Projects**: Project-based accounting

### 3. Financial Reporting
- **Trial Balance** (Bảng cân đối số phát sinh)
- **Balance Sheet** (Bảng cân đối kế toán)
- **Income Statement** (Báo cáo kết quả kinh doanh)
- **Cash Flow Statement** (Báo cáo lưu chuyển tiền tệ)
- **General Ledger** (Sổ cái)

### 4. Specialized Modules
- **Fixed Assets**: Depreciation calculations
- **Inventory**: Stock management, costing
- **HR & Payroll**: Employee management, salary
- **Budget Control**: Budget planning and monitoring
- **E-Invoice**: Vietnam e-invoice integration

## Database Schema

### Core Tables

```sql
-- Chart of Accounts
chart_of_accounts (
    account_code PRIMARY KEY,
    account_name,
    category,          -- TÀI SẢN, NỢ PHẢI TRẢ, VỐN CHỦ SỞ HỮU, etc.
    parent_code,
    is_detail,
    is_active
)

-- Vouchers
vouchers (
    id PRIMARY KEY,
    doc_no,
    doc_date,
    post_date,
    description,
    type,              -- GENERAL, CASH_IN, CASH_OUT, BANK_IN, etc.
    status,            -- DRAFT, POSTED, VOIDED
    total_amount,
    created_at,
    created_by
)

-- Voucher Items (double-entry lines)
voucher_items (
    id PRIMARY KEY,
    voucher_id,
    debit_acc,
    credit_acc,
    amount,
    partner_code,
    project_code
)

-- General Ledger
general_ledger (
    id PRIMARY KEY,
    trx_date,
    posted_at,
    doc_no,
    account_code,
    reciprocal_acc,
    debit_amount,
    credit_amount,
    voucher_id
)
```

## Service Layer Architecture

```typescript
// Service Pattern
class VoucherService {
    private repository: VoucherRepository;

    // Business operations
    async createVoucher(dto: CreateVoucherDTO): Promise<VoucherWithItems>
    async postVoucher(id: string): Promise<PostVoucherResult>
    async voidVoucher(id: string, reason: string): Promise<void>

    // Business logic
    checkVoucherBalance(items: VoucherItem[]): VoucherBalanceResult
    validateVoucherData(dto: CreateVoucherDTO): void
}

// Repository Pattern
class VoucherRepository extends BaseRepository<Voucher> {
    async findWithFilters(filters, pagination): Promise<PaginatedResult>
    async findByIdWithItems(id): Promise<VoucherWithItems>
    async createWithItems(data, items): Promise<VoucherWithItems>
}
```

## API Design

### RESTful Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/vouchers | List vouchers with filters |
| GET | /api/vouchers/:id | Get voucher with items |
| POST | /api/vouchers | Create/update voucher |
| DELETE | /api/vouchers/:id | Delete voucher |
| POST | /api/vouchers/:id/post | Post to general ledger |
| POST | /api/vouchers/:id/void | Void posted voucher |

### Authentication

- JWT-based authentication
- Role-based access control (admin, accountant, viewer)
- Session management with rate limiting

## Vietnamese Accounting Standards

### Account Code Structure (TT 99/2025)

| Prefix | Category | Nature |
|--------|----------|--------|
| 1xx | Tài sản ngắn hạn | Debit |
| 2xx | Tài sản dài hạn | Debit |
| 3xx | Nợ phải trả | Credit |
| 4xx | Vốn chủ sở hữu | Credit |
| 5xx | Doanh thu | Credit |
| 6xx | Chi phí | Debit |
| 7xx | Thu nhập khác | Credit |
| 8xx | Chi phí khác | Debit |
| 0xx | Ngoại bảng | Both |

### Double-Entry Bookkeeping

Every transaction must satisfy:
```
Sum(Debit) = Sum(Credit)
```

Off-balance sheet accounts (0xx) are excluded from this equation.

## Security

### Authentication Flow
1. Login with username/password
2. Server validates and returns JWT token
3. Client stores token and includes in Authorization header
4. Server verifies token on each request

### Authorization Levels
- **Admin**: Full access to all modules
- **Accountant**: Create/edit vouchers, run reports
- **Viewer**: Read-only access

### Data Protection
- Password hashing with bcrypt
- SQL injection prevention via parameterized queries
- XSS protection via input sanitization
- CORS configuration

## Deployment

### Development
```bash
# Backend
cd server && npm run dev

# Frontend
cd app && npm run dev
```

### Production
```bash
# Build frontend
cd app && npm run build

# Start server
cd server && npm start
```

### Environment Variables
```env
# Server
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production

# Frontend
VITE_API_URL=http://localhost:3000/api
```

## Testing

### Test Structure
```
__tests__/
├── unit/
│   ├── services/           # Service tests
│   ├── repositories/       # Repository logic tests
│   └── validation/         # Schema validation tests
├── integration/
│   └── accounting-flows.test.ts
└── *.test.js               # API endpoint tests
```

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
npm test -- voucher.test    # Specific test file
```

## Performance Considerations

1. **Database Indexing**: Indexes on frequently queried columns
2. **Pagination**: All list endpoints support pagination
3. **Lazy Loading**: Frontend loads modules on demand
4. **Caching**: Consider Redis for session and query caching

## Future Improvements

1. **TypeScript Migration**: Complete migration of routes to TypeScript
2. **Database Refactoring**: Split database.js into modules
3. **Code Splitting**: Implement lazy loading for frontend modules
4. **API Documentation**: OpenAPI/Swagger specification
5. **E2E Testing**: Add Playwright/Cypress tests
