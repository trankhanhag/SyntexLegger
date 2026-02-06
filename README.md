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

### Server (Express.js + SQLite/PostgreSQL)
```
server/
├── routes/          # API endpoints
├── services/        # Business logic
├── migrations/      # Database schema
├── seeds/           # Default data (TT99 accounts)
└── legacy/          # Deprecated HCSN (TT24) code
```

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
npm run migrate
npm run seed
npm start
```

### Khởi chạy Client
```bash
cd app
npm install
npm run dev
```

## Biến môi trường

### Server (.env)
```
PORT=3000
DB_TYPE=sqlite
DB_PATH=./database.sqlite
JWT_SECRET=your-secret-key
```

### Client (.env)
```
VITE_API_URL=http://localhost:3000/api
```

## Giấy phép

Proprietary - Xem file LICENSE

## Tài liệu thêm

- [MIGRATION_NOTES.md](MIGRATION_NOTES.md) - Ghi chú chuyển đổi HCSN → DN
- [CONTRIBUTING.md](CONTRIBUTING.md) - Hướng dẫn đóng góp
