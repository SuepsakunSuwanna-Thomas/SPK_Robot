@echo off
chcp 65001 >nul
color 0B
title RP2350 Smart Farm IDE - Auto Setup

echo ===================================================
echo     🚀 ระบบกำลังเตรียมความพร้อม RP2350 Web IDE
echo ===================================================
echo.

:: 1. ตรวจสอบและติดตั้ง Node.js
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [!] ไม่พบ Node.js ในเครื่อง กำลังดาวน์โหลดและติดตั้งอัตโนมัติ...
    winget install OpenJS.NodeJS -e --silent
) ELSE (
    echo [OK] พบ Node.js ในระบบแล้ว
)

:: 2. ตรวจสอบและติดตั้ง Python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [!] ไม่พบ Python ในเครื่อง กำลังดาวน์โหลดและติดตั้งอัตโนมัติ...
    winget install Python.Python.3.11 -e --silent
) ELSE (
    echo [OK] พบ Python ในระบบแล้ว
)

:: 3. ระบบไม่ต้องใช้ PlatformIO แล้ว (ใช้ Nitro Engine V6 แทน)
echo [OK] ระบบ Nitro Engine V6 พร้อมใช้งาน (Portable)


:: 4. ติดตั้งไลบรารีของ Node.js (ทำแบบออฟไลน์ได้ถ้าเคยโหลดแล้ว)
IF NOT EXIST "node_modules" (
    echo [!] กำลังตั้งค่าระบบ...
    call npm install
)

echo.
echo ===================================================
echo     ✅ ทุกอย่างพร้อมแล้ว! กำลังเปิด Google Chrome...
echo     (ห้ามปิดหน้าต่างสีดำนี้เด็ดขาด ขณะกำลังเรียน)
echo ===================================================
echo.

:: 5. บังคับเปิดด้วย Google Chrome
start chrome "http://localhost:3000"

:: เช็กว่าถ้าเปิด Chrome ไม่สำเร็จ (อาจจะไม่มีในเครื่อง) ให้เปิดเบราว์เซอร์ปกติแทน
IF %ERRORLEVEL% NEQ 0 (
    start http://localhost:3000
)

:: รันเซิร์ฟเวอร์
node server.js

pause