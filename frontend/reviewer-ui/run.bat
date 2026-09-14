@echo off
echo =========================================================================
echo SIH26043 - Reviewer Case Management & Statutory Verification Portal
echo =========================================================================
echo Serving application from: %~dp0
echo Local URL: http://localhost:8086/#/login
echo.
start "" http://localhost:8086/#/login
python -m http.server 8086 --directory "%~dp0"
