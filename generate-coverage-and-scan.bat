@echo off
REM Script to generate coverage and run SonarQube scan
REM This ensures coverage files are generated before scanning

echo ========================================
echo Generating Coverage Reports
echo ========================================

echo.
echo [1/3] Generating frontend coverage...
cd frontend
call npm run test:coverage -- --run
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend coverage generation failed!
    cd ..
    exit /b 1
)
cd ..

echo.
echo [2/3] Generating backend coverage...
cd backend
call npm run test:coverage
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend coverage generation failed!
    cd ..
    exit /b 1
)
cd ..

echo.
echo [3/3] Fixing lcov.info file paths...
call node scripts/fix-lcov-paths.js
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Path fixing script failed, continuing anyway...
)

echo.
echo ========================================
echo Verifying Coverage Files
echo ========================================

if exist "frontend\coverage\lcov.info" (
    echo [OK] Frontend coverage file exists
) else (
    echo [ERROR] Frontend coverage file missing!
    exit /b 1
)

if exist "backend\coverage\lcov.info" (
    echo [OK] Backend coverage file exists
) else (
    echo [ERROR] Backend coverage file missing!
    exit /b 1
)

echo.
echo ========================================
echo Running SonarQube Scan
echo ========================================

REM Check if SONAR_TOKEN environment variable is set
if "%SONAR_TOKEN%"=="" (
    echo ERROR: SONAR_TOKEN environment variable is not set!
    echo Please set it using: set SONAR_TOKEN=your_token_here
    exit /b 1
)

sonar-scanner.bat -D"sonar.projectKey=uroprep" -D"sonar.sources=." -D"sonar.host.url=https://sonar.ahimsa.global" -D"sonar.token=%SONAR_TOKEN%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS: SonarQube scan completed!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ERROR: SonarQube scan failed!
    echo ========================================
    exit /b 1
)

