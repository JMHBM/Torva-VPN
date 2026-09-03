import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, "..");
const cache = join(dir, ".cache");
const dist = join(dir, "dist");
const appDir = join(dist, "TorvaVPN");
const artifacts = join(root, "artifacts");
const seven = join(cache, "7zz");

function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status})`);
}

function pngToIco(pngPath, icoPath) {
  const png = readFileSync(pngPath);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0);
  entry.writeUInt8(0, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  writeFileSync(icoPath, Buffer.concat([header, entry, png]));
}

function extractZip(zipPath, dest) {
  run(seven, ["x", "-y", `-o${dest}`, zipPath], cache);
}

mkdirSync(artifacts, { recursive: true });
mkdirSync(dist, { recursive: true });

console.log("[torva] building renderer");
run("npx", ["vite", "build", "--config", "desktop/vite.config.ts"], root);

if (existsSync(appDir)) rmSync(appDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });

console.log("[torva] unpacking Electron");
extractZip(join(cache, "electron-win32.zip"), appDir);

const electronExe = join(appDir, "electron.exe");
if (!existsSync(electronExe)) throw new Error("electron.exe missing");
const torvaExe = join(appDir, "Torva.exe");
copyFileSync(electronExe, torvaExe);
rmSync(electronExe);

const defaultAsar = join(appDir, "resources", "default_app.asar");
if (existsSync(defaultAsar)) rmSync(defaultAsar);

const resources = join(appDir, "resources");
const appRes = join(resources, "app");
mkdirSync(appRes, { recursive: true });
copyFileSync(join(dir, "package.json"), join(appRes, "package.json"));
copyFileSync(join(dir, "main.cjs"), join(appRes, "main.cjs"));
copyFileSync(join(dir, "preload.cjs"), join(appRes, "preload.cjs"));
copyFileSync(join(dir, "proxy.cjs"), join(appRes, "proxy.cjs"));
cpSync(join(dir, "dist-renderer"), join(appRes, "renderer"), { recursive: true });

const torSrc = join(cache, "tor-src");
const torRes = join(resources, "tor");
mkdirSync(torRes, { recursive: true });
copyFileSync(join(torSrc, "tor", "tor.exe"), join(torRes, "tor.exe"));
copyFileSync(join(torSrc, "data", "geoip"), join(torRes, "geoip"));
copyFileSync(join(torSrc, "data", "geoip6"), join(torRes, "geoip6"));
copyFileSync(
  join(torSrc, "tor", "pluggable_transports", "lyrebird.exe"),
  join(torRes, "lyrebird.exe"),
);
copyFileSync(
  join(torSrc, "tor", "pluggable_transports", "pt_config.json"),
  join(torRes, "pt_config.json"),
);
const conjure = join(torSrc, "tor", "pluggable_transports", "conjure-client.exe");
if (existsSync(conjure)) copyFileSync(conjure, join(torRes, "conjure-client.exe"));

pngToIco(join(root, "public", "icon-512.png"), join(resources, "icon.ico"));
copyFileSync(join(root, "public", "icon-512.png"), join(resources, "icon.png"));
copyFileSync(join(resources, "icon.ico"), join(appDir, "icon.ico"));
copyFileSync(join(dir, "uninstall.cmd"), join(appDir, "uninstall.cmd"));
copyFileSync(join(dir, "Restore-Internet.bat"), join(appDir, "Restore-Internet.bat"));
copyFileSync(join(dir, "install.cmd"), join(appDir, "install.cmd"));
copyFileSync(join(dir, "EULA.txt"), join(appDir, "EULA.txt"));

const netRes = join(resources, "net");
mkdirSync(netRes, { recursive: true });
copyFileSync(join(dir, "net", "net-helper.ps1"), join(netRes, "net-helper.ps1"));
copyFileSync(join(dir, "net", "dirauths.txt"), join(netRes, "dirauths.txt"));
copyFileSync(join(cache, "net", "tun2socks-windows-amd64.exe"), join(netRes, "tun2socks.exe"));
copyFileSync(join(cache, "net", "wintun", "bin", "amd64", "wintun.dll"), join(netRes, "wintun.dll"));

writeFileSync(
  join(appDir, "README.txt"),
  [
    "Torva VPN",
    "=========",
    "",
    "Double-click Torva.exe to start.",
    "",
    "Windows SmartScreen may warn because this build is not code-signed.",
    "Choose More info, then Run anyway.",
    "",
    "Connect starts Tor. Approve the administrator prompt for Wintun so all",
    "TCP goes through Tor, DNS uses Tor DNSPort, and other UDP is dropped.",
    "Without administrator, Torva falls back to a stream-isolated Windows proxy.",
    "The installer copies Torva to %LOCALAPPDATA%\\Programs\\TorvaVPN and puts",
    "shortcuts on the Desktop and Start Menu. Quit from the tray, then relaunch",
    "from those shortcuts — do not delete AppData to start it again.",
    "Quitting always restores your internet. If anything goes wrong, run",
    "Restore-Internet.bat (also copied to Desktop).",
    "",
    "This installer bundles the Tor Expert Bundle (BSD license).",
    "https://www.torproject.org/",
    "",
  ].join("\r\n"),
);

writeFileSync(
  join(appDir, "LICENSE-TOR.txt"),
  "This installer bundles the Tor Expert Bundle from the Tor Project (BSD license).\nSee https://www.torproject.org/\n",
);

const archive = join(dist, "torva-payload.7z");
if (existsSync(archive)) rmSync(archive);
console.log("[torva] compressing payload");
run(seven, ["a", "-t7z", "-mx=5", "-m0=lzma2", archive, "*"], appDir);

const sfx = join(cache, "sfx", "7zSD.sfx");
if (!existsSync(sfx)) throw new Error("7zSD.sfx missing");
const cfg = Buffer.from(
  `;!@Install@!UTF-8!\r
Title="Torva VPN"\r
BeginPrompt="Install Torva VPN?\n\nBy choosing Yes you agree to the End User License Agreement. The full license is shown on first launch. Torva routes traffic through the Tor network. It is not a commercial VPN service.\n\nInstall to continue."\r
ExecuteFile="Torva.exe"\r
;!@InstallEnd@!\r
`,
  "utf8",
);
const installer = join(artifacts, "TorvaVPN-Setup.exe");
writeFileSync(installer, Buffer.concat([readFileSync(sfx), cfg, readFileSync(archive)]));

const magic = readFileSync(installer).subarray(0, 2).toString("ascii");
if (magic !== "MZ") throw new Error(`installer is not a PE (magic=${magic})`);
const st = readFileSync(installer);
console.log(`[torva] installer ${installer} (${(st.length / 1024 / 1024).toFixed(1)} MB)`);

const portable = join(artifacts, "TorvaVPN-windows-x64.7z");
if (existsSync(portable)) rmSync(portable);
console.log("[torva] writing portable archive");
run(seven, ["a", "-t7z", "-mx=5", portable, "TorvaVPN"], dist);
console.log(`[torva] portable ${portable}`);

console.log("[torva] packing MSIX");
run("python3", [join(dir, "store", "pack-msix.py"), appDir, join(artifacts, "TorvaVPN.msix")], root);
