@echo off
title MiraverseOSx Launcher
echo ========================================================
echo   Starting MiraverseOSx + Living World + Observatory
echo ========================================================
echo.

cd /d "%~dp0"

echo The backend will be built before all services start.
echo Open http://localhost:3000 when Vite reports that it is ready.
echo Observatory: http://127.0.0.1:8768
echo Living World API: http://127.0.0.1:5010
echo Press Ctrl+C here to stop all services started by this launcher.
echo.

:: Use the shared startup command so a failed build stops startup and
:: all services remain attached to this launcher instead of orphaned windows.
call npm start
if errorlevel 1 (
    echo.
    echo Startup failed. Review the error above.
    pause
    exit /b 1
)
