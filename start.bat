@echo off
title FlippedPos - Starting...
echo =========================================
echo   FlippedPos Local Setup
echo =========================================
echo.

REM Check Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/2] Building and starting containers (first run may take 3-5 minutes)...
echo.
docker-compose up --build -d

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start. Check the output above.
    pause
    exit /b 1
)

echo.
echo =========================================
echo   FlippedPos is running!
echo   Open: http://localhost:3001
echo =========================================
echo.
echo Press any key to view live logs (Ctrl+C to stop logs, app keeps running)
pause >nul
docker-compose logs -f app
