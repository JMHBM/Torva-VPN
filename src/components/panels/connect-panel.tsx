import { ArrowDown, ArrowUp, RefreshCw, Shuffle } from "lucide-react";
import type { ReactNode } from "react";
import { PowerButton } from "@/components/power-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CircuitCanvas } from "@/components/circuit-canvas";
import { formatBytes, formatDuration } from "@/lib/tor/relays";
import { useTorStore } from "@/lib/tor/store";
import { useNow } from "@/components/use-now";

const STATUS_COPY: Record<string, { badge: "muted" | "connected" | "caution" | "danger"; label: string; hint: string }> = {
  disconnected: {
    badge: "muted",
    label: "Not connected",
    hint: "Traffic is leaving this device in the clear.",
  },
  connecting: {
    badge: "caution",
    label: "Connecting",
    hint: "Building a three-hop Tor circuit.",
  },
  connected: {
    badge: "connected",
    label: "Protected",
    hint: "All routed traffic is leaving through Tor.",
  },
  blocked: {
    badge: "danger",
    label: "Kill switch",
    hint: "Tor is down. Outbound traffic is blocked.",
  },
};

export function ConnectPanel() {
  const status = useTorStore((s) => s.status);
  const bootstrap = useTorStore((s) => s.bootstrap);
  const bootstrapLabel = useTorStore((s) => s.bootstrapLabel);
  const circuit = useTorStore((s) => s.circuit);
  const stats = useTorStore((s) => s.stats);
  const routing = useTorStore((s) => s.routing);
  const netPath = useTorStore((s) => s.netPath);
  const togglePower = useTorStore((s) => s.togglePower);
  const newCircuit = useTorStore((s) => s.newCircuit);
  const newIdentity = useTorStore((s) => s.newIdentity);
  const now = useNow(status === "connected");

  const copy = STATUS_COPY[status];
  const exit = circuit?.hops[2].relay;
  const elapsed =
    status === "connected" && stats.connectedAt
      ? formatDuration(now - stats.connectedAt)
      : "0:00";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative hidden min-h-0 flex-1 overflow-hidden rounded-xl bg-secondary/40 sm:block">
        <CircuitCanvas circuit={circuit} status={status} />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent to-card" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pt-4 pb-2 text-center sm:flex-none sm:pt-5 sm:pb-6">
        <Badge variant={copy.badge}>{copy.label}</Badge>
        <div className="mt-5">
          <PowerButton
            status={status}
            bootstrap={bootstrap}
            onClick={togglePower}
          />
        </div>
        <p className="mt-4 max-w-sm text-sm text-muted-foreground">
          {status === "connecting" ? bootstrapLabel : copy.hint}
        </p>
        {(status === "disconnected" || status === "blocked") &&
          bootstrapLabel &&
          bootstrapLabel !== "Disconnected" &&
          bootstrapLabel !== "Kill switch engaged" && (
            <p className="mt-2 max-w-sm text-xs text-caution">{bootstrapLabel}</p>
          )}
        {status === "connected" && exit && (
          <p className="mt-1 font-mono text-sm tabular text-foreground">
            {exit.address}
            <span className="text-muted-foreground"> · {exit.countryName}</span>
          </p>
        )}
        {status === "connected" && netPath && netPath !== "none" && (
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            {netPath === "tun" ? "Wintun · DNS over Tor · UDP dropped" : "Proxy path"}
          </p>
        )}
        {status === "connecting" && (
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            {routing === "standard" ? "Standard circuit" : routing}
          </p>
        )}

        <div className="mt-6 grid w-full max-w-md grid-cols-3 gap-2">
          <Stat
            label="Down"
            value={formatBytes(stats.bytesDown)}
            icon={<ArrowDown className="size-3" />}
          />
          <Stat
            label="Up"
            value={formatBytes(stats.bytesUp)}
            icon={<ArrowUp className="size-3" />}
          />
          <Stat label="Session" value={elapsed} />
        </div>

        <div className="mt-4 flex w-full max-w-md gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={status !== "connected"}
            onClick={() => newCircuit("user")}
          >
            <RefreshCw />
            New circuit
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={status !== "connected"}
            onClick={() => newIdentity()}
          >
            <Shuffle />
            New identity
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-secondary/70 px-3 py-2.5 text-left">
        <div className="flex items-center gap-1 text-2xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-sm tabular">{value}</div>
    </div>
  );
}
