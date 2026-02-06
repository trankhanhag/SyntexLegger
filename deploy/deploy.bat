@echo off
REM
REM SyntexLegger Production Deployment Script (Windows)
REM Ke toan Doanh nghiep theo TT 99/2025/TT-BTC
REM
REM Usage: deploy.bat [environment]
REM Environments: staging, production
REM

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=production

echo ================================================
echo    SyntexLegger Deployment Script
echo    Environment: %ENVIRONMENT%
echo ================================================
echo.

REM Navigate to project root
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"

REM ==================================
REM 1. Pre-deployment checks
REM ==================================
echo Step 1: Pre-deployment checks
echo.

REM Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js not found! Please install Node.js first.
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo [OK] Node.js version: %%i

REM Check if server/.env exists
if not exist "server\.env" (
    echo [X] server\.env not found! Copy from server\.env.example and configure.
    exit /b 1
)
echo [OK] server\.env found

REM ==================================
REM 2. Install dependencies
REM ==================================
echo.
echo Step 2: Installing dependencies
echo.

cd "%PROJECT_ROOT%\server"
echo Installing server dependencies...
call npm ci --production=false
if errorlevel 1 (
    echo [X] Failed to install server dependencies
    exit /b 1
)
echo [OK] Server dependencies installed

cd "%PROJECT_ROOT%\app"
echo Installing frontend dependencies...
call npm ci
if errorlevel 1 (
    echo [X] Failed to install frontend dependencies
    exit /b 1
)
echo [OK] Frontend dependencies installed

REM ==================================
REM 3. Run database migrations
REM ==================================
echo.
echo Step 3: Database migrations
echo.

cd "%PROJECT_ROOT%\server"
echo Running database migrations...
call npm run db:migrate
if errorlevel 1 (
    echo [X] Migration failed
    exit /b 1
)
echo [OK] Migrations completed

REM Run seeds if --seed flag is provided
if "%2"=="--seed" (
    echo Running database seeds...
    call npm run db:seed
    echo [OK] Seeds completed
)

REM ==================================
REM 4. Build frontend
REM ==================================
echo.
echo Step 4: Building frontend
echo.

cd "%PROJECT_ROOT%\app"
echo Building frontend for production...
call npm run build:prod
if errorlevel 1 (
    echo [X] Frontend build failed
    exit /b 1
)
echo [OK] Frontend build completed

REM Copy to server/public
if exist "%PROJECT_ROOT%\server\public" rmdir /s /q "%PROJECT_ROOT%\server\public"
mkdir "%PROJECT_ROOT%\server\public"
xcopy /e /i /y "%PROJECT_ROOT%\app\dist\*" "%PROJECT_ROOT%\server\public\"
echo [OK] Frontend assets copied to server\public

REM ==================================
REM 5. Create required directories
REM ==================================
echo.
echo Step 5: Creating required directories
echo.

cd "%PROJECT_ROOT%\server"
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "backups" mkdir backups
if not exist "data" mkdir data
echo [OK] Directories created: logs, uploads, backups, data

REM ==================================
REM Deployment Summary
REM ==================================
echo.
echo ================================================
echo    Deployment Complete!
echo ================================================
echo.
echo Environment: %ENVIRONMENT%
echo Server: %PROJECT_ROOT%\server
echo Frontend: %PROJECT_ROOT%\server\public
echo.
echo To start the server:
echo   cd server ^&^& npm start
echo.
echo Or with PM2:
echo   pm2 start server\index.js --name syntexlegger
echo.

endlocal
