# Privacy policy — Torva VPN

Last updated: 3 September 2026

Torva VPN (“Torva”) is a Tor client for Windows. It is sold as a one-time Microsoft Store purchase. There are no ads, no accounts, and no subscriptions.

## What Torva does on your PC

When you click Connect, Torva:

- starts a local Tor process (`tor.exe`) included with the app
- waits until Tor reports that bootstrap is complete
- then either
  - sets the Windows user proxy to Tor’s local HTTP tunnel (`127.0.0.1:9080`), or
  - if you approve an administrator prompt, may create a Wintun adapter and firewall rules so more traffic goes through Tor

When you disconnect or quit, Torva restores the previous Windows proxy settings and flushes DNS.

## Data Torva stores on your device

Torva stores settings, the EULA acceptance flag, and Tor’s working directory under your Windows user profile (`%APPDATA%\Torva VPN`). That data stays on the device. Torva does not create an account.

## Data Torva does not collect

Torva does not operate a user analytics service, advertising network, or cloud account. The publisher does not receive your browsing history, DNS queries, or a list of sites you visit.

## Traffic that leaves your device

Connected traffic is sent to the **Tor network**, which is run by independent volunteer operators worldwide, not by Torva’s publisher. Exit relays can see traffic that is not end-to-end encrypted. Torva cannot make you anonymous. Read [the Tor Project’s privacy documentation](https://support.torproject.org/).

The Microsoft Store, Windows, and your ISP may process purchase, install, and update metadata under **their** policies.

## Bundled third-party software

Torva bundles the Tor Expert Bundle (The Tor Project), Electron, tun2socks, and Wintun. Those projects have their own licenses and, where applicable, their own privacy practices.

## Children

Torva is not directed at children under 13.

## Contact

Publisher: JMHBM  
Source and issues: https://github.com/JMHBM/Torva-VPN
