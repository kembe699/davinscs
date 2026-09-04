@echo off
title FlippedPOS - Stop
echo Stopping FlippedPOS...
docker compose down
echo.
echo Stopped. Your data is kept - run start.bat to bring it back.
echo (To erase all data instead, run: docker compose down -v)
pause
