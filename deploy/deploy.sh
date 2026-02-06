#!/bin/bash
#
# SyntexLegger Production Deployment Script
# Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
#
# Usage: ./deploy.sh [environment]
# Environments: staging, production
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-production}

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   SyntexLegger Deployment Script${NC}"
echo -e "${BLUE}   Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running from project root
if [ ! -f "package.json" ] && [ ! -d "server" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Navigate to project root
PROJECT_ROOT=$(pwd)
cd "$PROJECT_ROOT"

# ==================================
# 1. Pre-deployment checks
# ==================================
echo -e "\n${YELLOW}Step 1: Pre-deployment checks${NC}"

# Check Node.js version
NODE_VERSION=$(node -v)
print_status "Node.js version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm -v)
print_status "npm version: $NPM_VERSION"

# Check if .env exists for server
if [ ! -f "server/.env" ]; then
    print_error "server/.env not found! Copy from server/.env.example and configure."
    exit 1
fi
print_status "server/.env found"

# Verify JWT_SECRET is set
if grep -q "your-secure-jwt-secret-key-here" server/.env; then
    print_error "JWT_SECRET not configured! Please set a secure secret in server/.env"
    exit 1
fi
print_status "JWT_SECRET is configured"

# ==================================
# 2. Install dependencies
# ==================================
echo -e "\n${YELLOW}Step 2: Installing dependencies${NC}"

# Server dependencies
cd "$PROJECT_ROOT/server"
print_status "Installing server dependencies..."
npm ci --production=false
print_status "Server dependencies installed"

# Frontend dependencies
cd "$PROJECT_ROOT/app"
print_status "Installing frontend dependencies..."
npm ci
print_status "Frontend dependencies installed"

# ==================================
# 3. Run database migrations
# ==================================
echo -e "\n${YELLOW}Step 3: Database migrations${NC}"

cd "$PROJECT_ROOT/server"

# Run migrations
print_status "Running database migrations..."
npm run db:migrate
print_status "Migrations completed"

# Run seeds (only for fresh installs)
if [ "$2" == "--seed" ]; then
    print_status "Running database seeds..."
    npm run db:seed
    print_status "Seeds completed"
fi

# ==================================
# 4. Build frontend
# ==================================
echo -e "\n${YELLOW}Step 4: Building frontend${NC}"

cd "$PROJECT_ROOT/app"
print_status "Building frontend for production..."
npm run build:prod
print_status "Frontend build completed"

# Move build to server/public (optional - for single-server deployment)
if [ -d "$PROJECT_ROOT/server/public" ]; then
    rm -rf "$PROJECT_ROOT/server/public"
fi
mkdir -p "$PROJECT_ROOT/server/public"
cp -r "$PROJECT_ROOT/app/dist/"* "$PROJECT_ROOT/server/public/"
print_status "Frontend assets copied to server/public"

# ==================================
# 5. TypeScript compilation (optional)
# ==================================
echo -e "\n${YELLOW}Step 5: TypeScript compilation${NC}"

cd "$PROJECT_ROOT/server"
if [ -f "tsconfig.json" ]; then
    print_status "Compiling TypeScript..."
    npm run build 2>/dev/null || print_warning "TypeScript build skipped (using JS entry point)"
fi

# ==================================
# 6. Create required directories
# ==================================
echo -e "\n${YELLOW}Step 6: Creating required directories${NC}"

cd "$PROJECT_ROOT/server"
mkdir -p logs uploads backups data
chmod 755 logs uploads backups data
print_status "Directories created: logs, uploads, backups, data"

# ==================================
# 7. Final checks
# ==================================
echo -e "\n${YELLOW}Step 7: Final checks${NC}"

# Check if port is available
PORT=$(grep -oP 'PORT=\K[0-9]+' server/.env 2>/dev/null || echo "5000")
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port $PORT is already in use"
else
    print_status "Port $PORT is available"
fi

# ==================================
# Deployment Summary
# ==================================
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}   Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Environment: ${BLUE}$ENVIRONMENT${NC}"
echo -e "Server: ${BLUE}$PROJECT_ROOT/server${NC}"
echo -e "Frontend: ${BLUE}$PROJECT_ROOT/server/public${NC}"
echo ""
echo -e "${YELLOW}To start the server:${NC}"
echo "  cd server && npm start"
echo ""
echo -e "${YELLOW}Or with PM2:${NC}"
echo "  pm2 start server/index.js --name syntexlegger"
echo ""
echo -e "${YELLOW}Or with systemd:${NC}"
echo "  sudo systemctl start syntexlegger"
echo ""
