@echo off
setlocal enabledelayedexpansion
title FlippedPOS
echo =========================================
echo   FlippedPOS - Local Setup
echo =========================================
echo.

REM ── Docker must be running ───────────────────────────────────────────────
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Desktop is not running.
    echo        Start Docker Desktop, wait until it says "Engine running", then
    echo        run this file again.
    pause
    exit /b 1
)

REM ── First run: create .env and generate a unique JWT secret ──────────────
REM The secret used to be a shared placeholder baked into docker-compose.yml.
REM Anyone with a copy of this package could have used it to forge logins on
REM any install that kept the default, so each install now gets its own.
if not exist ".env" (
    echo [SETUP] First run - creating .env from .env.docker.example
    copy ".env.docker.example" ".env" >nul

    for /f %%i in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')"') do set "SECRET=%%i"
    powershell -NoProfile -Command "(Get-Content '.env') -replace '^JWT_SECRET=.*', 'JWT_SECRET=!SECRET!' | Set-Content '.env'"

    echo [SETUP] Generated a unique security key for this installation.
    echo         Open .env in Notepad if you need to change the port or password.
    echo.
)

REM ── Read the chosen port back out of .env so every message and the browser
REM    we open point at the right place when APP_PORT has been changed.
set "APP_PORT=3001"
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if /i "%%a"=="APP_PORT" if not "%%b"=="" set "APP_PORT=%%b"
)

echo [1/2] Building and starting FlippedPOS...
echo       The first run takes 3-5 minutes. Later starts take a few seconds.
echo.

docker compose up --build -d
if errorlevel 1 (
    echo.
    echo ERROR: Failed to start. The output above says why.
    echo        Most common cause: the port is already in use - open .env and
    echo        set APP_PORT to something else, e.g. 3005.
    pause
    exit /b 1
)

echo.
echo [2/2] Waiting for FlippedPOS to become ready...
set "READY="
for /l %%i in (1,1,40) do (
    if not defined READY (
        powershell -NoProfile -Command "try{ (Invoke-WebRequest -UseBasicParsing http://localhost:!APP_PORT!/api/health -TimeoutSec 3).StatusCode }catch{ 0 }" | findstr /c:"200" >nul 2>&1
        if !errorlevel! equ 0 ( set "READY=1" ) else ( timeout /t 3 /nobreak >nul )
    )
)

echo.
if defined READY (
    echo =========================================
    echo   FlippedPOS is running
    echo   Open: http://localhost:!APP_PORT!
    echo =========================================
    start "" http://localhost:!APP_PORT!
) else (
    echo =========================================
    echo   Started, but not answering yet.
    echo   Give it another minute, then open:
    echo   http://localhost:!APP_PORT!
    echo   If it still fails, run: docker compose logs app
    echo =========================================
)
echo.
echo Press any key to watch the live log. Closing the log does NOT stop FlippedPOS.
pause >nul
docker compose logs -f app
