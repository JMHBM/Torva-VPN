# Torva VPN

A Windows 10/11 Tor client with a VPN-style interface. One click connects. Traffic is routed through Tor — not a commercial VPN overlay.

Torva is an independent project. It is **not** affiliated with the Tor Project, Linus Torvalds, or any VPN vendor.

## What it does

- Starts the Tor Expert Bundle (`tor.exe`) and waits for **Bootstrapped 100%** before changing Windows networking
- Uses Tor `HTTPTunnelPort` `127.0.0.1:9080` as the WinINet system proxy (`http=` / `https=`), with `<local>` bypass
- Optional Wintun + tun2socks path if you approve an administrator prompt
- Bridges: obfs4, Snowflake, meek, WebTunnel via bundled `lyrebird.exe`
- Kill switch, circuit / relay / country controls, tray icon, minimize-to-tray
- Restores the Windows proxy on quit, crash, or launch if a leftover local proxy is still armed
- First-run End User License Agreement (`EULA.txt`)

## Install (end users)

Use a built `TorvaVPN-Setup.exe` on Windows. The installer unpacks, copies itself to:

`%LOCALAPPDATA%\Programs\TorvaVPN`

and writes **Desktop** and **Start Menu** shortcuts. Quit from the tray, then relaunch from those shortcuts.

Windows SmartScreen may warn on unsigned builds. Choose More info → Run anyway.

If the internet is stuck after a crash, run `Restore-Internet.bat` (also copied to the Desktop).

## Build from source

Requires Node 22+ and a Windows-oriented packager run. The Windows installer is produced by `desktop/build.mjs` (Electron + Tor Expert Bundle + 7-Zip SFX).

```bash
npm install
npm run typecheck
npm run test:proxy
npm run build:windows
```

Output:

- `artifacts/TorvaVPN-Setup.exe`
- `artifacts/TorvaVPN-windows-x64.7z` (portable)

Build caches (`desktop/.cache`, Electron, Tor expert bundle) are not in this repository.

## License

[GNU Affero General Public License v3.0](LICENSE)

You must also accept the [End User License Agreement](EULA.txt) to run the application.

Corresponding source for this program is this repository: https://github.com/JMHBM/Torva-VPN

## Disclaimer

Torva is provided **as is**, without warranty. A connected status does not mean you are anonymous. UDP, IPv6, and apps that ignore the system proxy can still leak. Use Torva only in accordance with applicable law.
