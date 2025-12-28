@echo off
echo ========================================
echo    OrderSystem - Auto Silent Print
echo ========================================
echo.
echo This will open a dedicated Chrome window
echo for OrderSystem with auto-print enabled.
echo Your existing Chrome windows stay open.
echo.

REM Find Chrome
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else (
    echo [ERROR] Chrome not found!
    echo Please install Google Chrome.
    pause
    exit
)

REM Set your OrderSystem URL (change if deployed)
set URL=https://obscure-robot-x57v69grwqrgc6r7g-5173.app.github.dev/damdamzyun/

REM Use dedicated profile dir (won't affect your main Chrome)
set "PROFILE_DIR=%LOCALAPPDATA%\OrderSystemChrome"
if "%LOCALAPPDATA%"=="" set "PROFILE_DIR=%TEMP%\OrderSystemChrome"

echo Starting OrderSystem Chrome (with auto-print)...
echo Profile: %PROFILE_DIR%
echo URL: %URL%
echo.

REM Launch Chrome with kiosk-printing for silent print
REM This opens a separate Chrome instance, your existing Chrome stays open
start "" %CHROME% ^
  --user-data-dir="%PROFILE_DIR%" ^
  --kiosk-printing ^
  --no-first-run ^
  --no-default-browser-check ^
  --app=%URL%

echo.
echo ========================================
echo [SUCCESS] OrderSystem Chrome started!
echo.
echo - Orders will auto-print (no dialog)
echo - Your main Chrome stays open
echo - To verify: chrome://version in new window
echo   should show --kiosk-printing flag
echo.
echo Make sure XP-80C is default printer!
echo ========================================
echo.
pause
