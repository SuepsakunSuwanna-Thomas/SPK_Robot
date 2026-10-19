@echo off
cd /d "%~dp0arduino_CLI"
call FAST_UPLOAD.bat %*
cd /d "%~dp0"
