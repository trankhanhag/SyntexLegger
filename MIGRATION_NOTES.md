# Migration Notes: HCSN (TT 24/2024) → DN (TT 99/2025)

## Bối cảnh

SyntexLegger ban đầu được thiết kế cho kế toán HCSN (Hành chính Sự nghiệp) theo TT 24/2024/TT-BTC. Kể từ phiên bản 1.0.0, hệ thống đã được chuyển đổi sang Kế toán Doanh nghiệp (DN) theo TT 99/2025/TT-BTC.

## Thay đổi chính

### Hệ thống tài khoản
| Trước (TT24) | Sau (TT99) |
|--------------|------------|
| 164 tài khoản HCSN | 425+ tài khoản DN |
| Column `tt24_class` | Column `tt99_class` |
| `CIRCULAR_24_2024` | `CIRCULAR_99_2025` |

### Tính năng đã loại bỏ (HCSN-specific)
Các tính năng HCSN-only đã được deprecated và chuyển vào `server/legacy/`:
- Tích hợp Kho bạc (Treasury integration)
- Kiểm soát và cam kết ngân sách (Budget control)
- Theo dõi nguồn kinh phí (Fund source tracking)
- Xử lý tài khoản ngoại bảng đặc biệt

### Thay đổi API

| Endpoint cũ (Deprecated) | Endpoint mới | Sunset Date |
|--------------------------|--------------|-------------|
| `GET /api/hcsn/materials` | `GET /api/inventory/materials` | 2026-06-01 |
| `POST /api/hcsn/materials` | `POST /api/inventory/materials` | 2026-06-01 |
| `PUT /api/hcsn/materials/:id` | `PUT /api/inventory/materials/:id` | 2026-06-01 |
| `DELETE /api/hcsn/materials/:id` | `DELETE /api/inventory/materials/:id` | 2026-06-01 |
| `POST /api/hcsn/materials/import` | `POST /api/inventory/materials/import` | 2026-06-01 |

**Lưu ý:** Endpoint cũ vẫn hoạt động nhưng trả về deprecation headers:
- `Deprecation: true`
- `Sunset: Sat, 01 Jun 2026 00:00:00 GMT`
- `Link: </api/inventory/materials>; rel="successor-version"`

## Migration Files

Việc chuyển đổi được xử lý bởi:
- `server/migrations/20260129000000_convert_to_enterprise.js`

Migration này:
1. Đổi tên column `tt24_class` → `tt99_class`
2. Xóa các bảng HCSN-specific (treasury_imports, budget_commitments, v.v.)
3. Cập nhật system_settings sang `accounting_standard: TT 99/2025`

## Vị trí Legacy Code

Tất cả code HCSN-specific đã được chuyển vào `server/legacy/`:

```
server/legacy/
├── hcsn_tt24_accounts.js          # Hệ thống tài khoản HCSN
├── hcsn_reports_apis.js           # API báo cáo HCSN
├── sync_hcsn_accounts.js          # Đồng bộ tài khoản HCSN
├── migrate_contracts_projects_hcsn.js  # Migration HCSN
├── treasury.service.js            # Tích hợp Kho bạc
├── budget-control.routes.js       # Kiểm soát ngân sách
├── off_balance_apis.js            # Xử lý ngoại bảng
├── check_budget_tables.js         # Kiểm tra bảng ngân sách
└── list_budget_tables.js          # Liệt kê bảng ngân sách
```

## Lịch trình Sunset

| Component | Sunset Date | Action |
|-----------|-------------|--------|
| `/api/hcsn/*` routes | 2026-06-01 | Xóa khỏi `inventory.routes.js` |
| `server/legacy/` folder | 2026-06-01 | Archive và xóa |

## Quy trình Rollback

Nếu cần rollback về HCSN (không khuyến nghị):

```bash
# 1. Rollback migration
npx knex migrate:down 20260129000000_convert_to_enterprise.js

# 2. Cập nhật seeds/01_accounts.js để dùng legacy/hcsn_tt24_accounts.js

# 3. Cập nhật seeds/02_default_data.js để dùng CIRCULAR_24_2024

# 4. Re-seed database
npx knex seed:run
```

## Verification Checklist

Sau migration, kiểm tra:

```bash
# 1. Grep audit - chỉ legacy folder có HCSN references
rg "CIRCULAR_24_2024|ALL_ACCOUNTS_TT24" server/ --glob "*.js" | grep -v "legacy/"
# Expected: No results

# 2. Database check
sqlite3 database.sqlite "SELECT value FROM system_settings WHERE key='accounting_regime'"
# Expected: CIRCULAR_99_2025

# 3. Run tests
cd server && npm test
# Expected: All tests pass

# 4. Verify deprecated routes
curl -I http://localhost:3000/api/hcsn/materials
# Expected: Deprecation: true header
```

## Liên hệ

Nếu có câu hỏi về migration, vui lòng tạo issue tại repository.
