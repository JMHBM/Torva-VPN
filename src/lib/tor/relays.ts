import type { Relay } from "./types";

export const RELAYS: Relay[] = [
  { id: "g1", nickname: "dawnGuard", fingerprint: "A91C4E2B7F06D831C4E0A17B9D22F6A8C01B3E54", country: "NL", countryName: "Netherlands", orPort: 443, address: "185.220.101.47", flags: ["Guard", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 98400, x: 495, y: 132 },
  { id: "g2", nickname: "forstEntry", fingerprint: "B12D8A90C3E41F76A80B2C9D4E11F0A6B37C8D21", country: "DE", countryName: "Germany", orPort: 9001, address: "185.220.102.8", flags: ["Guard", "Fast", "Stable", "Running", "Valid", "V2Dir", "HSDir"], bandwidth: 87200, x: 512, y: 142 },
  { id: "g3", nickname: "fjordRelay", fingerprint: "C40E1B83D2F5A907B61C3D8E0A24F9C7D18E5B30", country: "SE", countryName: "Sweden", orPort: 443, address: "192.121.108.22", flags: ["Guard", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 76100, x: 528, y: 92 },
  { id: "g4", nickname: "helixGate", fingerprint: "D53F2C94E0A6B718C72D4E9F1B30A8D6E29F4C41", country: "CH", countryName: "Switzerland", orPort: 443, address: "179.43.159.196", flags: ["Guard", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 65400, x: 508, y: 162 },
  { id: "g5", nickname: "cedarHop", fingerprint: "E64A3D05F1B7C829D83E5F0A2C41B9E7F30A5D52", country: "CA", countryName: "Canada", orPort: 9001, address: "199.58.81.140", flags: ["Guard", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 54300, x: 248, y: 118 },
  { id: "g6", nickname: "atlasGuard", fingerprint: "F75B4E16A2C8D930E94F6A1B3D52C0F8A41B6E63", country: "FR", countryName: "France", orPort: 443, address: "51.159.48.77", flags: ["Guard", "Fast", "Stable", "Running", "Valid", "V2Dir", "HSDir"], bandwidth: 81200, x: 488, y: 156 },
  { id: "g7", nickname: "northGate", fingerprint: "A86C5F27B3D9E041F05A7B2C4E63D1A9B52C7F74", country: "FI", countryName: "Finland", orPort: 443, address: "95.216.163.36", flags: ["Guard", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 70100, x: 556, y: 82 },
  { id: "g8", nickname: "ridgeEntry", fingerprint: "B97D6A38C4E0F152A16B8C3D5F74E2B0C63D8A85", country: "AT", countryName: "Austria", orPort: 9001, address: "37.120.190.54", flags: ["Guard", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 49800, x: 522, y: 160 },
  { id: "g9", nickname: "lumenGuard", fingerprint: "C08E7B49D5F1A263B27C9D4E6A85F3C1D74E9B96", country: "IS", countryName: "Iceland", orPort: 443, address: "193.187.89.13", flags: ["Guard", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 38700, x: 428, y: 78 },
  { id: "g10", nickname: "quietEntry", fingerprint: "D19F8C50E6A2B374C38D0E5F7B96A4D2E85F0CA7", country: "US", countryName: "United States", orPort: 443, address: "199.87.154.255", flags: ["Guard", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 92600, x: 232, y: 178 },

  { id: "m1", nickname: "midwinter", fingerprint: "E20A9D61F7B3C485D49E1F6A8C07B5E3F96A1DB8", country: "PL", countryName: "Poland", orPort: 9001, address: "193.218.118.91", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir", "HSDir"], bandwidth: 61200, x: 542, y: 138 },
  { id: "m2", nickname: "secondRing", fingerprint: "F31BAE72A8C4D596E50F2A7B9D18C6F4A07B2EC9", country: "RO", countryName: "Romania", orPort: 9001, address: "86.106.92.188", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 47800, x: 556, y: 166 },
  { id: "m3", nickname: "lattice", fingerprint: "A42CBF83B9D5E607F61A3B8C0E29D7A5B18C3FDA", country: "CZ", countryName: "Czechia", orPort: 443, address: "37.221.209.44", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 53400, x: 528, y: 148 },
  { id: "m4", nickname: "umbrage", fingerprint: "B53DC094C0E6F718A72B4C9D1F30E8B6C29D4AEB", country: "GB", countryName: "United Kingdom", orPort: 443, address: "185.220.100.252", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir", "HSDir"], bandwidth: 68900, x: 476, y: 128 },
  { id: "m5", nickname: "kestrel", fingerprint: "C64ED1A5D1F7A829B83C5D0E2A41F9C7D30E5BFC", country: "ES", countryName: "Spain", orPort: 9001, address: "185.165.171.84", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 42100, x: 468, y: 182 },
  { id: "m6", nickname: "nimbus", fingerprint: "D75FE2B6E2A8B930C94D6E1F3B52A0D8E41F6CAD", country: "IT", countryName: "Italy", orPort: 443, address: "95.211.208.17", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 45600, x: 518, y: 176 },
  { id: "m7", nickname: "willowMid", fingerprint: "E86AF3C7F3B9C041D05E7F2A4C63B1E9F52A7DBE", country: "BE", countryName: "Belgium", orPort: 9001, address: "51.15.43.202", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 39900, x: 498, y: 144 },
  { id: "m8", nickname: "sableHop", fingerprint: "F97B04D8A4C0D152E16F8A3B5D74C2F0A63B8ECF", country: "NO", countryName: "Norway", orPort: 443, address: "185.220.101.19", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 51200, x: 516, y: 86 },
  { id: "m9", nickname: "quartz", fingerprint: "A08C15E9B5D1E263F27A9B4C6E85D3A1B74C9FD0", country: "DK", countryName: "Denmark", orPort: 9001, address: "185.129.62.62", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir", "HSDir"], bandwidth: 44700, x: 512, y: 116 },
  { id: "m10", nickname: "hollow", fingerprint: "B19D26F0C6E2F374A38B0C5D7F96E4B2C85D0AE1", country: "UA", countryName: "Ukraine", orPort: 443, address: "91.219.237.224", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 36800, x: 574, y: 146 },
  { id: "m11", nickname: "pineRelay", fingerprint: "C20E37A1D7F3A485B49C1D6E8A07F5C3D96E1BF2", country: "BG", countryName: "Bulgaria", orPort: 9001, address: "87.120.37.115", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 33400, x: 552, y: 176 },
  { id: "m12", nickname: "iotaMid", fingerprint: "D31F48B2E8A4B596C50D2E7F9B18A6D4E07F2CF3", country: "HU", countryName: "Hungary", orPort: 443, address: "80.249.170.13", flags: ["Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 30100, x: 538, y: 158 },

  { id: "e1", nickname: "exitForge", fingerprint: "E42A59C3F9B5C607D61E3F8A0C29B7E5F18A3D04", country: "NL", countryName: "Netherlands", orPort: 443, address: "185.220.101.134", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 110400, x: 492, y: 136 },
  { id: "e2", nickname: "openHaven", fingerprint: "F53B6AD4A0C6D718E72F4A9B1D30C8F6A29B4E15", country: "SE", countryName: "Sweden", orPort: 443, address: "171.25.193.20", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 96800, x: 532, y: 96 },
  { id: "e3", nickname: "riverExit", fingerprint: "A64C7BE5B1D7E829F83A5B0C2E41A9A7B30C5F26", country: "DE", countryName: "Germany", orPort: 9001, address: "185.220.103.6", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 88700, x: 516, y: 146 },
  { id: "e4", nickname: "alpineOut", fingerprint: "B75D8CF6C2E8F930A94B6C1D3F52B0B8C41D6A37", country: "CH", countryName: "Switzerland", orPort: 443, address: "179.43.141.82", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 74200, x: 506, y: 166 },
  { id: "e5", nickname: "auroraOut", fingerprint: "C86E9DA7D3F9A041B05C7D2E4A63C1C9D52E7B48", country: "FI", countryName: "Finland", orPort: 443, address: "65.21.94.13", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 69500, x: 560, y: 86 },
  { id: "e6", nickname: "isthmus", fingerprint: "D97FAEB8E4A0B152C16D8E3F5B74D2D0E63F8C59", country: "IS", countryName: "Iceland", orPort: 443, address: "193.187.91.70", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 41200, x: 432, y: 82 },
  { id: "e7", nickname: "danubeOut", fingerprint: "A08ABFC9F5B1C263D27A9E4A6C85E3B1F74A9D6A", country: "AT", countryName: "Austria", orPort: 9001, address: "37.120.187.201", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 52800, x: 524, y: 164 },
  { id: "e8", nickname: "polderExit", fingerprint: "B19BC0DAA6C2D374E38B0F5B7D96F4C2A85B0E7B", country: "NL", countryName: "Netherlands", orPort: 443, address: "51.15.66.78", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 83400, x: 498, y: 130 },
  { id: "e9", nickname: "carpathia", fingerprint: "C20CD1EBB7D3E485F49C1A6C8E07A5D3B96C1F8C", country: "RO", countryName: "Romania", orPort: 443, address: "89.45.90.17", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 47600, x: 558, y: 170 },
  { id: "e10", nickname: "balticOut", fingerprint: "D31DE2FCC8E4F596A50D2B7D9C18B6E4C07D2A9D", country: "PL", countryName: "Poland", orPort: 9001, address: "193.218.118.42", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 55100, x: 546, y: 142 },
  { id: "e11", nickname: "lumenExit", fingerprint: "E42EF3ADD9F5A607B61E3C8E0D29C7F5D18E3BAD", country: "LU", countryName: "Luxembourg", orPort: 443, address: "94.242.53.220", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 38900, x: 500, y: 150 },
  { id: "e12", nickname: "cinderOut", fingerprint: "F53F04BEE0A6B718C72F4B9F1E30D8A6E29F4CBE", country: "MD", countryName: "Moldova", orPort: 443, address: "178.175.148.5", flags: ["Exit", "Fast", "Stable", "Running", "Valid", "V2Dir"], bandwidth: 29700, x: 568, y: 158 },
];

export const COUNTRIES = [
  ...new Map(
    RELAYS.map((r) => [r.country, r.countryName]),
  ).entries(),
].map(([code, name]) => ({ code, name }));

export const EXIT_COUNTRIES = [
  ...new Map(
    RELAYS.filter((r) => r.flags.includes("Exit")).map((r) => [
      r.country,
      r.countryName,
    ]),
  ).entries(),
].map(([code, name]) => ({ code, name }));

export function formatFingerprint(fp: string) {
  return fp.match(/.{1,4}/g)?.join(" ") ?? fp;
}

export function shortFp(fp: string) {
  return `${fp.slice(0, 4)}…${fp.slice(-4)}`;
}

export function formatBandwidth(kb: number) {
  if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB/s`;
  return `${Math.round(kb)} KB/s`;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
