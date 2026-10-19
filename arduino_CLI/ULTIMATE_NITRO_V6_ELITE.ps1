param( [string]$Port = "AUTO", [string]$Mode = "B", [switch]$BuildOnly, [long]$GlobalStartTime = 0 )

$BuildDir  = "$PSScriptRoot/build_cache"
$Sketch    = "$PSScriptRoot/sketch/main_B"
$ELF       = "$BuildDir/main_B.ino.elf"
$PTool     = "$PSScriptRoot/portable_tools/picotool/picotool.exe"
$GPP       = "$PSScriptRoot/portable_tools/gcc/bin/arm-none-eabi-g++.exe"
$discoveryStart = Get-Date

# Helper function for registry parsing
function Get-ObjectProperties {
    process {
        foreach ($property in $_.psobject.Properties) {
            if ($property.Name -notmatch "PSPath|PSParentPath|PSChildName|PSDrive|PSProvider") {
                [PSCustomObject]@{
                    Name  = $property.Name
                    Value = $property.Value
                }
            }
        }
    }
}

# 1. AUTO-PORT DISCOVERY (Find Raspberry Pi Pico / RP2350)
$CachePortFile = "$BuildDir/last_port.txt"
if ($Port -eq "AUTO") {
    if (Test-Path $CachePortFile) {
        $CachedPort = (Get-Content $CachePortFile -Raw).Trim()
        # Fast registry check for COM port existence
        $validPorts = Get-ItemProperty -Path "HKLM:\HARDWARE\DEVICEMAP\SERIALCOMM" -ErrorAction SilentlyContinue
        $portExists = $false
        if ($null -ne $validPorts) {
            foreach ($p in ($validPorts | Get-ObjectProperties)) {
                if ($p.Value -eq $CachedPort) { $portExists = $true; break }
            }
        }
        # Fallback to standard check if registry check is complex
        if (!$portExists -and ([System.IO.Ports.SerialPort]::GetPortNames() -contains $CachedPort)) { $portExists = $true }

        if ($portExists) {
            $Port = $CachedPort
            Write-Host ">>> REUSING PORT $Port (Cached)" -ForegroundColor Cyan
        }
    }

    if ($Port -eq "AUTO") {
        Write-Host ">>> SCANNING FOR DEVICE... " -NoNewline -ForegroundColor Gray
        $found = Get-CimInstance Win32_PnPEntity | Where-Object { 
            $_.Name -match "Raspberry Pi" -or 
            $_.Name -match "RP2" -or 
            $_.Name -match "Pico" -or 
            $_.Name -match "USB Serial Device" -or
            $_.Description -match "Pico" 
        } | Select-Object -First 1
        if ($found) {
            if ($found.Name -match "\((COM\d+)\)") {
                $Port = $Matches[1]
                $Port | Out-File $CachePortFile -Encoding ascii
                Write-Host "FOUND ON $Port" -ForegroundColor Green
            }
        } else {
            Write-Host "NOT FOUND (Will try best effort)" -ForegroundColor Yellow
            $Port = "COM15" # Default fallback
        }
    }
}

# 1.1 EARLY BOOTLOADER ENTRY (Don't wait for compile to finish)
if (-not $BuildOnly) {
    Write-Host ">>> KICKING BOARD TO BOOTSEL ($Port)... " -NoNewline -ForegroundColor Yellow
    $sp = New-Object System.IO.Ports.SerialPort $Port, 1200, None, 8, One
    try {
        $sp.Open()
        $sp.Close()
        Write-Host "DONE" -ForegroundColor Green
    } catch {
        Write-Host "SKIPPED" -ForegroundColor Gray
    }
}

$discoveryEnd = Get-Date
$discoverySec = [Math]::Round(($discoveryEnd - $discoveryStart).TotalSeconds, 2)

# Helper function for registry parsing
function Get-ObjectProperties {
    process {
        foreach ($property in $_.psobject.Properties) {
            if ($property.Name -notmatch "PSPath|PSParentPath|PSChildName|PSDrive|PSProvider") {
                [PSCustomObject]@{
                    Name  = $property.Name
                    Value = $property.Value
                }
            }
        }
    }
}

# 1. UTF-8 CONSOLE FOR READABLE ERRORS
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$startTime = Get-Date
$uploadStartTime = $startTime
$buildTimeEnd = $startTime

# FUNCTION: EMERGENCY EXIT (Reboot board on fail)
function BuildFail($msg) {
    Write-Output "`n[! $msg !]"
    Write-Output "`n[ERROR_CATEGORY: $msg]"
    Write-Output ">>> REBOOTING BOARD TO NORMAL MODE..."
    # Best effort reboot
    & $PTool reboot 2>&1 | Out-Null
    Start-Sleep -Milliseconds 200 # Allow logs to flush to Node.js
    exit 1
}

# 0. READY BUILD

# 2. PATHS & TOOLS (PORTABLE)
$PTool = "$PSScriptRoot/portable_tools/picotool/picotool.exe"

$PortableCore = "$($PSScriptRoot -replace '\\', '/')/portable_tools/core"

# 4. CAPTURE & REPAIR LINKER CMD
if (Test-Path "$BuildDir/link_cmd.bat") {
    # Replace absolute paths with current portable paths
    $LinkCmd = (Get-Content "$BuildDir/link_cmd.bat" -Raw).Trim() -replace '[\r\n]', ' '
    $LinkCmd = $LinkCmd -replace '(?i)[A-Z]:\\[^ ]*\\AppData\\Local\\Arduino15\\packages\\rp2040\\hardware\\rp2040\\[^\\]+', $PortableCore
    $LinkCmd = $LinkCmd -replace 'D:\\arduino_CLI_END_V\d', $PSScriptRoot
    $LinkCmd = $LinkCmd -replace '(?i)[A-Z]:\\[^ ]*\\AppData\\Local\\Arduino15\\packages\\rp2040\\tools\\pqt-gcc\\[^\\]+', "$PSScriptRoot\portable_tools\gcc"
} else {
    BuildFail "LINK_CMD MISSING"
}

$AR   = "$PSScriptRoot/portable_tools/gcc/bin/arm-none-eabi-ar.exe"
$Base = "$PSScriptRoot/portable_tools/core"
$CFlags = "-c", "-O0", "-pipe", "-mcpu=cortex-m33", "-mthumb", "-march=armv8-m.main+fp+dsp", "-mfloat-abi=softfp", "-std=gnu++17", "-ffunction-sections", "-fdata-sections", "-fno-rtti", "-fno-exceptions", "-DARDUINO=10607", "-DARDUINO_ARCH_RP2040", "-DPICO_RP2350=1", "-DARDUINO_RASPBERRY_PI_PICO2"
$Inc = @("-iprefix$($Base)/", "@$($Base)/lib/rp2350/platform_inc.txt", "@$($Base)/lib/core_inc.txt", "-I$($Base)/include", "-I$($Base)/cores/rp2040", "-I$($Base)/variants/rpipico2", "-I$BuildDir/sketch")

# 3. SMART LIBRARY SCAN (Only include what's used)
$MainFile = if ($Mode.ToUpper() -eq "T") { "main_T.ino" } else { "main_B.ino" }
$ExcludeFile = if ($Mode.ToUpper() -eq "T") { "main_B.ino" } else { "main_T.ino" }
$InoFiles = Get-ChildItem $Sketch -Filter "*.ino" | Where-Object { $_.Name -ne $ExcludeFile } | Sort-Object { $_.Name -ne $MainFile }

$allInoCode = ($InoFiles | ForEach-Object { [System.IO.File]::ReadAllText($_.FullName) }) -join "`n"
$usedLibs = [regex]::Matches($allInoCode, '#include\s*[<"]([^>"\.]+)\.h[>"]') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

$LibPaths = @("$PSScriptRoot/libraries", "$PSScriptRoot/libraries_User", "$Base/libraries")
foreach ($lp in $LibPaths) {
    if (Test-Path $lp) {
        Get-ChildItem $lp -Directory | ForEach-Object {
            $libName = $_.Name
            if ($usedLibs -contains $libName -or $libName -match "puppybot|Wire|SPI|Servo|EEPROM|Adafruit|ST7735|GFX|ICM|ICM20948|encoder") {
                $Inc += "-I$($_.FullName)"
                if (Test-Path "$($_.FullName)/src") { $Inc += "-I$($_.FullName)/src" }
            }
        }
    }
}

# 4. PRECOMPILED HEADER (PCH) ENGINE
$PchDir = "$BuildDir/sketch"
$PchSrc = "$PchDir/pch.h"
$PchGch = "$PchDir/pch.h.gch"

if (-not (Test-Path $PchDir)) { New-Item -ItemType Directory -Path $PchDir -Force | Out-Null }

# 4.1 SELF-HEALING: Create pch.h if missing
if (-not (Test-Path $PchSrc)) {
    $PchContent = "#include <Arduino.h>`n#include <puppybot6.h>`n#include <Servo.h>`n#include <Wire.h>`n#include <SPI.h>`n#include <EEPROM.h>`n#include <SoftwareSerial.h>`n"
    [System.IO.File]::WriteAllText($PchSrc, $PchContent)
}

# 4.2 BUILD PCH CACHE (Only if changed)
if (-not (Test-Path $PchGch) -or (Get-Item $PchSrc).LastWriteTime -gt (Get-Item $PchGch).LastWriteTime) {
    Write-Host ">>> REFRESHING PCH CACHE..." -ForegroundColor Cyan
    & $GPP $CFlags $Inc -x c++-header $PchSrc -o $PchGch 2>&1
    if ($LASTEXITCODE -ne 0) { BuildFail "PCH ERR" }
}

# 5. SMART MERGE & COMPILE
$MergedObj = "$PchDir/elite.o"
$MergedSrc = "$PchDir/elite.cpp"

# 5.1 GLOBAL HASH CHECK
$currentHash = [BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($allInoCode)))
$hashFile = "$PchDir/elite.hash"

$needsCompile = $true
if ((Test-Path $MergedObj) -and (Test-Path $hashFile)) {
    if ((Get-Content $hashFile -Raw) -eq $currentHash) { $needsCompile = $false }
}

if ($needsCompile) {
    Write-Host ">>> COMPILING MERGED CORE (elite.cpp)..." -ForegroundColor Cyan
    $sigRegex = "(?m)^\s*(?:inline\s+|static\s+|virtual\s+)?(void|bool|int|float|double|long|String|uint\d+_t|unsigned|long\s+long)\s+(\w+)\s*\(([^)]*)\)\s*\{"
    $FinalCode = "#include `"pch.h`"`n"
    $FinalCode += (([regex]::Matches($allInoCode, $sigRegex) | ForEach-Object { "$($_.Groups[1].Value) $($_.Groups[2].Value)($($_.Groups[3].Value));" } | Sort-Object -Unique) -join "`n") + "`n"
    foreach ($f in $InoFiles) { 
        $FinalCode += "`n#line 1 `"$($f.Name)`"`n" + [System.IO.File]::ReadAllText($f.FullName)
    }
    [System.IO.File]::WriteAllText($MergedSrc, $FinalCode)
    
    # Fast Compile with PCH
    & $GPP $CFlags $Inc -include $PchSrc -Winvalid-pch $MergedSrc -o $MergedObj 2>&1
    if ($LASTEXITCODE -ne 0) { BuildFail "COMPILE ERR" }
    [System.IO.File]::WriteAllText($hashFile, $currentHash)
} else {
    Write-Host ">>> USING CACHED CORE (No changes detected)" -ForegroundColor Gray
}

# 6. PRE-LINKED MASTER OBJECT ENGINE (Extreme speed boost)
$MasterObj = "$BuildDir/lib_master.o"
$LD = "$PSScriptRoot/portable_tools/gcc/bin/arm-none-eabi-ld.exe"
if (-not (Test-Path $MasterObj)) {
    Write-Host ">>> PRE-LINKING LIBRARIES..." -ForegroundColor Cyan
    $LinkCmdRaw = [System.IO.File]::ReadAllText("$BuildDir/link_cmd.bat")
    $Objs = [regex]::Matches($LinkCmdRaw, '"([^"]+\.o)"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch "elite\.o|main_B\.ino\.cpp\.o|boot2\.o|ota\.o" }
    $FilteredObjs = $Objs | ForEach-Object { $_ -replace 'D:\\arduino_CLI_END_V\d', $PSScriptRoot }
    
    # Use 'ld -r' to merge all library objects into one relocatable object
    & $LD -r $FilteredObjs -o $MasterObj 2>&1
    if ($LASTEXITCODE -ne 0) { BuildFail "PRE-LINK ERR" }
}

# 7. FINAL NITRO LINK
$LinkCmd = [System.IO.File]::ReadAllText("$BuildDir/link_cmd.bat").Trim() -replace '[\r\n]', ' ' -replace 'D:\\arduino_CLI_END_V\d', $PSScriptRoot
$Archives = [regex]::Matches($LinkCmd, '"([^"]+\.a)"') | ForEach-Object { $_.Groups[1].Value }
$Boot2 = [regex]::Match($LinkCmd, '"([^"]+boot2\.o)"').Groups[1].Value
$Ota = [regex]::Match($LinkCmd, '"([^"]+ota\.o)"').Groups[1].Value
$LinkBase = $LinkCmd -replace '"[^"]+\.(?:o|a)"', " " -replace '-lm -lc -lstdc\+\+ -lc', " "

$LinkArgs = $LinkBase.Trim() + " -o `"$ELF`" `"$MergedObj`" `"$Boot2`" `"$Ota`" `"$MasterObj`" "
$LinkArgs += "-Wl,--start-group "
foreach ($a in $Archives) { $LinkArgs += "`"$a`" " }
$LinkArgs += "-lm -lc -lstdc++ -lc -Wl,--end-group -Wl,--allow-multiple-definition -Wl,--strip-all"

# Final cleaning to ensure NO multi-line breakage
$FinalLink = $LinkArgs -replace '[\r\n]', ' '
$FinalLink | Out-File "$BuildDir/fast_link.bat" -Encoding ascii
cmd /c "$BuildDir/fast_link.bat" 2>&1
if ($LASTEXITCODE -ne 0) { BuildFail "LINK ERR" }

$buildTimeEnd = Get-Date
$uploadStartTime = Get-Date # Initialize as DateTime

# 8. FLASH (WITH SMART WAIT & RETRY)
if ($BuildOnly) {
    Write-Host "`n>>> BUILD COMPLETE (BUILD-ONLY MODE)" -ForegroundColor Green
} else {
    if (!(Test-Path $ELF)) { BuildFail "ELF MISSING" }


$uploadStartTime = Get-Date
Write-Host ">>> WAITING FOR DEVICE... " -NoNewline -ForegroundColor Yellow
$success = $false
for ($i=0; $i -lt 15; $i++) {
    $out = & $PTool load $ELF 2>&1
    if ($LASTEXITCODE -eq 0) { 
        Write-Host "FOUND & FLASHED!" -ForegroundColor Green
        $success = $true
        # Start the program immediately
        & $PTool reboot | Out-Null
        break 
    }
    if ($out -match "No accessible" -or $out -match "unable to connect" -or $out -match "Forced commands") {
        Write-Host "." -NoNewline -ForegroundColor Yellow
        Start-Sleep -Milliseconds 300
    } else {
        Write-Host "ERR!" -ForegroundColor Red
        Write-Host $out
        BuildFail "FLASH_ERROR"
    }
}

    if (-not $success) { BuildFail "TIMEOUT" }
    & $PTool reboot
}

$endTime = Get-Date
$bDiff = [Math]::Round(($buildTimeEnd - $startTime).TotalSeconds, 2)
$uDiff = [Math]::Round(($endTime - $uploadStartTime).TotalSeconds, 2)
$tDiff = [Math]::Round(($endTime - $startTime).TotalSeconds, 2)

# Calculate Global Total Time if provided
$gTotalStr = ""
if ($GlobalStartTime -gt 0) {
    $nowMs = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    $gDiff = [Math]::Round(($nowMs - $GlobalStartTime) / 1000, 2)
    $gTotalStr = " TOTAL PROCESS: $gDiff s"
}

Write-Host "`n--------------------------------" -ForegroundColor Gray
Write-Host " BUILD TIME  : $bDiff s" -ForegroundColor Cyan
if (-not $BuildOnly) {
    Write-Host " UPLOAD TIME : $uDiff s" -ForegroundColor Cyan
}
Write-Host " NITRO TOTAL : $tDiff s" -ForegroundColor Cyan
if ($gTotalStr -ne "") {
    Write-Host "$gTotalStr" -ForegroundColor Green
}
Write-Host "--------------------------------" -ForegroundColor Gray

# SPECIAL TAG FOR IDE (DO NOT REMOVE)
$startupSec = 0
if ($GlobalStartTime -gt 0) {
    $startupSec = [Math]::Round(($startTime - [DateTimeOffset]::FromUnixTimeMilliseconds($GlobalStartTime).LocalDateTime).TotalSeconds, 2)
}
# Adjust discoverySec to be purely discovery within the script
Write-Host "[[TIMING: startup=$startupSec, discovery=$discoverySec, compile=$bDiff, upload=$uDiff, total=$tDiff]]"
