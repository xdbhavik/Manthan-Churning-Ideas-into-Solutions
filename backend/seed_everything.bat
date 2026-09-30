@echo off
echo ========================================================
echo   SIH26043 Comprehensive Demo Data Seeder (Windows)
echo ========================================================
echo.
echo Seeding Users and Registrations (sih_source)...
docker exec -i sih26043-pg psql -v ON_ERROR_STOP=1 -U sih -d sih_source < db/sih_source_seed.sql
if %ERRORLEVEL% neq 0 goto error

echo Seeding Participants, Problems, and Submissions (sih_portal)...
docker exec -i sih26043-pg psql -v ON_ERROR_STOP=1 -U sih -d sih_portal < db/sih_portal_seed.sql
if %ERRORLEVEL% neq 0 goto error

echo Seeding Evaluators, Cycles, and Project Reviews (sih_eval)...
docker exec -i sih26043-pg psql -v ON_ERROR_STOP=1 -U sih -d sih_eval < db/sih_eval_seed.sql
if %ERRORLEVEL% neq 0 goto error

echo.
echo ALL SEEDING COMPLETED SUCCESSFULLY!
echo You can now log into the different frontends using the demo accounts.
goto end

:error
echo.
echo [ERROR] Seeding failed! See the error output above.
exit /b 1

:end
