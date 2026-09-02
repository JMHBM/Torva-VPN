import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EULA_VERSION } from "../eula";
import { DEFAULT_BLOCKED } from "./apps";
import { getNative, type NativeEvent, type NativeHop } from "./native";
import { RELAYS } from "./relays";
import { bridgesNeeded } from "./torrc";
import type {
  BridgeConfig,
  Circuit,
  ClientSettings,
  Hop,
  KillSwitchConfig,
  LogEntry,
  Relay,
  Routing,
  Stats,
  Status,
  View,
  WindowMode,
} from "./types";

const DEFAULT_SETTINGS: ClientSettings = {
  minimizeToTray: true,
  closeToTray: true,
  autoConnect: false,
  startWithSystem: false,
  notifications: true,
  useEntryGuards: true,
  numEntryGuards: 3,
  isolateDestinations: true,
  isolateSocksAuth: true,
  ipv6: false,
  newCircuitMinutes: 10,
  maxCircuitDirtiness: 10,
  strictNodes: false,
  avoidDiskWrites: true,
  systemTun: true,
  eulaAccepted: false,
  eulaVersion: 0,
};

const DEFAULT_BRIDGES: BridgeConfig = {
  enabled: false,
  autoOnCensorship: false,
  type: "snowflake",
  lines: `obfs4 198.51.100.14:443 cert=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA iat-mode=0
obfs4 203.0.113.88:80 cert=BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB iat-mode=1`,
};

const DEFAULT_KILL: KillSwitchConfig = {
  enabled: true,
  mode: "all",
  blockedApps: DEFAULT_BLOCKED,
  allowLan: true,
};

const STANDARD_STAGES: { at: number; message: string }[] = [
  { at: 0, message: "Starting" },
  { at: 5, message: "Connecting to directory server" },
  { at: 10, message: "Finishing handshake with directory server" },
  { at: 15, message: "Establishing an encrypted directory connection" },
  { at: 25, message: "Asking for networkstatus consensus" },
  { at: 40, message: "Loading networkstatus consensus" },
  { at: 45, message: "Asking for relay descriptors" },
  { at: 50, message: "Loading relay descriptors" },
  { at: 75, message: "Connecting to the Tor network" },
  { at: 80, message: "Establishing a Tor circuit" },
  { at: 90, message: "Connected to the Tor network" },
  { at: 100, message: "Done" },
];

const SNOWFLAKE_STAGES: { at: number; message: string }[] = [
  { at: 0, message: "Starting" },
  { at: 5, message: "Contacting Snowflake broker" },
  { at: 15, message: "Waiting for a volunteer proxy" },
  { at: 30, message: "Negotiating WebRTC with Snowflake" },
  { at: 45, message: "Snowflake connected" },
  { at: 55, message: "Asking for networkstatus consensus" },
  { at: 70, message: "Loading relay descriptors" },
  { at: 80, message: "Establishing a Tor circuit" },
  { at: 90, message: "Connected to the Tor network" },
  { at: 100, message: "Done" },
];

const BRIDGE_STAGES: { at: number; message: string }[] = [
  { at: 0, message: "Starting" },
  { at: 5, message: "Connecting to a bridge" },
  { at: 20, message: "Finishing handshake with bridge" },
  { at: 35, message: "Establishing an encrypted directory connection" },
  { at: 50, message: "Asking for networkstatus consensus" },
  { at: 65, message: "Loading relay descriptors" },
  { at: 80, message: "Establishing a Tor circuit" },
  { at: 90, message: "Connected to the Tor network" },
  { at: 100, message: "Done" },
];

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]!;
}

function weighted(list: Relay[]) {
  const total = list.reduce((s, r) => s + r.bandwidth, 0);
  let n = Math.random() * total;
  for (const r of list) {
    n -= r.bandwidth;
    if (n <= 0) return r;
  }
  return list[list.length - 1]!;
}

function ts() {
  return Date.now();
}

function circuitId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hopsToCircuit(hops: NativeHop[]): Circuit | null {
  if (hops.length < 3) return null;
  const roles: Hop["role"][] = ["guard", "middle", "exit"];
  const mapped = hops.slice(0, 3).map((h, i) => {
    const known =
      RELAYS.find((r) => r.fingerprint.toUpperCase() === h.fingerprint.toUpperCase()) ??
      RELAYS.find((r) => r.country.toLowerCase() === h.country.toLowerCase());
    const relay: Relay = {
      id: h.fingerprint.slice(0, 12).toLowerCase(),
      nickname: h.nickname || h.fingerprint.slice(0, 8),
      fingerprint: h.fingerprint,
      country: (h.country || known?.country || "??").toUpperCase(),
      countryName: h.countryName || known?.countryName || h.country.toUpperCase(),
      orPort: 443,
      address: h.address || "0.0.0.0",
      flags:
        i === 2
          ? ["Exit", "Fast", "Running", "Valid"]
          : i === 0
            ? ["Guard", "Fast", "Running", "Valid"]
            : ["Fast", "Running", "Valid"],
      bandwidth: known?.bandwidth ?? 50_000,
      x: known?.x ?? 400,
      y: known?.y ?? 180,
    };
    return { role: roles[i]!, relay };
  });
  return { id: circuitId(), hops: mapped as [Hop, Hop, Hop], builtAt: Date.now() };
}

let logSeq = 1;
let bootstrapTimer: number | null = null;
let statsTimer: number | null = null;
let trayTimer: number | null = null;
let dirtinessTimer: number | null = null;
let connectGeneration = 0;

function clearTimers() {
  if (bootstrapTimer !== null) window.clearTimeout(bootstrapTimer);
  if (statsTimer !== null) window.clearInterval(statsTimer);
  if (trayTimer !== null) window.clearTimeout(trayTimer);
  if (dirtinessTimer !== null) window.clearInterval(dirtinessTimer);
  bootstrapTimer = null;
  statsTimer = null;
  trayTimer = null;
  dirtinessTimer = null;
}

export interface TorState {
  status: Status;
  bootstrap: number;
  bootstrapLabel: string;
  circuit: Circuit | null;
  routing: Routing;
  selectedGuardId: string;
  selectedExitId: string;
  selectedExitCountry: string;
  excludedCountries: string[];
  excludedRelays: string[];
  bridges: BridgeConfig;
  killSwitch: KillSwitchConfig;
  settings: ClientSettings;
  stats: Stats;
  logs: LogEntry[];
  view: View;
  windowMode: WindowMode;
  identity: number;
  hydrated: boolean;
  netPath: "none" | "tun" | "proxy";
  acceptEula: () => void;
  connect: () => void;
  disconnect: () => void;
  togglePower: () => void;
  newCircuit: (reason?: string) => void;
  newIdentity: () => void;
  applyNativeEvent: (ev: NativeEvent) => void;
  setView: (view: View) => void;
  setWindowMode: (mode: WindowMode) => void;
  restoreWindow: () => void;
  setRouting: (routing: Routing) => void;
  setExitCountry: (code: string) => void;
  setGuard: (id: string) => void;
  setExit: (id: string) => void;
  toggleExcludeCountry: (code: string) => void;
  toggleExcludeRelay: (id: string) => void;
  patchBridges: (patch: Partial<BridgeConfig>) => void;
  patchKill: (patch: Partial<KillSwitchConfig>) => void;
  toggleBlockedApp: (id: string) => void;
  patchSettings: (patch: Partial<ClientSettings>) => void;
  setHydrated: () => void;
}

function pushLog(get: () => TorState, set: (p: Partial<TorState>) => void, level: LogEntry["level"], message: string) {
  const entry: LogEntry = { id: logSeq++, at: ts(), level, message };
  const logs = [...get().logs, entry].slice(-90);
  set({ logs });
}

function activeRouting(state: TorState): Routing {
  if (state.routing !== "standard") return state.routing;
  if (state.bridges.enabled) return state.bridges.type;
  return "standard";
}

function stagesFor(routing: Routing) {
  if (routing === "snowflake") return SNOWFLAKE_STAGES;
  if (routing === "obfs4" || routing === "meek" || routing === "webtunnel") return BRIDGE_STAGES;
  return STANDARD_STAGES;
}

function eligible(state: TorState, relay: Relay) {
  if (state.excludedRelays.includes(relay.id)) return false;
  if (state.excludedCountries.includes(relay.country)) return false;
  return true;
}

function buildCircuit(state: TorState): Circuit | null {
  const guards = RELAYS.filter(
    (r) => r.flags.includes("Guard") && eligible(state, r),
  );
  const middles = RELAYS.filter(
    (r) =>
      !r.flags.includes("Guard") &&
      !r.flags.includes("Exit") &&
      eligible(state, r),
  );
  const exits = RELAYS.filter((r) => {
    if (!r.flags.includes("Exit") || !eligible(state, r)) return false;
    if (state.selectedExitCountry !== "auto" && r.country !== state.selectedExitCountry) {
      return false;
    }
    return true;
  });

  const guardPool = guards.length ? guards : RELAYS.filter((r) => r.flags.includes("Guard"));
  const middlePool = middles.length ? middles : RELAYS.filter((r) => !r.flags.includes("Exit") && !r.flags.includes("Guard"));
  const exitPool = exits.length ? exits : RELAYS.filter((r) => r.flags.includes("Exit"));

  const guard =
    state.selectedGuardId !== "auto"
      ? (RELAYS.find((r) => r.id === state.selectedGuardId) ?? weighted(guardPool))
      : weighted(guardPool);

  let exit =
    state.selectedExitId !== "auto"
      ? (RELAYS.find((r) => r.id === state.selectedExitId) ?? weighted(exitPool))
      : weighted(exitPool.filter((r) => r.country !== guard.country && r.id !== guard.id));
  if (!exit || exit.id === guard.id) exit = weighted(exitPool);

  const middleCandidates = middlePool.filter(
    (r) => r.id !== guard.id && r.id !== exit.id && r.country !== guard.country && r.country !== exit.country,
  );
  const middle = weighted(middleCandidates.length ? middleCandidates : middlePool);

  const hops: [Hop, Hop, Hop] = [
    { role: "guard", relay: guard },
    { role: "middle", relay: middle },
    { role: "exit", relay: exit },
  ];

  return { id: circuitId(), hops, builtAt: ts() };
}

function startStats(get: () => TorState, set: (p: Partial<TorState>) => void) {
  if (statsTimer !== null) window.clearInterval(statsTimer);
  statsTimer = window.setInterval(() => {
    if (get().status !== "connected") return;
    const burst = 12_000 + Math.random() * 90_000;
    const up = burst * (0.08 + Math.random() * 0.18);
    const down = burst - up;
    const s = get();
    const samples = [...s.stats.samples, down + up].slice(-36);
    set({
      stats: {
        ...s.stats,
        bytesUp: s.stats.bytesUp + up,
        bytesDown: s.stats.bytesDown + down,
        samples,
      },
    });
  }, 1000);
}

function scheduleDirtiness(get: () => TorState, set: (p: Partial<TorState>) => void) {
  if (dirtinessTimer !== null) window.clearInterval(dirtinessTimer);
  dirtinessTimer = window.setInterval(() => {
    const s = get();
    if (s.status !== "connected") return;
    const minutes = Math.max(1, s.settings.newCircuitMinutes);
    const age = Date.now() - (s.circuit?.builtAt ?? Date.now());
    if (age >= minutes * 60_000) {
      useTorStore.getState().newCircuit("MaxCircuitDirtiness");
    }
  }, 15_000);
}

function finishConnect(
  generation: number,
  get: () => TorState,
  set: (p: Partial<TorState>) => void,
) {
  if (generation !== connectGeneration) return;
  const circuit = buildCircuit(get());
  if (!circuit) {
    set({ status: "disconnected", bootstrap: 0, bootstrapLabel: "Failed to build circuit" });
    pushLog(get, set, "warn", "Circuit build failed");
    return;
  }
  const s = get();
  set({
    status: "connected",
    bootstrap: 100,
    bootstrapLabel: "Done",
    circuit,
    stats: {
      ...s.stats,
      connectedAt: Date.now(),
      circuitsBuilt: s.stats.circuitsBuilt + 1,
      samples: [],
    },
  });
  const [guard, middle, exit] = circuit.hops;
  pushLog(get, set, "notice", `Circuit ${circuit.id.slice(0, 8)} built`);
  pushLog(
    get,
    set,
    "info",
    `${guard.relay.nickname} → ${middle.relay.nickname} → ${exit.relay.nickname} (${exit.relay.country})`,
  );
  startStats(get, set);
  scheduleDirtiness(get, set);

  if (get().settings.minimizeToTray) {
    if (trayTimer !== null) window.clearTimeout(trayTimer);
    trayTimer = window.setTimeout(() => {
      if (generation !== connectGeneration) return;
      if (get().status === "connected" && get().settings.minimizeToTray) {
        set({ windowMode: "tray" });
        pushLog(get, set, "info", "Window minimized to tray");
      }
    }, 1600);
  }
}

function runBootstrap(
  generation: number,
  get: () => TorState,
  set: (p: Partial<TorState>) => void,
) {
  const routing = activeRouting(get());
  const stages = stagesFor(routing);
  const duration =
    routing === "snowflake" ? 7200 : routing === "standard" ? 3800 : 5600;
  const started = Date.now();

  const tick = () => {
    if (generation !== connectGeneration) return;
    const elapsed = Date.now() - started;
    const pct = Math.min(100, Math.round((elapsed / duration) * 100));
    const stage = [...stages].reverse().find((s) => pct >= s.at) ?? stages[0]!;
    const prev = get().bootstrapLabel;
    set({ bootstrap: pct, bootstrapLabel: stage.message });
    if (stage.message !== prev) {
      pushLog(get, set, "notice", `Bootstrapped ${stage.at}%: ${stage.message}`);
    }
    if (pct >= 100) {
      finishConnect(generation, get, set);
      return;
    }
    bootstrapTimer = window.setTimeout(tick, 80 + Math.random() * 120);
  };
  tick();
}

export const useTorStore = create<TorState>()(
  persist(
    (set, get) => ({
      status: "disconnected",
      bootstrap: 0,
      bootstrapLabel: "Disconnected",
      circuit: null,
      routing: "standard",
      selectedGuardId: "auto",
      selectedExitId: "auto",
      selectedExitCountry: "auto",
      excludedCountries: [],
      excludedRelays: [],
      bridges: DEFAULT_BRIDGES,
      killSwitch: DEFAULT_KILL,
      settings: DEFAULT_SETTINGS,
      stats: {
        bytesUp: 0,
        bytesDown: 0,
        connectedAt: null,
        circuitsBuilt: 0,
        samples: [],
      },
      logs: [],
      view: "connect",
      windowMode: "normal",
      identity: 1,
      hydrated: false,
      netPath: "none",
      setHydrated: () => set({ hydrated: true }),
      acceptEula: () =>
        set({
          settings: {
            ...get().settings,
            eulaAccepted: true,
            eulaVersion: EULA_VERSION,
          },
        }),
      setView: (view) => set({ view }),
      setWindowMode: (windowMode) => {
        set({ windowMode });
        const native = getNative();
        if (!native) return;
        if (windowMode === "tray") native.window.hide();
        else native.window.show();
        if (windowMode === "maximized") native.window.maximize();
      },
      restoreWindow: () => {
        set({ windowMode: "normal" });
        getNative()?.window.show();
      },
      setRouting: (routing) => {
        set({ routing });
        if (routing !== "standard") {
          set({
            bridges: { ...get().bridges, enabled: true, type: routing },
          });
        } else {
          set({ bridges: { ...get().bridges, enabled: false } });
        }
      },
      setExitCountry: (code) => set({ selectedExitCountry: code, selectedExitId: "auto" }),
      setGuard: (id) => set({ selectedGuardId: id }),
      setExit: (id) => {
        const relay = RELAYS.find((r) => r.id === id);
        set({
          selectedExitId: id,
          selectedExitCountry: relay ? relay.country : get().selectedExitCountry,
        });
      },
      toggleExcludeCountry: (code) => {
        const has = get().excludedCountries.includes(code);
        set({
          excludedCountries: has
            ? get().excludedCountries.filter((c) => c !== code)
            : [...get().excludedCountries, code],
        });
      },
      toggleExcludeRelay: (id) => {
        const has = get().excludedRelays.includes(id);
        set({
          excludedRelays: has
            ? get().excludedRelays.filter((c) => c !== id)
            : [...get().excludedRelays, id],
        });
      },
      patchBridges: (patch) => set({ bridges: { ...get().bridges, ...patch } }),
      patchKill: (patch) => {
        set({ killSwitch: { ...get().killSwitch, ...patch } });
        const native = getNative();
        if (native?.updateKillSwitch) void native.updateKillSwitch(get().killSwitch);
      },
      toggleBlockedApp: (id) => {
        const { blockedApps } = get().killSwitch;
        const next = blockedApps.includes(id)
          ? blockedApps.filter((a) => a !== id)
          : [...blockedApps, id];
        set({ killSwitch: { ...get().killSwitch, blockedApps: next } });
      },
      patchSettings: (patch) => {
        set({ settings: { ...get().settings, ...patch } });
        const native = getNative();
        if (native && "startWithSystem" in patch) {
          void native.setStartWithWindows(Boolean(get().settings.startWithSystem));
        }
      },
      connect: () => {
        const s = get();
        if (!s.settings.eulaAccepted || s.settings.eulaVersion < EULA_VERSION) return;
        if (s.status === "connecting" || s.status === "connected") return;
        connectGeneration += 1;
        const generation = connectGeneration;
        clearTimers();
        set({
          status: "connecting",
          bootstrap: 0,
          bootstrapLabel: "Starting",
          windowMode: s.windowMode === "tray" ? "normal" : s.windowMode,
        });
        pushLog(get, set, "notice", "Tor starting");
        const native = getNative();
        if (native) {
          const routing = activeRouting(get());
          native.window.show();
          void native
            .connect({
              settings: get().settings,
              routing,
              selectedExitCountry:
                get().selectedExitId !== "auto"
                  ? (RELAYS.find((r) => r.id === get().selectedExitId)?.country ??
                    get().selectedExitCountry)
                  : get().selectedExitCountry,
              excludedCountries: get().excludedCountries,
              bridgesEnabled: bridgesNeeded(routing, get().bridges),
              bridgeLines: get().bridges.lines,
              killSwitch: get().killSwitch,
            })
            .catch((err: unknown) => {
              if (generation !== connectGeneration) return;
              const blocked = get().killSwitch.enabled;
              set({
                status: blocked ? "blocked" : "disconnected",
                bootstrap: 0,
                bootstrapLabel: blocked ? "Kill switch engaged" : "Failed",
              });
              pushLog(get, set, "warn", String(err));
            });
          return;
        }
        const routing = activeRouting(get());
        if (routing !== "standard") {
          pushLog(get, set, "info", `Using ${routing} transport`);
        }
        runBootstrap(generation, get, set);
      },
      disconnect: () => {
        connectGeneration += 1;
        clearTimers();
        const native = getNative();
        if (native) {
          void native.disconnect();
          return;
        }
        const s = get();
        const blocked = s.killSwitch.enabled;
        set({
          status: blocked ? "blocked" : "disconnected",
          bootstrap: 0,
          bootstrapLabel: blocked ? "Kill switch engaged" : "Disconnected",
          circuit: blocked ? s.circuit : null,
          stats: { ...s.stats, connectedAt: null, samples: [] },
        });
        pushLog(
          get,
          set,
          blocked ? "warn" : "notice",
          blocked
            ? "Disconnected — kill switch is blocking traffic"
            : "Tor stopped",
        );
      },
      togglePower: () => {
        const { status } = get();
        if (status === "connected" || status === "connecting") get().disconnect();
        else get().connect();
      },
      newCircuit: (reason = "requested") => {
        const s = get();
        if (s.status !== "connected") return;
        const native = getNative();
        if (native) {
          pushLog(get, set, "notice", `New circuit (${reason})`);
          void native.newCircuit();
          return;
        }
        const circuit = buildCircuit(s);
        if (!circuit) return;
        set({
          circuit,
          stats: { ...s.stats, circuitsBuilt: s.stats.circuitsBuilt + 1 },
        });
        pushLog(get, set, "notice", `New circuit (${reason}): ${circuit.id.slice(0, 8)}`);
        pushLog(
          get,
          set,
          "info",
          circuit.hops.map((h) => h.relay.nickname).join(" → "),
        );
      },
      newIdentity: () => {
        const s = get();
        if (s.status !== "connected") return;
        const native = getNative();
        if (native) {
          set({ identity: s.identity + 1 });
          void native.newnym();
          return;
        }
        const circuit = buildCircuit(s);
        if (!circuit) return;
        set({
          circuit,
          identity: s.identity + 1,
          stats: {
            ...s.stats,
            circuitsBuilt: s.stats.circuitsBuilt + 1,
            bytesUp: 0,
            bytesDown: 0,
            samples: [],
            connectedAt: Date.now(),
          },
        });
        pushLog(get, set, "notice", "NEWNYM: new identity assigned");
        pushLog(
          get,
          set,
          "info",
          `Exit is now ${circuit.hops[2].relay.nickname} (${circuit.hops[2].relay.country}) ${circuit.hops[2].relay.address}`,
        );
      },
      applyNativeEvent: (ev) => {
        if (ev.type === "bootstrap") {
          const prev = get().bootstrapLabel;
          set({
            bootstrap: ev.progress,
            bootstrapLabel: ev.summary,
            status: "connecting",
          });
          if (ev.summary !== prev) {
            pushLog(get, set, "notice", `Bootstrapped ${ev.progress}%: ${ev.summary}`);
          }
          return;
        }
        if (ev.type === "connected") {
          const circuit = hopsToCircuit(ev.hops);
          const s = get();
          set({
            status: "connected",
            bootstrap: 100,
            bootstrapLabel: "Done",
            circuit: circuit ?? s.circuit,
            stats: {
              ...s.stats,
              connectedAt: Date.now(),
              circuitsBuilt: s.stats.circuitsBuilt + 1,
              samples: [],
            },
          });
          if (circuit) {
            pushLog(
              get,
              set,
              "info",
              circuit.hops.map((h) => h.relay.nickname).join(" → "),
            );
          }
          if (get().settings.minimizeToTray) {
            getNative()?.window.hide();
            set({ windowMode: "tray" });
          }
          return;
        }
        if (ev.type === "circuit") {
          const circuit = hopsToCircuit(ev.hops);
          if (!circuit) return;
          const s = get();
          set({
            circuit,
            stats: { ...s.stats, circuitsBuilt: s.stats.circuitsBuilt + 1 },
          });
          pushLog(
            get,
            set,
            "info",
            circuit.hops.map((h) => `${h.relay.nickname}`).join(" → "),
          );
          return;
        }
        if (ev.type === "log") {
          pushLog(get, set, ev.level, ev.message);
          return;
        }
        if (ev.type === "stats") {
          const s = get();
          const add = ev.bytesUp + ev.bytesDown;
          const samples = add > 0 ? [...s.stats.samples, add].slice(-36) : s.stats.samples;
          set({
            stats: {
              ...s.stats,
              bytesUp: s.stats.bytesUp + ev.bytesUp,
              bytesDown: s.stats.bytesDown + ev.bytesDown,
              samples,
            },
          });
          return;
        }
        if (ev.type === "status") {
          set({
            status: ev.status,
            bootstrapLabel: ev.label ?? get().bootstrapLabel,
            ...(ev.status === "disconnected" || ev.status === "blocked"
              ? {
                  stats: { ...get().stats, connectedAt: null, samples: [] },
                  netPath: ev.status === "disconnected" ? "none" : get().netPath,
                }
              : {}),
          });
          return;
        }
        if (ev.type === "error") {
          const blocked = get().killSwitch.enabled;
          set({
            status: blocked ? "blocked" : "disconnected",
            bootstrap: 0,
            bootstrapLabel: ev.message,
          });
          pushLog(get, set, "warn", ev.message);
          return;
        }
        if (ev.type === "exitip") {
          const c = get().circuit;
          pushLog(get, set, "notice", `Public exit IP ${ev.ip}`);
          if (!c) return;
          const [guard, middle, exit] = c.hops;
          set({
            circuit: {
              ...c,
              hops: [
                guard,
                middle,
                { ...exit, relay: { ...exit.relay, address: ev.ip } },
              ],
            },
          });
          return;
        }
        if (ev.type === "path") {
          set({ netPath: ev.path });
          pushLog(
            get,
            set,
            "notice",
            ev.path === "tun"
              ? "Path: Wintun + tun2socks (system-wide)"
              : "Path: Windows proxy (no administrator)",
          );
        }
      },
    }),
    {
      name: "torva-client",
      skipHydration: true,
      partialize: (s) => ({
        routing: s.routing,
        selectedGuardId: s.selectedGuardId,
        selectedExitId: s.selectedExitId,
        selectedExitCountry: s.selectedExitCountry,
        excludedCountries: s.excludedCountries,
        excludedRelays: s.excludedRelays,
        bridges: s.bridges,
        killSwitch: s.killSwitch,
        settings: s.settings,
      }),
    },
  ),
);
