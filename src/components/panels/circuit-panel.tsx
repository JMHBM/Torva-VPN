import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFingerprint, formatDuration } from "@/lib/tor/relays";
import { useTorStore } from "@/lib/tor/store";
import { useNow } from "@/components/use-now";
import { cn } from "@/lib/utils";

const ROLE_COPY = {
  guard: { title: "Guard", hint: "Your entry. Stays stable." },
  middle: { title: "Middle", hint: "Relays between ends." },
  exit: { title: "Exit", hint: "Where traffic leaves Tor." },
} as const;

export function CircuitPanel() {
  const status = useTorStore((s) => s.status);
  const circuit = useTorStore((s) => s.circuit);
  const logs = useTorStore((s) => s.logs);
  const newCircuit = useTorStore((s) => s.newCircuit);
  const now = useNow(status === "connected");

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Circuit</h2>
          <p className="text-sm text-muted-foreground">
            Three hops. No single relay sees both ends.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={status !== "connected"}
          onClick={() => newCircuit("user")}
        >
          Rebuild
        </Button>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        {(circuit?.hops ?? [null, null, null]).map((hop, i) => {
          const role = (["guard", "middle", "exit"] as const)[i]!;
          const meta = ROLE_COPY[role];
          return (
            <article
              key={role}
              className={cn(
                "rounded-xl bg-secondary/60 p-4",
                !hop && "opacity-50",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xs uppercase tracking-wider text-muted-foreground">
                  {meta.title}
                </span>
                {hop && <Badge variant="outline">{hop.relay.country}</Badge>}
              </div>
              <p className="mt-3 font-medium tracking-tight">
                {hop?.relay.nickname ?? "—"}
              </p>
              <p className="mt-1 font-mono text-2xs text-muted-foreground">
                {hop ? formatFingerprint(hop.relay.fingerprint).slice(0, 24) : meta.hint}
              </p>
              {hop && (
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  {hop.relay.address}:{hop.relay.orPort}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {circuit && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{circuit.id}</span>
          <ArrowRight className="size-3" />
          built {formatDuration(now - circuit.builtAt)} ago
        </p>
      )}

      <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-secondary/40">
        <div className="border-b border-border px-4 py-2 text-2xs uppercase tracking-wider text-muted-foreground">
          Tor log
        </div>
        <div className="custom-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-2xs leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No events yet.</p>
          ) : (
            [...logs].reverse().map((line) => (
              <p
                key={line.id}
                className={cn(
                  "log-line",
                  line.level === "warn" && "text-caution",
                  line.level === "notice" && "text-foreground/90",
                  line.level === "info" && "text-muted-foreground",
                )}
              >
                <span className="text-muted-foreground">
                  {new Date(line.at).toISOString().slice(11, 19)}
                </span>{" "}
                [{line.level}] {line.message}
              </p>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
