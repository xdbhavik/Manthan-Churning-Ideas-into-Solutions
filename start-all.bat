@echo off
echo ====================================================
echo Starting Backend and Frontend Docker Containers...
echo ====================================================

:: Navigate to the directory where this script is located
cd /d "%~dp0"

echo [1/3] Packaging backend services...
echo This may take a few minutes. Docker containers will start only after Maven reports BUILD SUCCESS.
cd backend
:: Use Maven from PATH. The checked-in Windows wrapper is incompatible with
:: Windows PowerShell 7 on some systems and can exit before Maven starts.
mvn -Duser.home="%USERPROFILE%" -Dmaven.repo.local="%USERPROFILE%\.m2\repository" -Dmaven.test.skip=true package
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to package backend services.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Starting backend containers...
docker compose up -d --build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start backend containers.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo Backend container status:
docker compose ps
cd ..

echo.
echo [3/3] Starting frontend containers...
docker compose -f docker-compose.yml up -d --build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start frontend containers.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo Frontend container status:
docker compose ps

echo.
echo ====================================================
echo All containers started successfully in the background!
echo ====================================================
pause
