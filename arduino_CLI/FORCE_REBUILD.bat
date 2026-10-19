@echo off
setlocal
cd /d "%~dp0"

REM Start global timing
for /f "delims=" %%a in ('powershell -Command "[DateTimeOffset]::Now.ToUnixTimeMilliseconds()"') do set "GLOBAL_START=%%a"

echo [1/3] TOTAL WIPE - CLEANING ALL CACHE...
if exist "build_cache" rd /s /q "build_cache"
mkdir "build_cache"

REM Select main file based on argument (Default is B)
set "TARGET=%1"
set "BUILD_ONLY_FLAG="
if "%TARGET%"=="" (
    set "TARGET=B"
    set "BUILD_ONLY_FLAG=-BuildOnly"
)

echo [2/3] SYNCING LIBRARIES AND GENERATING LINKER CMD (MODE: %TARGET%)...

REM --- HIDE AND PREPARE FILES ---
if /I "%TARGET%"=="T" (
    if exist "sketch\main_B\main_B.ino" ren "sketch\main_B\main_B.ino" "main_B.ino.real_bak"
    if exist "sketch\main_B\main_T.ino" ren "sketch\main_B\main_T.ino" "main_T.ino.bak"
    copy /y "sketch\main_B\main_T.ino.bak" "sketch\main_B\main_B.ino" > nul
) else (
    if exist "sketch\main_B\main_T.ino" ren "sketch\main_B\main_T.ino" "main_T.ino.bak"
)

set "CLI_EXE=%~dp0portable_tools\arduino-cli.exe"
echo ^>^>^> RUNNING ARDUINO-CLI SCAN (REAL-TIME LOG)...

REM Run with real-time output AND save to log
powershell -Command "& '%CLI_EXE%' compile --jobs %NUMBER_OF_PROCESSORS% --fqbn rp2040:rp2040:rpipico2 --build-path ./build_cache --libraries ./libraries --libraries ./libraries_User ./sketch/main_B/main_B.ino --verbose | Tee-Object -FilePath build_cache\full_log.txt"

REM --- RESTORE FILES ---
if /I "%TARGET%"=="T" (
    del "sketch\main_B\main_B.ino"
    if exist "sketch\main_B\main_B.ino.real_bak" ren "sketch\main_B\main_B.ino.real_bak" "main_B.ino"
    if exist "sketch\main_B\main_T.ino.bak" ren "sketch\main_B\main_T.ino.bak" "main_T.ino"
) else (
    if exist "sketch\main_B\main_T.ino.bak" ren "sketch\main_B\main_T.ino.bak" "main_T.ino"
)

REM NEW SUPER ROBUST EXTRACTION: Look for the longest line containing g++ and -o
powershell -Command "$log = Get-Content build_cache\full_log.txt; $link = $log | Where-Object { $_ -match 'arm-none-eabi-g\+\+' -and $_ -match '\-o' } | Sort-Object Length -Descending | Select-Object -First 1; if($link){ $link.Trim() | Out-File build_cache\link_cmd.bat -Encoding ascii; echo '>>> LINKER CMD CAPTURED SUCCESSFULLY!'; } else { echo '!!! ERROR: FAILED TO CAPTURE LINKER CMD !!!'; exit 1; }"

if %ERRORLEVEL% NEQ 0 (
    echo [FATAL ERROR] Rebuild failed. Please check build_cache\full_log.txt
    exit /b 1
)

echo [3/3] REBUILDING NITRO ENGINE...
powershell -ExecutionPolicy Bypass -File .\ULTIMATE_NITRO_V6_ELITE.ps1 -Mode %TARGET% %BUILD_ONLY_FLAG% -GlobalStartTime %GLOBAL_START%

echo ====================================
echo FULL REBUILD DONE!
echo ====================================
