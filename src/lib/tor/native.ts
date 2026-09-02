import type { KillSwitchConfig, Routing, Status } from "./types";

export type NativeHop = {
  fingerprint: string;
  nickname: string;
  address: string;
  country: string;
  countryName: string;
};

export type NativeConnectConfig = {
  settings: {
    useEntryGuards: boolean;
    numEntryGuards: number;
    isolateDestinations: boolean;
    isolateSocksAuth: boolean;
    ipv6: boolean;
    newCircuitMinutes: number;
    maxCircuitDirtiness: number;
    strictNodes: boolean;
    avoidDiskWrites: boolean;
    startWithSystem: boolean;
    minimizeToTray: boolean;
    closeToTray: boolean;
    notifications: boolean;
    systemTun: boolean;
  };
  routing: Routing;
  selectedExitCountry: string;
  excludedCountries: string[];
  bridgesEnabled: boolean;
  bridgeLines: string;
  killSwitch: KillSwitchConfig;
};

export type NativeEvent =
  | { type: "bootstrap"; progress: number; summary: string }
  | { type: "connected"; hops: NativeHop[] }
  | { type: "circuit"; hops: NativeHop[] }
  | { type: "log"; level: "notice" | "warn" | "info"; message: string }
  | { type: "stats"; bytesUp: number; bytesDown: number }
  | { type: "status"; status: Status; label?: string }
  | { type: "error"; message: string }
  | { type: "exitip"; ip: string }
  | { type: "path"; path: "tun" | "proxy" };

export type NativeAPI = {
  isNative: true;
  connect: (config: NativeConnectConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  newnym: () => Promise<void>;
  newCircuit: () => Promise<void>;
  setStartWithWindows: (on: boolean) => Promise<void>;
  updateKillSwitch: (ks: KillSwitchConfig) => Promise<void>;
  restoreProxy: () => Promise<void>;
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    hide: () => void;
    show: () => void;
    quit: () => void;
  };
  onEvent: (cb: (event: NativeEvent) => void) => () => void;
};

declare global {
  interface Window {
    torvaNative?: NativeAPI;
  }
}

export function getNative(): NativeAPI | null {
  if (typeof window === "undefined") return null;
  return window.torvaNative ?? null;
}
