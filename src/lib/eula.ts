export const EULA_VERSION = 1;

export const EULA_TITLE = "Torva VPN End User License Agreement";

export const EULA_TEXT = `TORVA VPN
End User License Agreement
Version 1 — Effective 1 September 2026

Please read this agreement carefully before installing or using Torva VPN (“the Software”). By clicking Accept, installing, or using the Software, you agree to these terms. If you do not agree, click Decline and do not use the Software.

1. License
Subject to this agreement, you are granted a personal, non-exclusive, non-transferable, revocable license to install and use the Software on Windows devices you own or control.

2. What Torva is
Torva VPN is a Tor client with a VPN-style interface. It routes supported traffic through the Tor network operated by volunteers worldwide. It is not a commercial VPN service, not a privacy guarantee, and not a substitute for legal advice or operational security.

3. No affiliation
Torva is an independent project. It is not affiliated with, endorsed by, or sponsored by the Tor Project, Inc., the Tor network, Linus Torvalds, or any VPN vendor. “Torva” is a name only.

4. Third-party software
The Software bundles components under their own licenses, including the Tor Expert Bundle (BSD-style license, The Tor Project), Electron, tun2socks, and Wintun. Those licenses continue to apply. Tor itself is available from https://www.torproject.org/

5. Network changes
When you Connect, the Software may:
  • start tor.exe and related helpers;
  • set the Windows user proxy to a local Tor HTTP tunnel;
  • optionally create a Wintun virtual adapter, routes, DNS rules, and firewall rules if you grant administrator permission.
Quitting Torva is designed to restore those settings. You also receive Restore-Internet.bat. You are responsible for returning your system to a working state if a crash or force-quit leaves routing changed.

6. No warranty
THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. Tor circuits can fail. Bridges can fail. Windows may still leak traffic, especially UDP, IPv6, and apps that ignore the system proxy. A “connected” status does not mean you are anonymous or untraceable.

7. Limitation of liability
To the maximum extent permitted by law, the authors are not liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or connectivity, arising from the Software or from routing through Tor.

8. Acceptable use
You must use the Software only in accordance with applicable law. You are solely responsible for your traffic, your jurisdiction, and any service that forbids Tor. Do not use Torva to harm others or to evade lawful process.

9. Updates and unsigned builds
Builds may be unsigned. Windows SmartScreen or antivirus may warn. You install at your own risk. Features, bundled Tor versions, and default settings may change.

10. Termination
This license ends if you violate it or uninstall the Software. Sections 6, 7, and 8 survive termination.

11. Entire agreement
This is the entire agreement for the Software, together with the licenses of bundled third-party components.

If you do not accept these terms, do not install or run Torva VPN.
`;
