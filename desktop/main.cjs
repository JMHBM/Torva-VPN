"use strict";

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  Notification,
  shell,
} = require("electron");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { ProxyBridge, fetchThroughSocks } = require("./proxy.cjs");

const SOCKS = 9050;
const CONTROL = 9051;
const HTTP_TUNNEL = 9080;
const APP_ID = "com.torva.vpn";

function runningFromSfxTemp() {
  const p = String(process.execPath || "").replace(/\//g, "\\").toLowerCase();
  return p.includes("\\temp\\") || p.includes("\\tmp\\") || /\\7z[a-z0-9._-]*\\/i.test(p);
}

function isStorePackage() {
  const p = String(process.execPath || "").replace(/\//g, "\\").toLowerCase();
  return Boolean(process.windowsStore) || p.includes("\\windowsapps\\") || Boolean(process.env.APPX_PACKAGE_FULL_NAME);
}

app.setName("Torva VPN");
if (!isStorePackage()) {
  app.setAppUserModelId(APP_ID);
}

if (!runningFromSfxTemp()) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
  }
  app.on("second-instance", () => {
    if (!win) return;
    win.show();
    win.focus();
  });
}

let win = null;
let tray = null;
let torProc = null;
let control = null;
let lastConfig = null;
let shuttingDown = false;
let proxyArmed = false;
let watchdogStarted = false;
let restoring = false;
let tunActive = false;
const listeners = new Set();
const bridge = new ProxyBridge();

const COUNTRY_NAMES = {
  us: "United States",
  de: "Germany",
  nl: "Netherlands",
  se: "Sweden",
  ch: "Switzerland",
  at: "Austria",
  fr: "France",
  gb: "United Kingdom",
  ca: "Canada",
  fi: "Finland",
  no: "Norway",
  dk: "Denmark",
  is: "Iceland",
  pl: "Poland",
  ro: "Romania",
  cz: "Czechia",
  es: "Spain",
  it: "Italy",
  be: "Belgium",
  lu: "Luxembourg",
  ie: "Ireland",
  pt: "Portugal",
  jp: "Japan",
  sg: "Singapore",
  au: "Australia",
  nz: "New Zealand",
  br: "Brazil",
  ua: "Ukraine",
  lt: "Lithuania",
  lv: "Latvia",
  ee: "Estonia",
  bg: "Bulgaria",
  hu: "Hungary",
  md: "Moldova",
};

function res(...parts) {
  return path.join(process.resourcesPath, ...parts);
}

function userDir(...parts) {
  return path.join(app.getPath("userData"), ...parts);
}

function send(event) {
  const seen = new Set();
  const push = (wc) => {
    if (!wc || wc.isDestroyed() || seen.has(wc)) return;
    seen.add(wc);
    wc.send("tor:event", event);
  };
  for (const wc of listeners) push(wc);
  if (win) push(win.webContents);
}

function notify(title, body) {
  if (!Notification.isSupported()) return;
  if (lastConfig && lastConfig.settings && lastConfig.settings.notifications === false) {
    return;
  }
  new Notification({ title, body }).show();
}

function quote(p) {
  return `"${String(p).replace(/\//g, "\\").replace(/\\/g, "\\\\")}"`;
}

function isPlaceholderBridges(text) {
  return /198\.51\.100\.|203\.0\.113\./.test(text || "");
}

function loadPtConfig() {
  const p = res("tor", "pt_config.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function writeTorrc(config) {
  const dataDir = userDir("tordata");
  fs.mkdirSync(dataDir, { recursive: true });
  const torDir = res("tor");
  const lyrebird = path.join(torDir, "lyrebird.exe");
  const geoip = path.join(torDir, "geoip");
  const geoip6 = path.join(torDir, "geoip6");
  const cookie = path.join(dataDir, "control_auth_cookie");
  const s = config.settings;
  const routing = config.routing || "standard";
  const useBridges = Boolean(config.bridgesEnabled) || routing !== "standard";
  if (!fs.existsSync(geoip) || !fs.existsSync(geoip6)) {
    throw new Error("geoip databases missing from the Tor bundle");
  }
  if (useBridges && !fs.existsSync(lyrebird)) {
    throw new Error("lyrebird.exe missing — cannot start bridges");
  }
  const pt = loadPtConfig();
  const lines = [
    `DataDirectory ${quote(dataDir)}`,
    `GeoIPFile ${quote(geoip)}`,
    `GeoIPv6File ${quote(geoip6)}`,
    "SocksPort 127.0.0.1:9050 IsolateDestAddr IsolateDestPort IsolateSOCKSAuth IsolateClientProtocol",
    "SocksPort 127.0.0.1:9052 IsolateDestAddr IsolateSOCKSAuth IsolateClientProtocol",
    "HTTPTunnelPort 127.0.0.1:9080",
    "DNSPort 127.0.0.1:9053",
    "AutomapHostsOnResolve 1",
    "ControlPort 127.0.0.1:9051",
    "CookieAuthentication 1",
    `CookieAuthFile ${quote(cookie)}`,
    "AvoidDiskWrites 1",
    "SafeLogging 1",
    "ClientOnly 1",
    "ClientRejectInternalAddresses 1",
    "Log notice stdout",
    "Log warn stderr",
    `__OwningControllerProcess ${process.pid}`,
    s.useEntryGuards ? "UseEntryGuards 1" : "UseEntryGuards 0",
    s.useEntryGuards ? `NumEntryGuards ${s.numEntryGuards || 3}` : null,
    `NewCircuitPeriod ${Math.max(1, s.newCircuitMinutes) * 60}`,
    `MaxCircuitDirtiness ${Math.max(1, s.maxCircuitDirtiness) * 60}`,
    s.ipv6 ? "ClientUseIPv6 1" : "ClientUseIPv6 0",
    s.strictNodes ? "StrictNodes 1" : "StrictNodes 0",
    config.selectedExitCountry && config.selectedExitCountry !== "auto"
      ? `ExitNodes {${config.selectedExitCountry.toLowerCase()}}`
      : null,
    config.excludedCountries && config.excludedCountries.length
      ? `ExcludeNodes ${config.excludedCountries.map((c) => `{${c.toLowerCase()}}`).join(",")}`
      : null,
  ];

  if (useBridges) {
    lines.push(`ClientTransportPlugin meek_lite,obfs4,webtunnel,snowflake exec ${quote(lyrebird)}`);
    lines.push("UseBridges 1");
    let bridgeText = config.bridgeLines || "";
    if (!bridgeText.trim() || isPlaceholderBridges(bridgeText)) {
      const key =
        routing === "standard"
          ? (pt && pt.recommendedDefault) || "obfs4"
          : routing === "meek"
            ? "meek"
            : routing;
      const list = (pt && pt.bridges && pt.bridges[key]) || [];
      bridgeText = list.join("\n");
    }
    for (const raw of bridgeText.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      lines.push(line.toLowerCase().startsWith("bridge ") ? line : `Bridge ${line}`);
    }
  } else {
    lines.push("UseBridges 0");
  }

  const body = lines.filter((x) => x !== null && x !== undefined).join("\n") + "\n";
  const torrc = path.join(dataDir, "torrc");
  fs.writeFileSync(torrc, body, "utf8");
  return { torrc, dataDir, cookie };
}

function runPs(script) {
  return new Promise((resolve) => {
    if (process.platform !== "win32") {
      resolve({ ok: false, out: "not windows" });
      return;
    }
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true },
    );
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      out += d.toString();
    });
    child.on("exit", (code) => resolve({ ok: code === 0, out }));
    child.on("error", (err) => resolve({ ok: false, out: String(err) }));
  });
}

function runPsSync(script) {
  if (process.platform !== "win32") return { ok: true, out: "" };
  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { windowsHide: true, encoding: "utf8", timeout: 15000 },
  );
  return { ok: r.status === 0, out: `${r.stdout || ""}${r.stderr || ""}` };
}

function isTorvaProxyServer(server) {
  const s = String(server || "").toLowerCase();
  return (
    s.includes("127.0.0.1:8118") ||
    s.includes("127.0.0.1:9080") ||
    s.includes("127.0.0.1:9050") ||
    s.includes("socks=127.0.0.1")
  );
}

function flushDns() {
  if (process.platform !== "win32") return;
  try {
    spawnSync("ipconfig.exe", ["/flushdns"], { windowsHide: true, timeout: 8000 });
  } catch {
    /* ignore */
  }
}

function readWinInetProxy() {
  const r = runPsSync(`
    $p = Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
    @{ enable = [int]$p.ProxyEnable; server = [string]$p.ProxyServer; override = [string]$p.ProxyOverride } | ConvertTo-Json -Compress
  `);
  try {
    return JSON.parse((r.out || "").trim().split("\n").pop() || "{}");
  } catch {
    return { enable: 0, server: "", override: "" };
  }
}

const PROXY_BACKUP = () => userDir("proxy-backup.json");

function originalProxy() {
  try {
    const raw = JSON.parse(fs.readFileSync(PROXY_BACKUP(), "utf8"));
    const server = String(raw.server || "");
    if (isTorvaProxyServer(raw.server)) return { enable: 0, server: "", override: "" };
    return {
      enable: Number(raw.enable) || 0,
      server,
      override: String(raw.override || ""),
    };
  } catch {
    return { enable: 0, server: "", override: "" };
  }
}

async function captureProxy() {
  if (fs.existsSync(PROXY_BACKUP())) return;
  const r = await runPs(`
    $p = Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
    @{ enable = [int]$p.ProxyEnable; server = [string]$p.ProxyServer; override = [string]$p.ProxyOverride } | ConvertTo-Json -Compress
  `);
  try {
    const parsed = JSON.parse(r.out.trim().split("\n").pop() || "{}");
    if (isTorvaProxyServer(parsed.server)) {
      parsed.enable = 0;
      parsed.server = "";
    }
    fs.mkdirSync(userDir(), { recursive: true });
    fs.writeFileSync(PROXY_BACKUP(), JSON.stringify(parsed), "utf8");
  } catch {
    /* ignore */
  }
}

function refreshWinInetSync() {
  return runPsSync(`
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class TorvaWinINet {
  [DllImport("wininet.dll", SetLastError=true)]
  public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
}
"@
    [TorvaWinINet]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null
    [TorvaWinINet]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null
  `);
}

function refreshWinInet() {
  return runPs(`
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class TorvaWinINet {
  [DllImport("wininet.dll", SetLastError=true)]
  public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
}
"@
    [TorvaWinINet]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null
    [TorvaWinINet]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null
  `);
}

function applyProxySync(enable, server, override) {
  const srv = String(server || "").replace(/'/g, "''");
  const ov = String(override || "").replace(/'/g, "''");
  runPsSync(`
    $path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
    Set-ItemProperty -Path $path -Name ProxyEnable -Value ${Number(enable) ? 1 : 0}
    Set-ItemProperty -Path $path -Name ProxyServer -Value '${srv}'
    Set-ItemProperty -Path $path -Name ProxyOverride -Value '${ov}'
    Set-ItemProperty -Path $path -Name AutoConfigURL -Value ''
  `);
  refreshWinInetSync();
}

function startWatchdog() {
  if (watchdogStarted || process.platform !== "win32") return;
  watchdogStarted = true;
  const script = userDir("watchdog.ps1");
  fs.mkdirSync(userDir(), { recursive: true });
  fs.writeFileSync(
    script,
    `param($WatchPid, $BackupPath)
while (Get-Process -Id $WatchPid -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 2 }
$enable = 0; $server = ''; $override = ''
if (Test-Path $BackupPath) {
  try {
    $b = Get-Content -Raw $BackupPath | ConvertFrom-Json
    $enable = [int]$b.enable
    $server = [string]$b.server
    $override = [string]$b.override
  } catch {}
}
if ($server -match '127\\.0\\.0\\.1:(8118|9080|9050)' -or $server -match 'socks=127\\.0\\.0\\.1') { $enable = 0; $server = '' }
$path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
Set-ItemProperty -Path $path -Name ProxyEnable -Value $enable
Set-ItemProperty -Path $path -Name ProxyServer -Value $server
Set-ItemProperty -Path $path -Name ProxyOverride -Value $override
Set-ItemProperty -Path $path -Name AutoConfigURL -Value ''
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class TorvaWinINet {
  [DllImport("wininet.dll", SetLastError=true)]
  public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
}
"@
[TorvaWinINet]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null
[TorvaWinINet]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null
`,
    "utf8",
  );
  const child = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      script,
      "-WatchPid",
      String(process.pid),
      "-BackupPath",
      PROXY_BACKUP(),
    ],
    { detached: true, stdio: "ignore", windowsHide: true },
  );
  child.unref();
}

function orHostsPath() {
  return userDir("or-hosts.txt");
}

function tunReadyPath() {
  return userDir("tun-ready");
}

function netStopPath() {
  return userDir("net-stop");
}

function appendOrHost(ip) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) return;
  if (ip.startsWith("127.") || ip.startsWith("10.18.85.")) return;
  try {
    fs.appendFileSync(orHostsPath(), `${ip}\n`);
  } catch {
    /* ignore */
  }
}

function startNetHelper(config) {
  if (process.platform !== "win32") return false;
  if (config && config.settings && config.settings.systemTun === false) return false;
  const helper = res("net", "net-helper.ps1");
  if (!fs.existsSync(helper)) return false;
  try {
    fs.unlinkSync(netStopPath());
  } catch {
    /* ignore */
  }
  try {
    fs.unlinkSync(tunReadyPath());
  } catch {
    /* ignore */
  }
  fs.mkdirSync(userDir(), { recursive: true });
  fs.writeFileSync(
    userDir("net-args.json"),
    JSON.stringify({
      AllowLan: config.killSwitch && config.killSwitch.allowLan === false ? "0" : "1",
      KillSwitch: config.killSwitch && config.killSwitch.enabled === false ? "0" : "1",
      TorExe: res("tor", "tor.exe"),
      LyrebirdExe: res("tor", "lyrebird.exe"),
      TorvaExe: process.execPath,
    }),
    "utf8",
  );
  const argList = `-NoProfile -ExecutionPolicy Bypass -File "${helper}" -WatchPid ${process.pid} -StateDir "${userDir()}" -NetDir "${res("net")}"`;
  spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Start-Process -FilePath powershell.exe -Verb RunAs -WindowStyle Hidden -ArgumentList '${argList.replace(/'/g, "''")}'`,
    ],
    { windowsHide: true, stdio: "ignore" },
  );
  return true;
}

function stopNetHelper() {
  try {
    fs.writeFileSync(netStopPath(), "1");
  } catch {
    /* ignore */
  }
}

async function waitForTun(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (fs.existsSync(tunReadyPath())) return true;
    await new Promise((r) => setTimeout(r, 350));
  }
  return false;
}

function runtimePath() {
  return userDir("runtime.json");
}

function saveRuntime(state) {
  try {
    fs.mkdirSync(userDir(), { recursive: true });
    let prev = {};
    try {
      prev = JSON.parse(fs.readFileSync(runtimePath(), "utf8"));
    } catch {
      /* ignore */
    }
    fs.writeFileSync(runtimePath(), JSON.stringify({ ...prev, ...state }), "utf8");
  } catch {
    /* ignore */
  }
}

function readRuntime() {
  try {
    return JSON.parse(fs.readFileSync(runtimePath(), "utf8"));
  } catch {
    return {};
  }
}

async function setSystemProxy() {
  await captureProxy();
  const r = await runPs(`
    $path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
    Set-ItemProperty -Path $path -Name ProxyEnable -Value 1
    Set-ItemProperty -Path $path -Name ProxyServer -Value 'http=127.0.0.1:${HTTP_TUNNEL};https=127.0.0.1:${HTTP_TUNNEL}'
    Set-ItemProperty -Path $path -Name ProxyOverride -Value 'localhost;127.0.0.1;<local>'
    Set-ItemProperty -Path $path -Name AutoConfigURL -Value ''
  `);
  await refreshWinInet();
  proxyArmed = r.ok;
  fs.mkdirSync(userDir(), { recursive: true });
  fs.writeFileSync(userDir("proxy-armed"), "1");
  saveRuntime({ proxyArmed: true, failClosed: false });
  startWatchdog();
  return r.ok;
}

function restoreProxySync() {
  if (restoring) return;
  const cur = process.platform === "win32" ? readWinInetProxy() : {};
  const leftover = isTorvaProxyServer(cur.server);
  const armed = proxyArmed || fs.existsSync(userDir("proxy-armed"));
  const hasBackup = fs.existsSync(PROXY_BACKUP());
  if (!armed && !hasBackup && !leftover) return;
  restoring = true;
  try {
    const orig = originalProxy();
    applyProxySync(orig.enable, orig.server, orig.override);
    flushDns();
    proxyArmed = false;
    try {
      fs.unlinkSync(userDir("proxy-armed"));
    } catch {
      /* ignore */
    }
    saveRuntime({ proxyArmed: false, failClosed: false });
  } finally {
    restoring = false;
  }
}

async function restoreProxy() {
  restoreProxySync();
}

async function ensureBridge() {
  const port = await bridge.listen(8118);
  bridge.allowLan = !lastConfig || !lastConfig.killSwitch || lastConfig.killSwitch.allowLan !== false;
  bridge.isolate = !lastConfig || !lastConfig.settings || lastConfig.settings.isolateDestinations !== false;
  return port;
}

function killSwitchOn() {
  return Boolean(lastConfig && lastConfig.killSwitch && lastConfig.killSwitch.enabled);
}

async function verifyExitIp() {
  try {
    const body = await fetchThroughSocks("check.torproject.org", "/api/ip", { timeoutMs: 18000 });
    const json = JSON.parse(body.replace(/^[^{]+/, "").trim());
    if (json && json.IP) {
      send({
        type: "log",
        level: json.IsTor ? "notice" : "warn",
        message: json.IsTor
          ? `Tor check passed — public IP ${json.IP}`
          : `Tor check: ${json.IP} (IsTor=${json.IsTor})`,
      });
      send({ type: "exitip", ip: String(json.IP) });
    }
  } catch (err) {
    send({ type: "log", level: "warn", message: `Tor check skipped (${err.message || err})` });
  }
}

async function maybeRestoreProxyOnLaunch() {
  const runtime = readRuntime();
  const current = readWinInetProxy();
  const leftover = isTorvaProxyServer(current.server) && Number(current.enable) === 1;
  const armed = runtime.proxyArmed || fs.existsSync(userDir("proxy-armed")) || leftover;
  if (!armed) return;
  restoreProxySync();
  send({ type: "log", level: "warn", message: "Restored Windows proxy after a previous session" });
}

class ControlClient {
  constructor() {
    this.socket = null;
    this.buf = "";
    this.queue = [];
    this.handler = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const socket = net.connect({ host: "127.0.0.1", port: CONTROL });
      this.socket = socket;
      socket.setEncoding("utf8");
      socket.on("data", (chunk) => this._onData(chunk));
      socket.once("error", reject);
      socket.once("connect", () => resolve());
      socket.on("close", () => {
        this.socket = null;
      });
    });
  }

  _onData(chunk) {
    this.buf += chunk;
    while (true) {
      const idx = this.buf.indexOf("\r\n");
      if (idx < 0) break;
      const line = this.buf.slice(0, idx);
      this.buf = this.buf.slice(idx + 2);
      if (line.startsWith("650 ")) this._event(line.slice(4));
      else if (this.handler) this.handler(line);
    }
  }

  _event(body) {
    if (body.startsWith("STATUS_CLIENT")) {
      const m = /BOOTSTRAP PROGRESS=(\d+).*SUMMARY="([^"]*)"/.exec(body);
      if (m) send({ type: "bootstrap", progress: Number(m[1]), summary: m[2] });
    }
    if (body.startsWith("CIRC ") && /\sBUILT\s/.test(body)) {
      void this.emitCircuit();
    }
    if (body.startsWith("ORCONN ")) {
      const m = /(\d{1,3}(?:\.\d{1,3}){3})/.exec(body);
      if (m) appendOrHost(m[1]);
    }
    if (body.startsWith("BW ")) {
      const p = body.split(" ");
      const read = Number(p[1] || 0);
      const written = Number(p[2] || 0);
      send({ type: "stats", bytesUp: written, bytesDown: read });
    }
  }

  command(cmd) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("control port closed"));
        return;
      }
      const lines = [];
      this.handler = (line) => {
        lines.push(line);
        if (/^\d{3} /.test(line) && line[3] === " ") {
          this.handler = null;
          const code = line.slice(0, 3);
          if (code.startsWith("2") || code.startsWith("6")) resolve(lines);
          else reject(new Error(lines.join("\n")));
        }
      };
      this.socket.write(cmd + "\r\n");
    });
  }

  async authenticate(cookiePath) {
    const raw = fs.readFileSync(cookiePath);
    const hex = Buffer.from(raw).toString("hex");
    await this.command(`AUTHENTICATE ${hex}`);
    await this.command("SETEVENTS STATUS_CLIENT CIRC BW ORCONN");
  }

  async emitCircuit() {
    try {
      const lines = await this.command("GETINFO circuit-status");
      const hops = await parseBestCircuit(this, lines);
      if (hops && hops.length >= 3) send({ type: "circuit", hops });
    } catch {
      /* ignore */
    }
  }
}

async function parseBestCircuit(ctl, lines) {
  const text = lines.join("\n");
  const circs = [];
  for (const line of text.split(/\n/)) {
    const m = /^\d*\+?(\d+)\s+BUILT\s+(\S+)/.exec(line.replace(/^250[+\- ]/, ""));
    if (!m) continue;
    if (/BUILD_FLAGS=\S*IS_INTERNAL/.test(line)) continue;
    if (/PURPOSE=HS_/.test(line)) continue;
    circs.push(m[2]);
  }
  const path = circs[circs.length - 1];
  if (!path) return null;
  const hops = [];
  for (const hop of path.split(",")) {
    const fp = hop.replace(/^\$/, "").split("~")[0].split("=")[0];
    const nick = (hop.split("~")[1] || "").split(" ")[0] || fp.slice(0, 8);
    let address = "";
    let country = "";
    try {
      const addrLines = await ctl.command(`GETINFO ns/id/${fp}`);
      const blob = addrLines.join("\n");
      const rm = /\br (\S+) (\S+) (\d+)/.exec(blob);
      if (rm) address = rm[2];
    } catch {
      /* ignore */
    }
    if (address) {
      try {
        const cLines = await ctl.command(`GETINFO ip-to-country/${address}`);
        const cm = /=([a-z]{2})/i.exec(cLines.join("\n"));
        if (cm) country = cm[1].toLowerCase();
      } catch {
        /* ignore */
      }
    }
    hops.push({
      fingerprint: fp,
      nickname: nick,
      address: address || "0.0.0.0",
      country: country || "??",
      countryName: COUNTRY_NAMES[country] || country.toUpperCase() || "Unknown",
    });
  }
  return hops;
}

function waitForPort(port, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.connect({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error("Tor control port did not open"));
        else setTimeout(tryOnce, 200);
      });
    };
    tryOnce();
  });
}

function emitTorLine(line) {
  const text = String(line).trim();
  if (!text) return;
  const boot = /Bootstrapped (\d{1,3})% \(([^)]+)\): (.+)/i.exec(text);
  if (boot) {
    send({ type: "bootstrap", progress: Number(boot[1]), summary: boot[3] });
    send({ type: "log", level: "notice", message: text });
    return;
  }
  const level = /\[(err|warn|notice|info|debug)\]/i.exec(text);
  const lv = (level && level[1].toLowerCase()) || "info";
  send({
    type: "log",
    level: lv === "err" ? "warn" : lv === "debug" ? "info" : lv,
    message: text,
  });
}

function waitForControlOrExit(proc, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      proc.off("error", onErr);
      proc.off("exit", onExit);
      fn(arg);
    };
    const onErr = (err) => finish(reject, err);
    const onExit = (code) =>
      finish(reject, new Error(`Tor exited before connecting (code ${code ?? "?"})`));
    proc.once("error", onErr);
    proc.once("exit", onExit);
    waitForPort(CONTROL, timeoutMs).then(
      () => finish(resolve),
      (err) => finish(reject, err),
    );
  });
}

async function startTor(config) {
  lastConfig = config;
  await stopTor(false);
  shuttingDown = false;
  try {
    await ensureBridge();
    const { torrc, cookie } = writeTorrc(config);
    const torExe = res("tor", "tor.exe");
    if (!fs.existsSync(torExe)) {
      throw new Error(`tor.exe missing at ${torExe}`);
    }
    send({ type: "log", level: "notice", message: `Launching ${torExe}` });
    send({ type: "log", level: "info", message: `torrc ${torrc}` });
    send({ type: "status", status: "connecting", label: "Starting" });
    send({ type: "bootstrap", progress: 0, summary: "Starting" });
    torProc = spawn(torExe, ["-f", torrc], {
      cwd: path.dirname(torExe),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    torProc.stdout.on("data", (d) => {
      for (const line of d.toString().split(/\r?\n/)) emitTorLine(line);
    });
    torProc.stderr.on("data", (d) => {
      for (const line of d.toString().split(/\r?\n/)) emitTorLine(line);
    });
    torProc.on("exit", (code) => {
      const proc = torProc;
      torProc = null;
      if (!shuttingDown && proc) {
        send({ type: "error", message: `Tor exited (${code ?? "?"})` });
        if (killSwitchOn() && (proxyArmed || tunActive)) {
          bridge.setMode("block");
          send({ type: "status", status: "blocked", label: "Kill switch engaged" });
        } else {
          restoreProxySync();
        }
      }
    });
    await waitForControlOrExit(torProc, 25000);
    let tries = 0;
    while (!fs.existsSync(cookie) && tries < 50) {
      await new Promise((r) => setTimeout(r, 100));
      tries += 1;
    }
    control = new ControlClient();
    await control.connect();
    await control.authenticate(cookie);
    send({ type: "log", level: "notice", message: "Authenticated to the control port" });

    const useBridges = Boolean(config.bridgesEnabled) || (config.routing && config.routing !== "standard");
    const deadline = Date.now() + (useBridges ? 90000 : 60000);
    let progress = 0;
    while (Date.now() < deadline) {
      try {
        const info = await control.command("GETINFO status/bootstrap-phase");
        const blob = info.join(" ");
        const m = /PROGRESS=(\d+)/.exec(blob);
        const s = /SUMMARY="([^"]*)"/.exec(blob);
        progress = m ? Number(m[1]) : progress;
        if (s) send({ type: "bootstrap", progress, summary: s[1] });
        if (progress >= 100) break;
      } catch {
        /* keep waiting */
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    if (progress < 100) {
      throw new Error(`Tor bootstrap timed out at ${progress}% — proxy was not changed`);
    }

    await waitForPort(SOCKS, 8000);
    await waitForPort(HTTP_TUNNEL, 8000);
    bridge.setMode("tor");
    let hops = null;
    for (let i = 0; i < 10; i += 1) {
      try {
        hops = await parseBestCircuit(control, await control.command("GETINFO circuit-status"));
      } catch {
        hops = null;
      }
      if (hops && hops.length >= 3) break;
      await new Promise((r) => setTimeout(r, 400));
    }

    tunActive = false;
    const askedTun = startNetHelper(config);
    if (askedTun) {
      send({
        type: "log",
        level: "notice",
        message: "Requesting administrator for Wintun / WFP (UDP + DNS leak shield)",
      });
      tunActive = await waitForTun(22000);
    }
    if (tunActive) {
      send({ type: "path", path: "tun" });
      send({
        type: "log",
        level: "notice",
        message: "System TUN up. TCP through Tor. UDP dropped except DNS over Tor DNSPort.",
      });
      startWatchdog();
    } else {
      send({ type: "path", path: "proxy" });
      const proxyOk = await setSystemProxy();
      send({
        type: "log",
        level: proxyOk ? "notice" : "warn",
        message: proxyOk
          ? `Proxy mode: Windows → HTTP 127.0.0.1:${HTTP_TUNNEL} (Tor HTTPTunnelPort)`
          : "Could not set system proxy — point apps at 127.0.0.1:9052",
      });
    }
    saveRuntime({ everConnected: true, proxyArmed, tunActive, failClosed: false });
    send({ type: "connected", hops: hops && hops.length ? hops : [] });
    send({ type: "status", status: "connected", label: "Done" });
    notify("Torva VPN", tunActive ? "Connected · system TUN" : "Connected · proxy");
    void verifyExitIp();
  } catch (err) {
    send({ type: "error", message: String(err.message || err) });
    stopNetHelper();
    tunActive = false;
    if (killSwitchOn() && proxyArmed) {
      bridge.setMode("block");
      send({ type: "status", status: "blocked", label: "Kill switch engaged" });
    } else {
      bridge.setMode("off");
      restoreProxySync();
    }
    throw err;
  }
}

async function stopTor(fromUser) {
  shuttingDown = true;
  const stayClosed = Boolean(
    fromUser && killSwitchOn() && !app.isQuitting && (proxyArmed || tunActive),
  );
  if (stayClosed) {
    try {
      await ensureBridge();
      bridge.setMode("block");
    } catch {
      /* ignore */
    }
  }
  try {
    if (control && control.socket) {
      try {
        await control.command("SIGNAL SHUTDOWN");
      } catch {
        /* ignore */
      }
      try {
        control.socket.end();
      } catch {
        /* ignore */
      }
    }
  } finally {
    control = null;
  }
  if (torProc) {
    try {
      torProc.kill();
    } catch {
      /* ignore */
    }
    torProc = null;
  }
  if (stayClosed) {
    saveRuntime({ proxyArmed, tunActive, failClosed: false });
  } else {
    bridge.setMode("off");
    stopNetHelper();
    tunActive = false;
    restoreProxySync();
  }
  shuttingDown = false;
  if (fromUser) {
    send({
      type: "status",
      status: stayClosed ? "blocked" : "disconnected",
      label: stayClosed ? "Kill switch engaged" : "Disconnected",
    });
    send({
      type: "log",
      level: stayClosed ? "warn" : "notice",
      message: stayClosed ? "Disconnected — kill switch is blocking traffic" : "Tor stopped",
    });
  }
}

function iconImage() {
  const ico = res("icon.ico");
  const png = res("icon.png");
  if (fs.existsSync(ico)) return nativeImage.createFromPath(ico);
  if (fs.existsSync(png)) return nativeImage.createFromPath(png);
  return nativeImage.createEmpty();
}

function createTray() {
  const img = iconImage();
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setToolTip("Torva VPN");
  const menu = Menu.buildFromTemplate([
    {
      label: "Show window",
      click: () => {
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    {
      label: "Connect",
      click: () => {
        if (lastConfig) void startTor(lastConfig);
        else if (win) win.webContents.send("tor:event", { type: "log", level: "info", message: "Open the window to connect" });
      },
    },
    { label: "Disconnect", click: () => void stopTor(true) },
    { type: "separator" },
    {
      label: "Quit Torva",
      click: () => {
        void quitApp();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => {
    if (!win) return;
    if (win.isVisible()) win.hide();
    else {
      win.show();
      win.focus();
    }
  });
}

function writeShortcuts() {
  try {
    const exe = process.execPath;
    writeAppShortcuts(exe);
  } catch {
    /* ignore */
  }
}

function installDir() {
  const local = process.env.LOCALAPPDATA || app.getPath("appData");
  return path.join(local, "Programs", "TorvaVPN");
}

function writeAppShortcuts(exe) {
  if (process.platform !== "win32") return;
  if (isStorePackage()) return;
  const dir = path.dirname(exe);
  const icon = fs.existsSync(path.join(dir, "resources", "icon.ico"))
    ? path.join(dir, "resources", "icon.ico")
    : res("icon.ico");
  const opts = {
    target: exe,
    cwd: dir,
    description: "Torva VPN",
    icon,
    iconIndex: 0,
  };
  const desktop = path.join(app.getPath("desktop"), "Torva VPN.lnk");
  const startMenu = path.join(
    app.getPath("appData"),
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Torva VPN.lnk",
  );
  shell.writeShortcutLink(desktop, opts);
  shell.writeShortcutLink(startMenu, opts);
}

function copyInstallTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const robocopy = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "robocopy.exe");
  if (fs.existsSync(robocopy)) {
    const r = spawnSync(
      robocopy,
      [src, dest, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP"],
      { windowsHide: true, timeout: 180000 },
    );
    return r.status === null || r.status < 8;
  }
  fs.cpSync(src, dest, { recursive: true, force: true });
  return fs.existsSync(path.join(dest, path.basename(process.execPath)));
}

function selfInstallIfNeeded() {
  if (process.platform !== "win32") return false;
  if (isStorePackage()) return false;
  if (process.env.TORVA_SKIP_SELF_INSTALL === "1") {
    writeAppShortcuts(process.execPath);
    return false;
  }
  const dest = installDir();
  const src = path.dirname(process.execPath);
  const alreadyHome = path.resolve(src).toLowerCase() === path.resolve(dest).toLowerCase();
  if (!runningFromSfxTemp() || alreadyHome) {
    writeAppShortcuts(process.execPath);
    return false;
  }
  send({ type: "log", level: "notice", message: `Installing to ${dest}` });
  if (!copyInstallTree(src, dest)) {
    writeAppShortcuts(process.execPath);
    return false;
  }
  const destExe = path.join(dest, path.basename(process.execPath));
  if (!fs.existsSync(destExe)) {
    writeAppShortcuts(process.execPath);
    return false;
  }
  writeAppShortcuts(destExe);
  spawn(destExe, [], {
    detached: true,
    stdio: "ignore",
    cwd: dest,
    env: { ...process.env, TORVA_SKIP_SELF_INSTALL: "1" },
    windowsHide: false,
  }).unref();
  return true;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 720,
    minWidth: 390,
    minHeight: 620,
    backgroundColor: "#121416",
    frame: false,
    show: false,
    autoHideMenuBar: true,
    icon: iconImage(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  win.once("ready-to-show", () => win.show());
  win.on("close", (e) => {
    const closeToTray = !lastConfig || !lastConfig.settings || lastConfig.settings.closeToTray !== false;
    if (closeToTray && !app.isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.webContents.on("did-finish-load", () => {
    listeners.add(win.webContents);
  });
}

async function quitApp() {
  app.isQuitting = true;
  await stopTor(true);
  stopNetHelper();
  tunActive = false;
  restoreProxySync();
  app.quit();
}

ipcMain.handle("tor:connect", async (_e, config) => {
  lastConfig = config;
  if (config && config.settings && typeof config.settings.startWithSystem === "boolean") {
    app.setLoginItemSettings({ openAtLogin: config.settings.startWithSystem, path: process.execPath });
  }
  await startTor(config);
});

ipcMain.handle("tor:disconnect", async () => {
  await stopTor(true);
});

ipcMain.handle("tor:newnym", async () => {
  if (!control) throw new Error("not connected");
  await control.command("SIGNAL NEWNYM");
  send({ type: "log", level: "notice", message: "NEWNYM: new identity assigned" });
  await new Promise((r) => setTimeout(r, 800));
  await control.emitCircuit();
  notify("Torva VPN", "New identity");
});

ipcMain.handle("tor:newcircuit", async () => {
  if (!control) throw new Error("not connected");
  await control.command("SIGNAL NEWNYM");
  await new Promise((r) => setTimeout(r, 600));
  await control.emitCircuit();
});

ipcMain.handle("app:login-item", async (_e, on) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(on), path: process.execPath });
});

ipcMain.handle("tor:killswitch", async (_e, ks) => {
  if (lastConfig) lastConfig.killSwitch = ks;
  else lastConfig = { killSwitch: ks };
  bridge.allowLan = !ks || ks.allowLan !== false;
  if (torProc) return { ok: true };
  if (!ks || !ks.enabled) {
    bridge.setMode("off");
    restoreProxySync();
    send({ type: "status", status: "disconnected", label: "Disconnected" });
  }
  return { ok: true };
});

ipcMain.handle("tor:restore-proxy", async () => {
  bridge.setMode("off");
  restoreProxySync();
  send({ type: "log", level: "notice", message: "Windows proxy restored" });
  send({ type: "status", status: "disconnected", label: "Disconnected" });
  return { ok: true };
});

ipcMain.on("win:minimize", () => win && win.minimize());
ipcMain.on("win:maximize", () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.on("win:close", () => {
  if (!win) return;
  const closeToTray = !lastConfig || !lastConfig.settings || lastConfig.settings.closeToTray !== false;
  if (closeToTray) win.hide();
  else void quitApp();
});
ipcMain.on("win:hide", () => win && win.hide());
ipcMain.on("win:show", () => {
  if (!win) return;
  win.show();
  win.focus();
});
ipcMain.on("win:quit", () => void quitApp());

app.whenReady().then(async () => {
  if (selfInstallIfNeeded()) {
    app.quit();
    return;
  }
  restoreProxySync();
  await maybeRestoreProxyOnLaunch();
  createWindow();
  createTray();
  writeShortcuts();
});

app.on("before-quit", () => {
  app.isQuitting = true;
  restoreProxySync();
});

app.on("will-quit", () => {
  restoreProxySync();
});

process.on("exit", () => {
  try {
    fs.writeFileSync(netStopPath(), "1");
  } catch {
    /* ignore */
  }
  restoreProxySync();
});

process.on("uncaughtException", (err) => {
  restoreProxySync();
  console.error(err);
});

process.on("SIGINT", () => {
  restoreProxySync();
  process.exit(0);
});
process.on("SIGTERM", () => {
  restoreProxySync();
  process.exit(0);
});

app.on("window-all-closed", () => {
  /* stay in tray */
});
