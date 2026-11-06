@echo off
title QueueCare Backend API
echo ===================================================
echo Starting QueueCare Backend Server...
echo ===================================================
cd /d "%~dp0"
call npm run start:dev
pause
