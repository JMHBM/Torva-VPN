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

## Install

**Microsoft Store (planned):** one-time **$9.99**, no ads, no subscriptions, free lifetime updates. Upload `artifacts/TorvaVPN.msix` — see [STORE.md](STORE.md).

**Sideload:** `TorvaVPN-Setup.exe` copies itself to `%LOCALAPPDATA%\Programs\TorvaVPN` and writes Desktop and Start Menu shortcuts.

If the internet is stuck after a crash, run `Restore-Internet.bat`.

## Build from source

```bash
npm install
npm run typecheck
npm run test:proxy
npm run build:windows
```

Output:

- `artifacts/TorvaVPN.msix` — unsigned Store package (Store signs on ingest)
- `artifacts/TorvaVPN-Setup.exe` — 7-Zip SFX installer
- `artifacts/TorvaVPN-windows-x64.7z` — portable

Put your Partner Center identity in `desktop/store/identity.json` before a Store build.

## License

[GNU Affero General Public License v3.0](LICENSE)

You must also accept the [End User License Agreement](EULA.txt) to run the application.

Privacy policy: [PRIVACY.md](PRIVACY.md)

Corresponding source: https://github.com/JMHBM/Torva-VPN

## Disclaimer

Torva is provided **as is**, without warranty. A connected status does not mean you are anonymous. UDP, IPv6, and apps that ignore the system proxy can still leak. Use Torva only in accordance with applicable law.
