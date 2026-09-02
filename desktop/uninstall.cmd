@echo off
title Uninstall Torva VPN
echo Stopping Torva and restoring your Windows proxy...
taskkill /F /IM Torva.exe >nul 2>&1
taskkill /F /IM tor.exe >nul 2>&1
taskkill /F /IM lyrebird.exe >nul 2>&1
taskkill /F /IM tun2socks.exe >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer /t REG_SZ /d "" /f >nul
del "%USERPROFILE%\Desktop\Torva VPN.lnk" >nul 2>&1
del "%USERPROFILE%\Desktop\Restore-Internet.bat" >nul 2>&1
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Torva VPN.lnk" >nul 2>&1
set "TARGET=%~dp0"
cd /d "%TEMP%"
echo Removing %TARGET%
timeout /t 1 /nobreak >nul
rmdir /s /q "%TARGET%"
echo Torva VPN has been removed.
pause
