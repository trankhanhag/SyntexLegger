# SyntexLegger API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All endpoints (except `/api/login`) require authentication via JWT token.

### Login
```http
POST /api/login
Content-Type: application/json

{
    "username": "admin",
    "password": "admin"
}
```

**Response:**
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "username": "admin",
        "role": "admin",
        "fullname": "Administrator"
    }
}
```

### Using the Token
Include the token in the Authorization header:
```http
Authorization: Bearer <token>
```

---

## Vouchers

### List Vouchers
```http
GET /api/vouchers?type=GENERAL&fromDate=2024-01-01&toDate=2024-12-31
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by voucher type |
| fromDate | string | Start date (YYYY-MM-DD) |
| toDate | string | End date (YYYY-MM-DD) |
| status | string | DRAFT, POSTED, VOIDED |
| page | number | Page number (default: 1) |
| pageSize | number | Items per page (default: 20) |

**Response:**
```json
[
    {
        "id": "V_1234567890",
        "doc_no": "PC001",
        "doc_date": "2024-01-15",
        "post_date": "2024-01-15",
        "description": "Chi tiền mua văn phòng phẩm",
        "type": "CASH_OUT",
        "status": "POSTED",
        "total_amount": 5000000
    }
]
```

### Get Voucher by ID
```http
GET /api/vouchers/:id
```

**Response:**
```json
{
    "id": "V_1234567890",
    "doc_no": "PC001",
    "doc_date": "2024-01-15",
    "post_date": "2024-01-15",
    "description": "Chi tiền mua văn phòng phẩm",
    "type": "CASH_OUT",
    "status": "POSTED",
    "total_amount": 5000000,
    "items": [
        {
            "id": 1,
            "description": "Giấy A4",
            "debit_acc": "6422",
            "credit_acc": "1111",
            "amount": 5000000,
            "partner_code": "NCC001"
        }
    ]
}
```

### Create Voucher
```http
POST /api/vouchers
Content-Type: application/json

{
    "doc_no": "PC002",
    "doc_date": "2024-01-16",
    "post_date": "2024-01-16",
    "description": "Chi tiền điện",
    "type": "CASH_OUT",
    "total_amount": 2000000,
    "items": [
        {
            "description": "Tiền điện tháng 1",
            "debit_acc": "6271",
            "credit_acc": "1111",
            "amount": 2000000
        }
    ]
}
```

**Response:**
```json
{
    "message": "Voucher saved and posted",
    "id": "V_1234567891"
}
```

### Delete Voucher
```http
DELETE /api/vouchers/:id
```

**Response:**
```json
{
    "message": "Voucher deleted successfully"
}
```

---

## Accounts (Chart of Accounts)

### List Accounts
```http
GET /api/accounts
```

**Response:**
```json
[
    {
        "account_code": "111",
        "account_name": "Tiền mặt",
        "category": "TÀI SẢN",
        "parent_code": null,
        "is_detail": 0
    },
    {
        "account_code": "1111",
        "account_name": "Tiền Việt Nam",
        "category": "TÀI SẢN",
        "parent_code": "111",
        "is_detail": 1
    }
]
```

### Get Account Balance
```http
GET /api/accounts/balance/:code?fromDate=2024-01-01&toDate=2024-12-31
```

**Response:**
```json
{
    "account_code": "1111",
    "account_name": "Tiền Việt Nam",
    "opening_balance": 10000000,
    "period_debit": 50000000,
    "period_credit": 30000000,
    "closing_balance": 30000000
}
```

### Save Accounts (Bulk)
```http
POST /api/master/accounts
Content-Type: application/json

{
    "data": [
        {
            "account_code": "1118",
            "account_name": "Tiền khác",
            "category": "TÀI SẢN",
            "parent_code": "111"
        }
    ]
}
```

### Delete Account
```http
DELETE /api/accounts/:code
```

---

## Partners

### List Partners
```http
GET /api/partners?type=CUSTOMER
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | CUSTOMER, SUPPLIER, EMPLOYEE, OTHER |

**Response:**
```json
[
    {
        "partner_code": "KH001",
        "partner_name": "Công ty TNHH ABC",
        "partner_type": "CUSTOMER",
        "tax_code": "0123456789",
        "address": "123 Nguyễn Huệ, Q1, TP.HCM",
        "phone": "028-12345678",
        "email": "abc@company.com"
    }
]
```

### Create/Update Partner
```http
POST /api/partners
Content-Type: application/json

{
    "partner_code": "KH002",
    "partner_name": "Công ty XYZ",
    "partner_type": "CUSTOMER",
    "tax_code": "0987654321",
    "address": "456 Lê Lợi, Q1, TP.HCM"
}
```

### Delete Partner
```http
DELETE /api/partners/:id
```

---

## Reports

### Trial Balance (Bảng cân đối số phát sinh)
```http
GET /api/reports/trial-balance?fromDate=2024-01-01&toDate=2024-12-31
```

**Response:**
```json
{
    "data": [
        {
            "account_code": "111",
            "account_name": "Tiền mặt",
            "opening_debit": 10000000,
            "opening_credit": 0,
            "period_debit": 50000000,
            "period_credit": 30000000,
            "closing_debit": 30000000,
            "closing_credit": 0
        }
    ],
    "totals": {
        "opening_debit": 100000000,
        "opening_credit": 100000000,
        "period_debit": 500000000,
        "period_credit": 500000000,
        "closing_debit": 150000000,
        "closing_credit": 150000000
    }
}
```

### General Ledger (Sổ cái)
```http
GET /api/reports/general-ledger?account_code=1111&fromDate=2024-01-01&toDate=2024-12-31
```

**Response:**
```json
{
    "account_code": "1111",
    "account_name": "Tiền Việt Nam",
    "opening_balance": 10000000,
    "entries": [
        {
            "trx_date": "2024-01-15",
            "doc_no": "PT001",
            "description": "Thu tiền bán hàng",
            "reciprocal_acc": "511",
            "debit_amount": 5000000,
            "credit_amount": 0,
            "running_balance": 15000000
        }
    ],
    "closing_balance": 30000000
}
```

### Cash Book (Sổ quỹ tiền mặt)
```http
GET /api/reports/cash-book?fromDate=2024-01-01&toDate=2024-12-31
```

### Bank Book (Sổ tiền gửi ngân hàng)
```http
GET /api/reports/bank-book?fromDate=2024-01-01&toDate=2024-12-31
```

### Balance Sheet (Bảng cân đối kế toán) - DN
```http
GET /api/reports/dn/balance-sheet?asOfDate=2024-12-31
```

### Income Statement (Báo cáo KQKD) - DN
```http
GET /api/reports/dn/profit-loss?fromDate=2024-01-01&toDate=2024-12-31
```

### Cash Flow Statement (Báo cáo LCTT) - DN
```http
GET /api/reports/dn/cash-flow?fromDate=2024-01-01&toDate=2024-12-31
```

---

## Fixed Assets

### List Assets
```http
GET /api/assets
```

### Get Asset
```http
GET /api/assets/:id
```

### Create Asset
```http
POST /api/assets
Content-Type: application/json

{
    "asset_code": "TS001",
    "asset_name": "Máy tính văn phòng",
    "category": "OFFICE_EQUIPMENT",
    "original_cost": 15000000,
    "residual_value": 1500000,
    "useful_life_years": 3,
    "depreciation_method": "STRAIGHT_LINE",
    "acquisition_date": "2024-01-15",
    "start_depreciation_date": "2024-02-01"
}
```

### Calculate Depreciation
```http
POST /api/assets/depreciation/calculate
Content-Type: application/json

{
    "year": 2024,
    "month": 12
}
```

---

## Budget Control

### List Budget Estimates
```http
GET /api/budget/estimates?fiscalYear=2024
```

### Check Budget Availability
```http
POST /api/budget/check
Content-Type: application/json

{
    "budget_estimate_id": "BE001",
    "amount": 5000000,
    "fiscal_year": 2024
}
```

**Response:**
```json
{
    "available": true,
    "allocated": 100000000,
    "spent": 45000000,
    "remaining": 55000000,
    "requested": 5000000,
    "new_remaining": 50000000
}
```

---

## System

### Get System Settings
```http
GET /api/settings
```

### Update Settings
```http
POST /api/settings
Content-Type: application/json

{
    "key": "company_name",
    "value": "Công ty TNHH ABC"
}
```

### Lock Period
```http
POST /api/system/lock-period
Content-Type: application/json

{
    "year": 2024,
    "month": 1
}
```

### Unlock Period
```http
POST /api/system/unlock-period
Content-Type: application/json

{
    "year": 2024,
    "month": 1
}
```

---

## Error Responses

All errors follow this format:

```json
{
    "error": "Error message",
    "code": "ERROR_CODE",
    "details": {}
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Validation Error - Input validation failed |
| 423 | Locked - Period is locked |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Common Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Input validation failed |
| NOT_FOUND | Resource not found |
| PERIOD_LOCKED | Accounting period is locked |
| VOUCHER_UNBALANCED | Voucher debit/credit not equal |
| BUDGET_EXCEEDED | Budget limit exceeded |
| DUPLICATE_ENTRY | Duplicate record exists |

---

## Voucher Types

| Type | Description |
|------|-------------|
| GENERAL | Chứng từ chung |
| CASH_IN | Phiếu thu |
| CASH_OUT | Phiếu chi |
| BANK_IN | Báo có ngân hàng |
| BANK_OUT | Báo nợ ngân hàng |
| PURCHASE | Phiếu mua hàng |
| SALE | Hóa đơn bán hàng |
| ADJUSTMENT | Bút toán điều chỉnh |

## Partner Types

| Type | Description |
|------|-------------|
| CUSTOMER | Khách hàng |
| SUPPLIER | Nhà cung cấp |
| EMPLOYEE | Nhân viên |
| OTHER | Đối tượng khác |

## Account Categories (TT 99/2025)

| Category | Description | Nature |
|----------|-------------|--------|
| TÀI SẢN | Assets | Debit |
| NỢ PHẢI TRẢ | Liabilities | Credit |
| VỐN CHỦ SỞ HỮU | Equity | Credit |
| DOANH THU | Revenue | Credit |
| CHI PHÍ | Expenses | Debit |
| THU NHẬP KHÁC | Other Income | Credit |
| CHI PHÍ KHÁC | Other Expenses | Debit |
| XÁC ĐỊNH KQKD | P&L Determination | Both |
