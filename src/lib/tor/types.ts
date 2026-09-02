export type Status = "disconnected" | "connecting" | "connected" | "blocked";

export type View =
  | "connect"
  | "circuit"
  | "relays"
  | "bridges"
  | "apps"
  | "settings";

export type Routing = "standard" | "snowflake" | "obfs4" | "meek" | "webtunnel";

export type WindowMode = "normal" | "maximized" | "tray";

export type RelayFlag =
  | "Guard"
  | "Exit"
  | "Fast"
  | "Stable"
  | "HSDir"
  | "Running"
  | "Valid"
  | "V2Dir";

export type HopRole = "guard" | "middle" | "exit";

export interface Relay {
  id: string;
  nickname: string;
  fingerprint: string;
  country: string;
  countryName: string;
  orPort: number;
  address: string;
  flags: RelayFlag[];
  bandwidth: number;
  x: number;
  y: number;
}

export interface Hop {
  role: HopRole;
  relay: Relay;
}

export interface Circuit {
  id: string;
  hops: [Hop, Hop, Hop];
  builtAt: number;
}

export interface LogEntry {
  id: number;
  at: number;
  level: "notice" | "warn" | "info";
  message: string;
}

export interface BridgeConfig {
  enabled: boolean;
  autoOnCensorship: boolean;
  type: Exclude<Routing, "standard">;
  lines: string;
}

export interface KillSwitchConfig {
  enabled: boolean;
  mode: "all" | "selected";
  blockedApps: string[];
  allowLan: boolean;
}

export interface ClientSettings {
  minimizeToTray: boolean;
  closeToTray: boolean;
  autoConnect: boolean;
  startWithSystem: boolean;
  notifications: boolean;
  useEntryGuards: boolean;
  numEntryGuards: number;
  isolateDestinations: boolean;
  isolateSocksAuth: boolean;
  ipv6: boolean;
  newCircuitMinutes: number;
  maxCircuitDirtiness: number;
  strictNodes: boolean;
  avoidDiskWrites: boolean;
  systemTun: boolean;
  eulaAccepted: boolean;
  eulaVersion: number;
}

export interface AppEntry {
  id: string;
  name: string;
  publisher: string;
  category: string;
}

export interface Stats {
  bytesUp: number;
  bytesDown: number;
  connectedAt: number | null;
  circuitsBuilt: number;
  samples: number[];
}
