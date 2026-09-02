import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COUNTRIES, EXIT_COUNTRIES, formatBandwidth, RELAYS, shortFp } from "@/lib/tor/relays";
import { useTorStore } from "@/lib/tor/store";
import { cn } from "@/lib/utils";

export function RelaysPanel() {
  const [q, setQ] = useState("");
  const selectedGuardId = useTorStore((s) => s.selectedGuardId);
  const selectedExitId = useTorStore((s) => s.selectedExitId);
  const selectedExitCountry = useTorStore((s) => s.selectedExitCountry);
  const excludedCountries = useTorStore((s) => s.excludedCountries);
  const excludedRelays = useTorStore((s) => s.excludedRelays);
  const setExitCountry = useTorStore((s) => s.setExitCountry);
  const setGuard = useTorStore((s) => s.setGuard);
  const setExit = useTorStore((s) => s.setExit);
  const toggleExcludeCountry = useTorStore((s) => s.toggleExcludeCountry);
  const toggleExcludeRelay = useTorStore((s) => s.toggleExcludeRelay);
  const strictNodes = useTorStore((s) => s.settings.strictNodes);
  const patchSettings = useTorStore((s) => s.patchSettings);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return RELAYS.filter((r) => {
      if (!query) return true;
      return (
        r.nickname.toLowerCase().includes(query) ||
        r.country.toLowerCase().includes(query) ||
        r.countryName.toLowerCase().includes(query) ||
        r.fingerprint.toLowerCase().includes(query)
      );
    });
  }, [q]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header>
        <h2 className="text-lg font-medium tracking-tight">Relays</h2>
        <p className="text-sm text-muted-foreground">
          Leave on Auto, or pin a guard, exit, and country.
        </p>
      </header>

      <div>
            <p className="mb-2 text-2xs uppercase tracking-wider text-muted-foreground">
          Exit country
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            active={selectedExitCountry === "auto"}
            onClick={() => setExitCountry("auto")}
          >
            Auto
          </Chip>
          {EXIT_COUNTRIES.map((c) => (
            <Chip
              key={c.code}
              active={selectedExitCountry === c.code}
              onClick={() => setExitCountry(c.code)}
            >
              {c.code}
            </Chip>
          ))}
        </div>
      </div>

      <div>
            <p className="mb-2 text-2xs uppercase tracking-wider text-muted-foreground">
          Exclude countries
        </p>
        <div className="flex flex-wrap gap-1.5">
          {COUNTRIES.map((c) => (
            <Chip
              key={c.code}
              danger={excludedCountries.includes(c.code)}
              onClick={() => toggleExcludeCountry(c.code)}
            >
              {c.code}
            </Chip>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-connected"
            checked={strictNodes}
            onChange={(e) => patchSettings({ strictNodes: e.target.checked })}
          />
          StrictNodes — never fall back to excluded relays
        </label>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search nickname, country, fingerprint"
          className="h-10 w-full rounded-lg bg-secondary pr-3 pl-10 text-sm outline-none ring-0 placeholder:text-muted-foreground focus-visible:shadow-[var(--shadow-border-hover)]"
        />
      </div>

      <div className="custom-scroll min-h-0 flex-1 overflow-y-auto rounded-xl bg-secondary/40">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-card text-2xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Relay</th>
              <th className="px-3 py-2 font-medium">Flags</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">BW</th>
              <th className="px-3 py-2 font-medium">Pin</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const excluded = excludedRelays.includes(r.id);
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "border-t border-border",
                    excluded && "opacity-40",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{r.nickname}</div>
                    <div className="font-mono text-2xs text-muted-foreground">
                      {r.country} · {shortFp(r.fingerprint)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r.flags.includes("Guard") && (
                        <Badge variant="outline">Guard</Badge>
                      )}
                      {r.flags.includes("Exit") && (
                        <Badge variant="outline">Exit</Badge>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 font-mono text-xs tabular text-muted-foreground sm:table-cell">
                    {formatBandwidth(r.bandwidth)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r.flags.includes("Guard") && (
                        <Button
                          size="sm"
                          variant={selectedGuardId === r.id ? "default" : "ghost"}
                          onClick={() =>
                            setGuard(selectedGuardId === r.id ? "auto" : r.id)
                          }
                        >
                          Guard
                        </Button>
                      )}
                      {r.flags.includes("Exit") && (
                        <Button
                          size="sm"
                          variant={selectedExitId === r.id ? "default" : "ghost"}
                          onClick={() =>
                            setExit(selectedExitId === r.id ? "auto" : r.id)
                          }
                        >
                          Exit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={excluded ? "destructive" : "ghost"}
                        onClick={() => toggleExcludeRelay(r.id)}
                      >
                        {excluded ? "Allow" : "Skip"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chip({
  active,
  danger,
  onClick,
  children,
}: {
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 min-w-8 rounded-full px-3 text-xs font-medium transition-colors duration-(--motion-quick)",
        danger
          ? "bg-destructive/20 text-destructive"
          : active
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
