@echo off
echo Creating superadmin user...
echo.

cd /d "%~dp0"

echo Running superadmin creation script...
node scripts/create-superadmin.js

echo.
echo Superadmin creation completed!
echo.
pause

