@echo off
set "TARGET=%1"
if "%TARGET%"=="" set "TARGET=B"
powershell -ExecutionPolicy Bypass -File .\ULTIMATE_NITRO_V6_ELITE.ps1 -Mode %TARGET%

if %ERRORLEVEL% neq 0 (
    echo.
    echo [!] ตรวจพบข้อผิดพลาดในโค้ดของคุณ กรุณาตรวจสอบ Log ด้านบน
)
