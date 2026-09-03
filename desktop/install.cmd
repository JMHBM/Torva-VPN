@echo off
setlocal EnableExtensions
title Installing Torva VPN
set "LOG=%TEMP%\torva-install.log"
echo Torva install %DATE% %TIME% > "%LOG%"
set "DEST=%LOCALAPPDATA%\Programs\TorvaVPN"
set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"
echo DEST=%DEST% >> "%LOG%"
echo SRC=%SRC% >> "%LOG%"
mkdir "%DEST%" >> "%LOG%" 2>&1
if exist "%SystemRoot%\System32\robocopy.exe" (
  "%SystemRoot%\System32\robocopy.exe" "%SRC%" "%DEST%" /E /XD "%DEST%" /NFL /NDL /NJH /NJS /nc /ns /np >> "%LOG%" 2>&1
) else (
  xcopy /E /I /Y /Q "%SRC%\*" "%DEST%\" >> "%LOG%" 2>&1
)
if not exist "%DEST%\Torva.exe" (
  echo ERROR: Torva.exe missing after copy >> "%LOG%"
  notepad "%LOG%"
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$dest = $env:LOCALAPPDATA + '\Programs\TorvaVPN\Torva.exe';" ^
  "$wd = $env:LOCALAPPDATA + '\Programs\TorvaVPN';" ^
  "$ico = $wd + '\resources\icon.ico';" ^
  "$d = $ws.CreateShortcut($env:USERPROFILE + '\Desktop\Torva VPN.lnk'); $d.TargetPath=$dest; $d.WorkingDirectory=$wd; $d.IconLocation=$ico; $d.Description='Torva VPN'; $d.Save();" ^
  "$smDir = $env:APPDATA + '\Microsoft\Windows\Start Menu\Programs';" ^
  "$s = $ws.CreateShortcut($smDir + '\Torva VPN.lnk'); $s.TargetPath=$dest; $s.WorkingDirectory=$wd; $s.IconLocation=$ico; $s.Description='Torva VPN'; $s.Save();"
start "" /D "%DEST%" "%DEST%\Torva.exe"
endlocal
exit /b 0
