@echo off
echo Setting up Urology Backend...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not available
    pause
    exit /b 1
)

echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Creating .env file from template...
if not exist .env (
    copy env.example .env
    echo .env file created. Please edit it with your configuration.
) else (
    echo .env file already exists.
)

echo.
echo Setup completed!
echo.
echo Next steps:
echo 1. Edit .env file with your database configuration
echo 2. Make sure PostgreSQL is running
echo 3. Run: npm run setup-db
echo 4. Run: npm run dev
echo.
pause
