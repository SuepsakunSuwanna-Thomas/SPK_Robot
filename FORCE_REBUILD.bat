@echo off
cd /d "%~dp0arduino_CLI"
call FORCE_REBUILD.bat %*
cd /d "%~dp0"
