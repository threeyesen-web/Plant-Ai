@echo off
title Plant AI Launcher
color 0A

echo ==================================================
echo      Plant AI - Growth Assessment System
echo ==================================================
echo.
echo [1/3] Verifying Firewall Rule...
netsh advfirewall firewall show rule name="PlantAI_Allow" >nul
if %errorlevel% neq 0 (
    color 0E
    echo [WARNING] Firewall rule not found.
    echo Please run 'fix_firewall.bat' as Administrator first!
    echo (You might have trouble connecting from mobile otherwise)
    echo.
    pause
    color 0A
) else (
    echo [OK] Firewall rule exists.
)

echo.
echo [2/3] Getting your local IP address...
for /f "tokens=14" %%a in ('ipconfig ^| findstr "IPv4"') do set IP=%%a
echo Your IP Address is: %IP%

echo.
echo [3/3] Starting Auth + App Servers...
echo ==================================================
echo.
echo    OPEN THIS LINK ON YOUR MOBILE:
echo    http://%IP%:8000
echo.
echo ==================================================
echo.
echo Starting Node auth service on port 5000...
start "Plant AI Auth (Node)" cmd /k "cd /d "%~dp0backend" && npm start"

echo Waiting 3 seconds for auth service...
timeout /t 3 /nobreak >nul

echo Starting FastAPI app on port 8000...
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
