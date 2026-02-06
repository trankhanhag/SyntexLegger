# SyntexLegger Production Deployment Guide

Hướng dẫn triển khai SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC

## Yêu cầu hệ thống

### Server Requirements
- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **RAM**: >= 2GB
- **Storage**: >= 10GB (tùy thuộc dữ liệu)
- **OS**: Linux (Ubuntu 20.04+), Windows Server 2019+

### Database Options
- **SQLite**: Cho single-user hoặc small team (< 10 users)
- **PostgreSQL**: Cho enterprise deployment (khuyến nghị)

## Quick Start

### Windows
```batch
cd deploy
deploy.bat production
```

### Linux/macOS
```bash
cd deploy
chmod +x deploy.sh
./deploy.sh production
```

## Chi tiết các bước triển khai

### 1. Clone repository
```bash
git clone https://github.com/yourorg/syntexlegger.git
cd syntexlegger
```

### 2. Cấu hình Server (Backend)

Copy và chỉnh sửa file cấu hình:
```bash
cp server/.env.example server/.env
```

Các biến bắt buộc cho production:
```env
# Server
NODE_ENV=production
PORT=5000

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/syntexlegger
# hoặc
DB_HOST=localhost
DB_PORT=5432
DB_NAME=syntexlegger
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT (QUAN TRỌNG - tạo secret mới!)
JWT_SECRET=your-very-long-and-secure-secret-key-at-least-32-chars
JWT_EXPIRES_IN=24h

# CORS (thêm domain production)
CORS_ORIGINS=https://yourcompany.com,https://www.yourcompany.com
```

Tạo JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Cấu hình Frontend

Copy và chỉnh sửa:
```bash
cp app/.env.example app/.env.production
```

Nội dung `.env.production`:
```env
VITE_API_URL=https://api.yourcompany.com/api
VITE_DISABLE_AUTO_LOGIN=true
VITE_AUTOLOGIN_USERNAME=
VITE_AUTOLOGIN_PASSWORD=
VITE_ENABLE_DEBUG_MODE=false
VITE_APP_TITLE=SyntexLegger
```

### 4. Database Setup

#### SQLite (Development/Small team)
```bash
cd server
npm run db:migrate
npm run db:seed
```

#### PostgreSQL (Production)

Tạo database:
```sql
CREATE DATABASE syntexlegger;
CREATE USER syntex_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE syntexlegger TO syntex_user;
```

Chạy migrations:
```bash
cd server
NODE_ENV=production npm run db:migrate
NODE_ENV=production npm run db:seed
```

### 5. Build Frontend

```bash
cd app
npm ci
npm run build
```

Output sẽ nằm trong `app/dist/`

### 6. Khởi động Server

#### Option A: Direct Node.js
```bash
cd server
NODE_ENV=production npm start
```

#### Option B: PM2 (Khuyến nghị)
```bash
# Install PM2
npm install -g pm2

# Start with ecosystem config
cd deploy
pm2 start ecosystem.config.js --env production

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

#### Option C: Systemd (Linux)
```bash
sudo cp deploy/syntexlegger.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable syntexlegger
sudo systemctl start syntexlegger
```

### 7. Nginx Configuration (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name yourcompany.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourcompany.com/privkey.pem;

    # Frontend (static files)
    location / {
        root /var/www/syntexlegger/app/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring & Logs

### PM2 Monitoring
```bash
pm2 status
pm2 logs syntexlegger
pm2 monit
```

### Application Logs
```bash
# Server logs
tail -f server/logs/app.log

# PM2 logs
tail -f logs/pm2-combined.log
```

## Backup & Restore

### Tự động Backup
Hệ thống hỗ trợ backup tự động qua System Settings:
- `auto_backup_enabled`: true
- `backup_retention_days`: 30

### Manual Backup
```bash
cd server
npm run db:backup
```

### Restore từ Backup
Sử dụng giao diện Admin hoặc API:
```bash
curl -X POST http://localhost:5000/api/backup/restore \
  -H "Authorization: Bearer <token>" \
  -F "file=@backup_2026-01-15.zip"
```

## Security Checklist

- [ ] JWT_SECRET được đổi và đủ dài (>= 32 chars)
- [ ] HTTPS được bật (SSL certificate)
- [ ] Database password mạnh
- [ ] CORS chỉ cho phép domain cần thiết
- [ ] `VITE_DISABLE_AUTO_LOGIN=true` trong production
- [ ] Firewall chỉ mở port cần thiết (80, 443)
- [ ] Database không expose ra public internet
- [ ] Backup được cấu hình và test

## Troubleshooting

### Server không khởi động
```bash
# Check logs
pm2 logs syntexlegger --lines 100

# Check port
netstat -tlnp | grep 5000
```

### Database connection failed
```bash
# Test PostgreSQL connection
psql -h localhost -U syntex_user -d syntexlegger

# Check if migration ran
cd server && npx knex migrate:status
```

### Frontend 404 errors
- Kiểm tra nginx config có `try_files $uri $uri/ /index.html`
- Kiểm tra `VITE_API_URL` đúng

## Support

- GitHub Issues: https://github.com/yourorg/syntexlegger/issues
- Documentation: https://docs.syntexlegger.com
