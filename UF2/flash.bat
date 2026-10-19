@echo off
chcp 65001 >nul
title Flash PuppyBot6 Firmware
echo ============================================
echo  RP2350 Pro IDE - ตัวช่วย Flash Firmware
echo  ชื่อไฟล์: pp_B.uf2
echo ============================================
echo.
echo [1] กรุณากดปุ่ม BOOTSEL บนบอร์ดค้างไว้
echo [2] เสียบสาย USB (หรือกดปุ่ม Reset ถ้าเสียบอยู่แล้ว)
echo [3] เมื่อบอร์ดเข้าโหมด "RPI-RP2" แล้ว โปรแกรมจะเริ่มทำงาน...
echo.
echo กำลังรอการเชื่อมต่อ...

set "UF2_FILE=UF2\pp_B.uf2"
set "START_TIME=%time%"

:WAIT_FOR_DRIVE
for %%d in (D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist %%d:\INFO_UF2.TXT (
        echo.
        echo Found Drive %%d: (RP2350 Bootloader)
        echo กำลังเริ่ม Flash... กรุณารอสักครู่...
        
        copy /Y "%UF2_FILE%" %%d:\ >nul
        
        if errorlevel 1 (
            echo [!] เกิดข้อผิดพลาดในการเขียนไฟล์
            pause
            exit /b 1
        )

        set "END_TIME=%time%"
        
        :: คำนวณเวลาแบบง่ายๆ (หน่วยวินาที)
        for /F "tokens=1-4 delims=:.," %%a in ("%START_TIME%") do set /a "start_res=(((%%a*60)+1%%b-100)*60)+1%%c-100"
        for /F "tokens=1-4 delims=:.," %%a in ("%END_TIME%") do set /a "end_res=(((%%a*60)+1%%b-100)*60)+1%%c-100"
        set /a "total_sec=end_res-start_res"
        if %total_sec% lss 0 set /a "total_sec+=86400"

        echo.
        echo ============================================
        echo  ✅ Flash สำเร็จเรียบร้อย!
        echo  ⏱️ ใช้เวลาทั้งหมด: %total_sec% วินาที
        echo ============================================
        echo.
        echo บอร์ดจะ Reboot อัตโนมัติใน 3 วินาที...
        timeout /t 3 /nobreak >nul
        exit /b 0
    )
)
timeout /t 1 /nobreak >nul
goto WAIT_FOR_DRIVE
