@echo off
echo ====================================================
echo Starting Backend and Frontend Docker Containers...
echo ====================================================

:: Navigate to the directory where this script is located
cd /d "%~dp0"

echo [1/2] Starting backend containers...
cd backend
docker compose up -d --build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start backend containers.
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [2/2] Starting frontend containers...
docker compose -f docker-compose.yml up -d --build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start frontend containers.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo All containers started successfully in the background!
echo ====================================================
pause
