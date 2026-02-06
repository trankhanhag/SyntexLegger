# SyntexLegger

Hệ thống Kế toán Doanh nghiệp theo Thông tư 99/2025/TT-BTC

## Tổng quan

SyntexLegger là giải pháp kế toán toàn diện cho doanh nghiệp Việt Nam, tuân thủ hệ thống tài khoản và yêu cầu báo cáo của Thông tư 99/2025/TT-BTC (có hiệu lực từ 01/01/2026).

## Tiêu chuẩn kế toán

Hệ thống áp dụng **TT 99/2025/TT-BTC** (Chế độ kế toán doanh nghiệp):
- Thay thế TT 200/2014/TT-BTC cho kế toán doanh nghiệp
- Có hiệu lực từ ngày 01/01/2026
- Ban hành bởi Bộ Tài chính ngày 27/10/2025

### Cấu trúc hệ thống tài khoản (TT99)

| Loại | Phạm vi | Mô tả | Description |
|------|---------|-------|-------------|
| 1 | 111-158 | Tài sản ngắn hạn | Short-term Assets |
| 2 | 211-244 | Tài sản dài hạn | Long-term Assets |
| 3 | 331-357 | Nợ phải trả | Liabilities |
| 4 | 411-466 | Vốn chủ sở hữu | Equity |
| 5 | 511-521 | Doanh thu | Revenue |
| 6 | 621-642 | Chi phí sản xuất, kinh doanh | Production/Operating Costs |
| 7 | 711 | Thu nhập khác | Other Income |
| 8 | 811 | Chi phí khác | Other Expenses |
| 9 | 911 | Xác định kết quả kinh doanh | Income Determination |
| 0 | 001-009 | Tài khoản ngoại bảng | Off-balance Sheet |

## Kiến trúc

### Server (Express.js + SQLite)
```
server/
├── index.js         # Main entry point (JavaScript runtime)
├── database.js      # SQLite database initialization
├── app.js           # Express application setup
├── routes/          # API endpoints
├── services/        # Business logic
├── src/             # TypeScript modules (future migration)
│   ├── db/          # Knex migrations & schemas
│   ├── repositories/# Data access layer
│   └── utils/       # Utilities and helpers
├── __tests__/       # Jest tests (JS + TS)
└── seeds/           # Sample data (TT99 accounts)
```

**Runtime**: Hybrid JavaScript + TypeScript
- **Primary**: JavaScript (index.js) - Production-ready
- **TypeScript**: Type-safe modules, gradual migration path
- **Tests**: Support both .js and .ts test files

### Client (React + Vite)
```
app/
├── src/
│   ├── components/  # React components
│   ├── stores/      # State management (Zustand)
│   └── api.ts       # API client
```

## Tính năng chính

- Ghi sổ kép (Double-entry bookkeeping)
- Tuân thủ TT 99/2025
- Báo cáo tài chính (B01-DN, B02-DN, B03-DN, B09-DN)
- Tích hợp hóa đơn điện tử (VNPT, Viettel, BKAV, MISA)
- Hỗ trợ đa tiền tệ
- Quản lý tài sản cố định
- Quản lý nhân sự và tiền lương

## Cài đặt

### Yêu cầu
- Node.js >= 18.x
- npm >= 9.x

### Khởi chạy Server
```bash
cd server
npm install

# Môi trường Development (với sample data)
npm run dev

# Môi trường Production (không có sample data)
DISABLE_SAMPLE_DATA=true npm start
```

**Lưu ý về Seed Data**:
- Mặc định (dev): Tự động seed sample data khi DB rỗng
- Production: Đặt `DISABLE_SAMPLE_DATA=true` để tắt sample data
- Admin user: Chỉ seed lần đầu (không reset password khi restart)
- Default admin: username=`admin`, password=`admin` (có thể đổi qua env vars)

### Khởi chạy Client
```bash
cd app
npm install
npm run dev
```

## Biến môi trường

### Server (.env)
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_TYPE=sqlite
DB_PATH=./db_v2.sqlite

# Authentication
JWT_SECRET=your-secret-key-change-in-production
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASSWORD=admin

# Sample Data (Development only)
DISABLE_SAMPLE_DATA=false

# License Management
LICENSE_SERVER_URL=http://localhost:4000
```

### Client (.env)
```bash
VITE_API_URL=http://localhost:3000/api
```

## Giấy phép

MIT License - Xem file [LICENSE](LICENSE)

## Tài liệu thêm

- [MIGRATION_NOTES.md](MIGRATION_NOTES.md) - Ghi chú chuyển đổi HCSN → DN
- [CONTRIBUTING.md](CONTRIBUTING.md) - Hướng dẫn đóng góp
