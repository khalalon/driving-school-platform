@echo off
echo ========================================
echo Starting Expo in TUNNEL Mode
echo ========================================
echo.
echo This will work even if WiFi has issues!
echo.
cd /d "%~dp0mobile-app"
npx expo start --tunnel --port 8083
