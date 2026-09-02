import { Cloud, Globe2, Radio, Snowflake, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTorStore } from "@/lib/tor/store";
import type { Routing } from "@/lib/tor/types";
import { cn } from "@/lib/utils";

const TRANSPORTS: {
  id: Routing;
  title: string;
  hint: string;
  icon: typeof Snowflake;
}[] = [
  {
    id: "standard",
    title: "Direct",
    hint: "Public directory. Fastest when Tor is not blocked.",
    icon: Waypoints,
  },
  {
    id: "snowflake",
    title: "Snowflake",
    hint: "Volunteer browsers proxy you over WebRTC. Best for heavy censorship.",
    icon: Snowflake,
  },
  {
    id: "obfs4",
    title: "obfs4",
    hint: "Makes Tor look like random traffic. Needs bridge lines.",
    icon: Radio,
  },
  {
    id: "meek",
    title: "meek",
    hint: "Domain fronting through a large HTTPS site.",
    icon: Cloud,
  },
  {
    id: "webtunnel",
    title: "WebTunnel",
    hint: "Looks like ordinary HTTPS to a website.",
    icon: Globe2,
  },
];

export function BridgesPanel() {
  const routing = useTorStore((s) => s.routing);
  const bridges = useTorStore((s) => s.bridges);
  const setRouting = useTorStore((s) => s.setRouting);
  const patchBridges = useTorStore((s) => s.patchBridges);
  const status = useTorStore((s) => s.status);

  const needsLines = routing === "obfs4" || routing === "webtunnel";

  return (
    <div className="custom-scroll h-full overflow-y-auto">
      <header className="mb-5">
        <h2 className="text-lg font-medium tracking-tight">Bridges</h2>
        <p className="text-sm text-muted-foreground">
          Use a pluggable transport when the network blocks Tor.
        </p>
      </header>

      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3">
        <div>
          <Label htmlFor="auto-censor">My network blocks Tor</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Turns on Snowflake automatically if the directory is unreachable.
          </p>
        </div>
        <Switch
          id="auto-censor"
          checked={bridges.autoOnCensorship}
          onCheckedChange={(v) => {
            patchBridges({ autoOnCensorship: v });
            if (v) setRouting("snowflake");
            else setRouting("standard");
          }}
        />
      </div>

      <div className="grid gap-2">
        {TRANSPORTS.map((t) => {
          const Icon = t.icon;
          const active = routing === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setRouting(t.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl p-4 text-left transition-colors duration-(--motion-quick)",
                active ? "bg-secondary" : "bg-secondary/40 hover:bg-secondary/70",
              )}
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-lg",
                  active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {needsLines && (
        <div className="mt-5">
          <Label htmlFor="bridge-lines">Bridge lines</Label>
          <textarea
            id="bridge-lines"
            value={bridges.lines}
            onChange={(e) => patchBridges({ lines: e.target.value })}
            rows={5}
            className="mt-2 w-full resize-none rounded-lg bg-secondary p-3 font-mono text-xs leading-relaxed outline-none focus-visible:shadow-[var(--shadow-border-hover)]"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            One bridge per line. These sample lines are placeholders.
          </p>
        </div>
      )}

      {routing === "snowflake" && (
        <p className="mt-5 text-xs text-muted-foreground">
          Snowflake uses a broker to pair you with a short-lived volunteer proxy.
          No bridge lines required.
        </p>
      )}

      {status === "connected" && routing !== "standard" && (
        <p className="mt-5 rounded-lg bg-connected/10 px-3 py-2 text-xs text-connected">
          Connected via {routing}. Rebuild from Connect to apply a different transport.
        </p>
      )}

      <div className="mt-6">
        <Button
          variant="secondary"
          onClick={() => {
            setRouting("snowflake");
            patchBridges({ enabled: true, autoOnCensorship: true, type: "snowflake" });
          }}
        >
          Use recommended censored-network setup
        </Button>
      </div>
    </div>
  );
}
