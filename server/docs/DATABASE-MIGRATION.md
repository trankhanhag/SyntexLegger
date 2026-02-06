# Database Migration Guide

## Overview

SyntexLegger đã được refactor từ monolithic `database.js` (2,970+ dòng) sang hệ thống schema modules để dễ maintain và mở rộng.

## Cấu trúc mới

```
server/src/db/
├── knex.ts                 # Knex instance và connection
├── index.ts                # Main exports
├── initialize.ts           # Database initialization
├── initialize.cjs.js       # CommonJS wrapper
├── schema/
│   ├── index.ts                      # Schema orchestrator
│   ├── 01-core-accounting.schema.ts  # Companies, users, accounts, partners
│   ├── 02-vouchers.schema.ts         # Vouchers, GL, staging
│   ├── 03-human-resources.schema.ts  # Employees, payroll, timekeeping
│   ├── 04-fixed-assets.schema.ts     # Assets, depreciation, CCDC
│   ├── 05-inventory.schema.ts        # Materials, stock, cards
│   ├── 06-receivables-payables.ts    # AR/AP, advances
│   ├── 07-budget-management.schema.ts # Budgets, allocations, periods
│   ├── 08-audit-compliance.schema.ts # Audit trail, logs, reconciliation
│   └── 09-commercial.schema.ts       # Contracts, projects, sales/purchase
└── repositories/
    ├── base.repository.ts
    ├── account.repository.ts
    ├── partner.repository.ts
    └── voucher.repository.ts
```

## Modules

### 1. Core Accounting (01)
- `companies` - Thông tin doanh nghiệp
- `users` - Người dùng hệ thống
- `roles` - Phân quyền RBAC
- `chart_of_accounts` - Hệ thống tài khoản TT 99/2025
- `partners` - Khách hàng, nhà cung cấp
- `system_settings` - Cấu hình hệ thống
- `bank_accounts` - Tài khoản ngân hàng

### 2. Vouchers (02)
- `vouchers` - Header chứng từ
- `voucher_items` - Chi tiết chứng từ
- `general_ledger` - Sổ cái
- `staging_transactions` - Giao dịch tạm
- `allocations` - Phân bổ thanh toán

### 3. Human Resources (03)
- `employees` - Nhân viên
- `salary_grades` - Ngạch/bậc lương
- `allowance_types` - Loại phụ cấp
- `employee_allowances` - Phụ cấp nhân viên
- `payroll_periods` - Kỳ lương
- `payroll_details` - Chi tiết bảng lương
- `employee_contracts` - Hợp đồng lao động
- `salary_history` - Lịch sử lương
- `timekeeping` - Chấm công
- `bhxh_authority_data` - Dữ liệu BHXH

### 4. Fixed Assets (04)
- `fixed_assets` - Tài sản cố định
- `infrastructure_assets` - Cơ sở hạ tầng
- `ccdc_items` - Công cụ dụng cụ
- `asset_depreciation_log` - Nhật ký khấu hao
- `asset_cards` - Thẻ tài sản
- `asset_inventory` - Kiểm kê tài sản
- `asset_movements` - Di chuyển tài sản
- `allocation_history` - Lịch sử phân bổ
- `off_balance_tracking` - Theo dõi ngoại bảng
- `long_term_investments` - Đầu tư dài hạn

### 5. Inventory (05)
- `materials` - Vật tư
- `material_receipts` - Phiếu nhập kho
- `material_issues` - Phiếu xuất kho
- `material_transfers` - Phiếu chuyển kho
- `inventory_cards` - Thẻ kho
- `products` - Sản phẩm

### 6. Receivables & Payables (06)
- `receivables` - Công nợ phải thu
- `payables` - Công nợ phải trả
- `receivable_payments` - Thanh toán phải thu
- `payable_payments` - Thanh toán phải trả
- `temporary_advances` - Tạm ứng
- `budget_advances` - Ứng ngân sách

### 7. Budget Management (07)
- `fund_sources` - Nguồn vốn
- `budget_estimates` - Dự toán ngân sách
- `budget_allocations` - Phân bổ ngân sách
- `budget_transactions` - Giao dịch ngân sách
- `budget_periods` - Kỳ ngân sách
- `budget_authorizations` - Phê duyệt chi
- `budget_alerts` - Cảnh báo ngân sách
- `approval_workflow_rules` - Quy tắc phê duyệt
- `revenue_categories` - Danh mục thu
- `expense_categories` - Danh mục chi

### 8. Audit & Compliance (08)
- `audit_trail` - Nhật ký thao tác
- `audit_sessions` - Phiên đăng nhập
- `audit_anomalies` - Phát hiện bất thường
- `reconciliation_records` - Đối chiếu
- `system_logs` - Log hệ thống
- `xml_export_logs` - Log xuất XML

### 9. Commercial (09)
- `contracts` - Hợp đồng
- `contract_appendices` - Phụ lục hợp đồng
- `projects` - Dự án
- `project_tasks` - Công việc dự án
- `project_budget_lines` - Ngân sách dự án
- `sales_orders` - Đơn hàng bán
- `sales_invoices` - Hóa đơn bán
- `purchase_orders` - Đơn mua hàng
- `purchase_invoices` - Hóa đơn mua
- `loan_contracts` - Hợp đồng vay
- `debt_notes` - Khế ước nợ
- `dimensions` - Chiều phân tích
- `dimension_configs` - Cấu hình chiều
- `dimension_groups` - Nhóm chiều
- `checklist_tasks` - Công việc kiểm tra

## Cách sử dụng

### TypeScript
```typescript
import { initializeDatabaseWithSchema, knex } from './src/db';

// Khởi tạo database
const result = await initializeDatabaseWithSchema();
if (result.success) {
  console.log(`Database ready with ${result.tables} tables`);
}

// Sử dụng knex trực tiếp
const users = await knex('users').select('*');
```

### JavaScript (CommonJS)
```javascript
const { initializeDatabaseWithSchema, knex } = require('./src/db/initialize.cjs');

// Khởi tạo database
const result = await initializeDatabaseWithSchema();
```

### Với Knex Migrations
```bash
# Chạy migrations
npx knex migrate:latest

# Tạo migration mới
npx knex migrate:make add_new_table

# Rollback
npx knex migrate:rollback
```

## Chuyển đổi từ database.js

### Trước (database.js)
```javascript
const db = require('./database');

// Callback-based API
db.all('SELECT * FROM users', (err, rows) => {
  if (err) console.error(err);
  console.log(rows);
});
```

### Sau (Knex)
```javascript
const knex = require('./knex_db');

// Promise-based API
const rows = await knex('users').select('*');
console.log(rows);
```

## Lợi ích

1. **Modular**: Dễ tìm và sửa đổi schema theo domain
2. **Type-safe**: TypeScript support đầy đủ
3. **Migrations**: Version control cho database changes
4. **Testable**: Dễ dàng mock và test
5. **Multi-database**: Hỗ trợ SQLite (dev) và PostgreSQL (prod)
6. **Maintainable**: Mỗi module < 200 dòng thay vì 3000+ dòng

## Notes

- `database.js` vẫn được giữ để backward compatibility
- Dần dần chuyển các routes sang sử dụng Knex
- Không xóa `database.js` cho đến khi tất cả routes đã migrate
