@echo off
title QueueCare MySQL Service
echo ===================================================
echo Ensuring QueueCare MySQL 8.4 Server is Running...
echo ===================================================
cd /d "%~dp0"
node scripts/ensure-mysql.js
pause
