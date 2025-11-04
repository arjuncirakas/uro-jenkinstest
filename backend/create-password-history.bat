@echo off
echo Creating password_history table...
echo.

cd /d "%~dp0"

echo Running password history table creation script...
node scripts/create-password-history-table.js

echo.
echo Password history table creation completed!
echo.
pause




