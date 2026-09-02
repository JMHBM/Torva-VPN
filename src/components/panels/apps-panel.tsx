import {
  Gamepad2,
  Globe,
  Mail,
  MessageSquare,
  Folder,
  Briefcase,
  Music,
} from "lucide-react";
import { APPS } from "@/lib/tor/apps";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTorStore } from "@/lib/tor/store";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Globe> = {
  Browser: Globe,
  Mail: Mail,
  Chat: MessageSquare,
  Media: Music,
  Games: Gamepad2,
  Files: Folder,
  Work: Briefcase,
};

export function AppsPanel() {
  const kill = useTorStore((s) => s.killSwitch);
  const status = useTorStore((s) => s.status);
  const patchKill = useTorStore((s) => s.patchKill);
  const toggleBlockedApp = useTorStore((s) => s.toggleBlockedApp);

  return (
    <div className="custom-scroll h-full overflow-y-auto">
      <header className="mb-5">
        <h2 className="text-lg font-medium tracking-tight">Kill switch</h2>
        <p className="text-sm text-muted-foreground">
          Block traffic if Tor drops — for everything, or only chosen apps.
        </p>
      </header>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3">
        <div>
          <Label htmlFor="ks">Kill switch</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            {status === "blocked"
              ? "Engaged. Nothing listed is allowed out."
              : "Recommended. Prevents leaks on disconnect."}
          </p>
        </div>
        <Switch
          id="ks"
          checked={kill.enabled}
          onCheckedChange={(v) => patchKill({ enabled: v })}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <ModeCard
          title="All traffic"
          hint="If Tor drops while Torva is open, Windows stays fail-closed. Quitting always restores the internet."
          active={kill.mode === "all"}
          onClick={() => patchKill({ mode: "all" })}
        />
        <ModeCard
          title="Selected apps"
          hint="Only the apps below are forced through Tor."
          active={kill.mode === "selected"}
          onClick={() => patchKill({ mode: "selected" })}
        />
      </div>

      <label className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3 text-sm">
        <span>
          Allow LAN
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Printers, NAS, and local devices stay reachable.
          </span>
        </span>
        <Switch
          checked={kill.allowLan}
          onCheckedChange={(v) => patchKill({ allowLan: v })}
        />
      </label>

      <p className="mb-2 text-2xs uppercase tracking-wider text-muted-foreground">
        {kill.mode === "all" ? "Also blocked when Tor is down" : "Forced through Tor"}
      </p>

      <ul className="grid gap-1.5">
        {APPS.map((app) => {
          const Icon = ICONS[app.category] ?? Globe;
          const on = kill.blockedApps.includes(app.id);
          return (
            <li key={app.id}>
              <button
                type="button"
                onClick={() => toggleBlockedApp(app.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-(--motion-quick)",
                  on ? "bg-secondary" : "bg-secondary/30 hover:bg-secondary/60",
                )}
              >
                <span className="grid size-9 place-items-center rounded-lg bg-card text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{app.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {app.publisher}
                  </span>
                </span>
                <span
                  className={cn(
                    "size-4 rounded-full shadow-[var(--shadow-border)]",
                    on && "bg-connected",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ModeCard({
  title,
  hint,
  active,
  onClick,
}: {
  title: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl p-4 text-left transition-colors duration-(--motion-quick)",
        active ? "bg-secondary" : "bg-secondary/40 hover:bg-secondary/70",
      )}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}
