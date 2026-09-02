@echo off
title Restore Internet
net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
echo Turning off Torva routing, firewall, DNS, and proxy...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer /t REG_SZ /d "" /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v AutoConfigURL /t REG_SZ /d "" /f >nul
taskkill /F /IM tun2socks.exe >nul 2>&1
taskkill /F /IM tor.exe >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='SilentlyContinue';" ^
  "Get-NetFirewallRule | ? { $_.DisplayName -like 'Torva-*' } | Remove-NetFirewallRule;" ^
  "Set-NetFirewallProfile -Profile Domain,Public,Private -DefaultOutboundAction Allow;" ^
  "Get-DnsClientNrptRule | ? { $_.Comment -eq 'Torva' } | Remove-DnsClientNrptRule -Force;" ^
  "route delete 0.0.0.0 mask 128.0.0.0 | Out-Null;" ^
  "route delete 128.0.0.0 mask 128.0.0.0 | Out-Null;" ^
  "Get-NetAdapter | ? { $_.InterfaceDescription -match 'Wintun' -or $_.Name -match 'Torva|wintun' } | Disable-NetAdapter -Confirm:$false;" ^
  "ipconfig /flushdns | Out-Null;" ^
  "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W { [DllImport(\"wininet.dll\", SetLastError=true)] public static extern bool InternetSetOption(IntPtr h, int o, IntPtr b, int l); }'; [W]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null; [W]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null"
echo.
echo Internet should be back. Try a webpage.
pause
