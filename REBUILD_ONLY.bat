@echo off
cd /d "%~dp0arduino_CLI"
call REBUILD_ONLY.bat %*
cd /d "%~dp0"
