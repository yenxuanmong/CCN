@echo off
echo ========================================
echo    LUDO MASTER ELITE - STARTING UP
echo ========================================
echo.

echo [1/2] Starting Node.js Backend (port 3001)...
start "Ludo Backend" cmd /k "cd /d %~dp0server && node server.js"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Flask Frontend (port 5000)...
start "Ludo Frontend" cmd /k "cd /d %~dp0game_web && set PYTHONIOENCODING=utf-8 && py app.py"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   READY!
echo   Frontend : http://localhost:5000
echo   Backend  : http://localhost:3001  (Node.js API + Socket.IO)
echo ========================================
echo.
echo Opening browser...
start http://localhost:5000

pause
