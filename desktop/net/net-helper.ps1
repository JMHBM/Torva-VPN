# Requires administrator. Always tears TUN / WFP / DNS down when Torva exits.
param(
  [Parameter(Mandatory = $true)][int]$WatchPid,
  [Parameter(Mandatory = $true)][string]$StateDir,
  [Parameter(Mandatory = $true)][string]$NetDir
)

$ErrorActionPreference = "Continue"
$TUN_IP = "10.18.85.2"
$TUN_GW = "10.18.85.1"
$TUN_MASK = "255.255.255.0"
$RulePrefix = "Torva-"
$argsPath = Join-Path $StateDir "net-args.json"
$readyPath = Join-Path $StateDir "tun-ready"
$logPath = Join-Path $StateDir "tun-helper.log"
$stopFile = Join-Path $StateDir "net-stop"
$hostsFile = Join-Path $StateDir "or-hosts.txt"
$t2sProc = $null
$adapterName = $null
$addedHostRoutes = New-Object System.Collections.Generic.HashSet[string]
$origProfiles = @()

function Log([string]$msg) {
  try { Add-Content -Path $logPath -Value ("{0} {1}" -f (Get-Date -Format o), $msg) -Encoding UTF8 } catch {}
}

$cfg = @{ AllowLan = "1"; KillSwitch = "1"; TorExe = ""; LyrebirdExe = ""; TorvaExe = "" }
if (Test-Path $argsPath) {
  try { $cfg = Get-Content -Raw $argsPath | ConvertFrom-Json } catch {}
}

function Teardown {
  Log "teardown start"
  try { if (Test-Path $readyPath) { Remove-Item $readyPath -Force } } catch {}
  try {
    Get-NetFirewallRule -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName -like "$RulePrefix*" } |
      Remove-NetFirewallRule -ErrorAction SilentlyContinue
  } catch {}
  foreach ($p in $origProfiles) {
    try { Set-NetFirewallProfile -Profile $p.Name -DefaultOutboundAction $p.Action -ErrorAction SilentlyContinue } catch {}
  }
  try {
    Get-DnsClientNrptRule -ErrorAction SilentlyContinue |
      Where-Object { $_.Comment -eq "Torva" } |
      Remove-DnsClientNrptRule -Force -ErrorAction SilentlyContinue
  } catch {}
  try { route delete 0.0.0.0 mask 128.0.0.0 | Out-Null } catch {}
  try { route delete 128.0.0.0 mask 128.0.0.0 | Out-Null } catch {}
  foreach ($ip in @($addedHostRoutes)) {
    try { route delete $ip mask 255.255.255.255 | Out-Null } catch {}
  }
  if ($t2sProc -and -not $t2sProc.HasExited) {
    try { Stop-Process -Id $t2sProc.Id -Force -ErrorAction SilentlyContinue } catch {}
  }
  Get-Process -Name "tun2socks","tun2socks-windows-amd64" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object {
    $_.InterfaceDescription -match "Wintun" -or $_.Name -match "Torva|wintun"
  } | ForEach-Object {
    try { Disable-NetAdapter -Name $_.Name -Confirm:$false -ErrorAction SilentlyContinue } catch {}
  }
  try {
    $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
    Set-ItemProperty -Path $path -Name ProxyEnable -Value 0 -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $path -Name ProxyServer -Value "" -ErrorAction SilentlyContinue
  } catch {}
  Log "teardown done"
}

try {
  New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
  Log "helper start watch=$WatchPid"

  $orig = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Sort-Object RouteMetric, InterfaceMetric |
    Select-Object -First 1
  if (-not $orig) { throw "no default route" }
  $origGw = $orig.NextHop
  $origIfName = (Get-NetAdapter -InterfaceIndex $orig.InterfaceIndex -ErrorAction SilentlyContinue).Name
  $origProfiles = @(Get-NetFirewallProfile | ForEach-Object {
      [pscustomobject]@{ Name = $_.Name; Action = $_.DefaultOutboundAction.ToString() }
    })

  function Add-HostRoute([string]$ip) {
    if (-not $ip) { return }
    if ($ip -notmatch '^\d{1,3}(\.\d{1,3}){3}$') { return }
    if ($ip -match '^(127\.|10\.18\.85\.|0\.|255\.)') { return }
    if ($addedHostRoutes.Contains($ip)) { return }
    route add $ip mask 255.255.255.255 $origGw metric 5 | Out-Null
    [void]$addedHostRoutes.Add($ip)
  }

  @(
    "128.31.0.39","45.66.35.11","131.188.40.189","193.23.244.244","171.25.193.9",
    "199.58.81.140","204.13.164.118","216.218.219.41","217.196.147.77",
    "23.129.64.214","86.59.21.38","154.35.175.225"
  ) | ForEach-Object { Add-HostRoute $_ }
  if (Test-Path $hostsFile) { Get-Content $hostsFile | ForEach-Object { Add-HostRoute $_.Trim() } }

  $t2s = Join-Path $NetDir "tun2socks.exe"
  if (-not (Test-Path $t2s)) { throw "tun2socks.exe missing" }
  $t2sProc = Start-Process -FilePath $t2s -ArgumentList @(
    "-device","tun://Torva",
    "-proxy","socks5://tun:torva@127.0.0.1:9050",
    "-interface",$origIfName,
    "-loglevel","warn",
    "-udp-timeout","15s"
  ) -WorkingDirectory $NetDir -WindowStyle Hidden -PassThru
  Log "tun2socks pid=$($t2sProc.Id)"
  Start-Sleep -Seconds 3

  $nic = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object {
    $_.InterfaceDescription -match "Wintun" -or $_.Name -match "Torva|wintun"
  } | Select-Object -First 1
  if (-not $nic) { throw "wintun adapter not found" }
  $adapterName = $nic.Name
  Log "adapter $adapterName"

  netsh interface ipv4 set address name="$adapterName" source=static addr=$TUN_IP mask=$TUN_MASK | Out-Null
  netsh interface ipv4 set dnsservers name="$adapterName" static address=127.0.0.1 register=none validate=no | Out-Null
  netsh interface ipv4 add route 0.0.0.0/1 "$adapterName" $TUN_GW metric=1 | Out-Null
  netsh interface ipv4 add route 128.0.0.0/1 "$adapterName" $TUN_GW metric=1 | Out-Null

  try { Add-DnsClientNrptRule -Namespace "." -NameServers "127.0.0.1" -Comment "Torva" -ErrorAction SilentlyContinue } catch {}

  New-NetFirewallRule -DisplayName "${RulePrefix}Block-DNS-UDP" -Direction Outbound -Action Block -Protocol UDP -RemotePort 53 -RemoteAddress Internet -Profile Any -ErrorAction SilentlyContinue | Out-Null
  New-NetFirewallRule -DisplayName "${RulePrefix}Block-DNS-TCP" -Direction Outbound -Action Block -Protocol TCP -RemotePort 53 -RemoteAddress Internet -Profile Any -ErrorAction SilentlyContinue | Out-Null
  New-NetFirewallRule -DisplayName "${RulePrefix}Allow-Loopback" -Direction Outbound -Action Allow -RemoteAddress 127.0.0.0/8 -Profile Any -ErrorAction SilentlyContinue | Out-Null
  New-NetFirewallRule -DisplayName "${RulePrefix}Allow-DHCP" -Direction Outbound -Action Allow -Protocol UDP -RemotePort 67,68 -Profile Any -ErrorAction SilentlyContinue | Out-Null
  New-NetFirewallRule -DisplayName "${RulePrefix}Allow-T2S" -Direction Outbound -Action Allow -Program $t2s -Profile Any -ErrorAction SilentlyContinue | Out-Null
  if ($cfg.TorExe) { New-NetFirewallRule -DisplayName "${RulePrefix}Allow-Tor" -Direction Outbound -Action Allow -Program $cfg.TorExe -Profile Any -ErrorAction SilentlyContinue | Out-Null }
  if ($cfg.LyrebirdExe) { New-NetFirewallRule -DisplayName "${RulePrefix}Allow-PT" -Direction Outbound -Action Allow -Program $cfg.LyrebirdExe -Profile Any -ErrorAction SilentlyContinue | Out-Null }
  if ($cfg.TorvaExe) { New-NetFirewallRule -DisplayName "${RulePrefix}Allow-App" -Direction Outbound -Action Allow -Program $cfg.TorvaExe -Profile Any -ErrorAction SilentlyContinue | Out-Null }
  if ([string]$cfg.AllowLan -ne "0") {
    New-NetFirewallRule -DisplayName "${RulePrefix}Allow-LAN" -Direction Outbound -Action Allow -RemoteAddress LocalSubnet -Profile Any -ErrorAction SilentlyContinue | Out-Null
  }
  if ([string]$cfg.KillSwitch -ne "0") {
    Set-NetFirewallProfile -Profile Domain,Public,Private -DefaultOutboundAction Block -ErrorAction SilentlyContinue
    Log "WFP default outbound block"
  }

  try {
    $code = @'
using System;
using System.Net;
using System.Net.Sockets;
using System.Threading;
public class TorvaDnsRelay {
  public static void Run() {
    var listen = new UdpClient(new IPEndPoint(IPAddress.Loopback, 53));
    var tor = new IPEndPoint(IPAddress.Loopback, 9053);
    while (true) {
      IPEndPoint src = new IPEndPoint(IPAddress.Any, 0);
      byte[] q = listen.Receive(ref src);
      try {
        using (var c = new UdpClient()) {
          c.Client.ReceiveTimeout = 4000;
          c.Send(q, q.Length, tor);
          IPEndPoint from = new IPEndPoint(IPAddress.Any, 0);
          byte[] a = c.Receive(ref from);
          listen.Send(a, a.Length, src);
        }
      } catch {}
    }
  }
}
'@
    Add-Type -TypeDefinition $code -ErrorAction Stop
    $rs = [runspacefactory]::CreateRunspace()
    $rs.Open()
    $ps = [powershell]::Create()
    $ps.Runspace = $rs
    [void]$ps.AddScript("[TorvaDnsRelay]::Run()")
    [void]$ps.BeginInvoke()
    Log "dns relay 53 -> 9053"
  } catch { Log "dns relay failed $_" }

  Set-Content -Path $readyPath -Value "tun" -Encoding ASCII
  Log "ready"

  while ($true) {
    if (Test-Path $stopFile) { Log "stop file"; break }
    if (-not (Get-Process -Id $WatchPid -ErrorAction SilentlyContinue)) { Log "parent gone"; break }
    if ($t2sProc.HasExited) { Log "tun2socks exited"; break }
    if (Test-Path $hostsFile) { Get-Content $hostsFile -ErrorAction SilentlyContinue | ForEach-Object { Add-HostRoute $_.Trim() } }
    Start-Sleep -Seconds 2
  }
}
catch {
  Log "error $_"
}
finally {
  Teardown
}
