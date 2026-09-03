# Microsoft Store listing — Torva VPN

One-time purchase **$9.99**. No ads. No subscriptions. Store updates are free for life.

## Before you upload

1. Open [Partner Center](https://partner.microsoft.com/) and reserve the name **Torva VPN**.
2. Copy the package identity Partner Center assigns:
   - Package/Identity/Name
   - Publisher `CN={GUID}`
   - Publisher display name
3. Paste those values into [`desktop/store/identity.json`](desktop/store/identity.json).
4. Rebuild so `artifacts/TorvaVPN.msix` matches that identity.
5. Upload the **unsigned** `.msix`. The Store signs it. Do not sideload-sign it with a test cert and then upload that signature.

## Package capabilities (justification for certification)

| Capability | Why |
|---|---|
| `runFullTrust` | Electron desktop app. Spawns `tor.exe` and `lyrebird.exe`. |
| `unvirtualizedResources` | Must write real HKCU WinINet proxy values. MSIX registry virtualization would leave the system proxy unchanged. |
| `allowElevation` | Optional Wintun + WFP leak shield. If the user declines UAC, Torva stays on HTTP-tunnel proxy mode. |
| `internetClient` | Tor bootstrap and user traffic. |
| `privateNetworkClientServer` | Local SOCKS/HTTP/DNS listeners on `127.0.0.1`. |

Notes for testers: Connect, wait for Bootstrapped 100%, confirm `check.torproject.org/api/ip` reports `IsTor: true`, then Quit and confirm the system proxy is restored.

## Listing copy

**Title:** Torva VPN

**Subtitle:** One-click Tor for Windows

**Short description:**  
Route Windows traffic through Tor. One-time purchase. No ads, no subscriptions, free lifetime updates.

**Description:**

Torva VPN is a Tor client with a familiar VPN-style interface.

Click Connect. Torva starts the Tor Expert Bundle, waits until the circuit is actually built, and only then points Windows at Tor’s local HTTP tunnel. Quit, and your previous internet settings come back.

- One-time price. No trial nag. No account.
- Bridges: obfs4, Snowflake, meek, WebTunnel
- Country and relay controls, stream isolation, kill switch
- Optional system-wide TUN (administrator) for DNS-over-Tor and UDP drop
- Minimize to tray when connected

Torva is not a commercial VPN overlay and is not affiliated with the Tor Project or Linus Torvalds. A connected padlock does not mean you are anonymous. Apps that ignore the Windows proxy, plus some UDP/IPv6 paths, can still leak unless you approve the TUN helper.

**Privacy policy URL:** https://github.com/JMHBM/Torva-VPN/blob/main/PRIVACY.md  
**Support URL:** https://github.com/JMHBM/Torva-VPN/issues  
**Website:** https://github.com/JMHBM/Torva-VPN

**Price:** $9.99 USD (durable / one-time). Free updates.

**Category:** Security  
**Age:** 12+ or as rated by the questionnaire  
**Hardware:** Windows 10 version 1809 or later, 64-bit

## Screenshots

Generated art for the listing lives in `desktop/store/listing/` after a build (`logo-300.png`, `screenshot-1920x1080.png`). Add at least one live capture of the running window from your test PC as well — Store reviewers prefer a real UI shot.

## What changed vs the .exe installer

The Store package is the same Torva engine. MSIX installs into `WindowsApps`, so the Temp-folder self-copy used by the 7-Zip setup is disabled. Start Menu is provided by the Store. Lifetime updates are Store package updates you publish; customers are not charged again.
