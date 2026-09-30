@echo off
echo ====================================================
echo Starting SIH26043 Frontend Micro-Applications...
echo ====================================================

start "Innovation Portal (:3004)" cmd /c "cd /d %~dp0frontend\innovation-portal-web && npm run dev"
start "Evaluator UI (:3001)" cmd /c "cd /d %~dp0frontend\evaluator-ui && npm run dev"
start "Admin Cockpit (:5173)" cmd /c "cd /d %~dp0frontend\admin-ui && node server.js"
start "Reviewer Workbench (:8086)" cmd /c "cd /d %~dp0frontend\reviewer-ui && node server.js"
start "Submitter UI (:5174)" cmd /c "cd /d %~dp0frontend\submitter-ui && npm run dev -- --port 5174 --host 0.0.0.0"

echo.
echo ====================================================
echo All 5 frontends launched in separate windows!
echo - Innovation Portal:    http://localhost:3004/
echo - Evaluator UI:         http://localhost:3001/
echo - Admin Cockpit:        http://localhost:5173/
echo - Reviewer Workbench:   http://localhost:8086/
echo - Submitter UI:         http://localhost:5174/
echo - API Gateway:          http://localhost:8090/
echo - Eureka Registry:      http://localhost:8761/
echo ====================================================
pause
