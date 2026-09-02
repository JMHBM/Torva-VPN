import { Label } from "@/components/ui/label";
import type { ReactNode } from "react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { EULA_TEXT, EULA_TITLE, EULA_VERSION } from "@/lib/eula";
import { getNative } from "@/lib/tor/native";
import { useTorStore } from "@/lib/tor/store";
import { bridgesNeeded, buildTorrc } from "@/lib/tor/torrc";

export function SettingsPanel() {
  const settings = useTorStore((s) => s.settings);
  const patch = useTorStore((s) => s.patchSettings);
  const routing = useTorStore((s) => s.routing);
  const selectedExitCountry = useTorStore((s) => s.selectedExitCountry);
  const excludedCountries = useTorStore((s) => s.excludedCountries);
  const bridges = useTorStore((s) => s.bridges);

  const torrc = buildTorrc({
    settings,
    routing,
    selectedExitCountry,
    excludedCountries,
    bridgesEnabled: bridgesNeeded(routing, bridges),
    transport: routing,
  });
  const native = Boolean(getNative());
  const [showLicense, setShowLicense] = useState(false);

  return (
    <div className="custom-scroll h-full overflow-y-auto pb-4">
      <header className="mb-5">
        <h2 className="text-lg font-medium tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Quiet defaults. One click stays one click.
        </p>
      </header>

      <Section title="Window">
        <Row
          id="min-tray"
          label="Minimize to tray when connected"
          hint="Hides the window after the circuit is built."
          checked={settings.minimizeToTray}
          onChange={(v) => patch({ minimizeToTray: v })}
        />
        <Row
          id="close-tray"
          label="Close button hides to tray"
          hint="Torva keeps running until you disconnect and quit."
          checked={settings.closeToTray}
          onChange={(v) => patch({ closeToTray: v })}
        />
        <Row
          id="auto"
          label="Connect on launch"
          hint="Builds a circuit as soon as Torva starts."
          checked={settings.autoConnect}
          onChange={(v) => patch({ autoConnect: v })}
        />
        <Row
          id="startup"
          label="Start with Windows"
          hint="Opens with your session. Pairs with connect on launch."
          checked={settings.startWithSystem}
          onChange={(v) => patch({ startWithSystem: v })}
        />
        <Row
          id="notify"
          label="Status notifications"
          hint="Tray alerts on connect, drop, and new identity."
          checked={settings.notifications}
          onChange={(v) => patch({ notifications: v })}
        />
      </Section>

      <Section title="Circuit">
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <Label>New circuit every {settings.newCircuitMinutes} min</Label>
            <span className="font-mono text-xs tabular text-muted-foreground">
              MaxCircuitDirtiness
            </span>
          </div>
          <Slider
            min={2}
            max={30}
            step={1}
            value={[settings.newCircuitMinutes]}
            onValueChange={([v]) =>
              patch({ newCircuitMinutes: v ?? 10, maxCircuitDirtiness: v ?? 10 })
            }
          />
        </div>
        <Row
          id="guards"
          label="Use entry guards"
          hint="Keeps a small set of guards so the network cannot map you easily."
          checked={settings.useEntryGuards}
          onChange={(v) => patch({ useEntryGuards: v })}
        />
        <Row
          id="iso-dest"
          label="Isolate by destination"
          hint="Separate circuits per destination (IsolateDestAddr on the SOCKS port)."
          checked={settings.isolateDestinations}
          onChange={(v) => patch({ isolateDestinations: v })}
        />
        <Row
          id="iso-socks"
          label="Isolate SOCKS auth"
          hint="Each app or SOCKS username gets its own circuits (stream isolation)."
          checked={settings.isolateSocksAuth}
          onChange={(v) => patch({ isolateSocksAuth: v })}
        />
        <Row
          id="ipv6"
          label="IPv6 through Tor"
          hint="Off by default to avoid dual-stack leaks."
          checked={settings.ipv6}
          onChange={(v) => patch({ ipv6: v })}
        />
        <Row
          id="disk"
          label="Avoid disk writes"
          hint="Keep state in memory where possible."
          checked={settings.avoidDiskWrites}
          onChange={(v) => patch({ avoidDiskWrites: v })}
        />
        <Row
          id="tun"
          label="System-wide TUN (Wintun)"
          hint="Needs administrator once. Routes TCP through Tor, resolves DNS on DNSPort, drops other UDP."
          checked={settings.systemTun !== false}
          onChange={(v) => patch({ systemTun: v })}
        />
      </Section>

      <Section title="Legal">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent/60"
          onClick={() => setShowLicense((v) => !v)}
        >
          <span>
            <span className="block font-medium">End User License Agreement</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Version {EULA_VERSION}. Accepted on this device.
            </span>
          </span>
          <span className="text-xs text-muted-foreground">{showLicense ? "Hide" : "View"}</span>
        </button>
        {showLicense ? (
          <pre className="max-h-64 overflow-auto border-t border-border px-4 py-3 font-sans text-2xs leading-relaxed text-muted-foreground">
            {EULA_TITLE}

            {EULA_TEXT}
          </pre>
        ) : null}
      </Section>

      <Section title="Generated torrc">
        <pre className="overflow-x-auto px-4 py-3 font-mono text-2xs leading-relaxed text-muted-foreground">
          {torrc}
        </pre>
      </Section>

      <p className="mt-5 px-1 text-xs text-muted-foreground">
        {native
          ? "Torva runs the Tor expert bundle. Connect waits until bootstrap is 100% before touching Windows. Then it uses Tor's HTTPTunnelPort (127.0.0.1:9080) or Wintun. Quitting always restores the internet."
          : "Torva VPN is a Tor-first client. This preview drives a local engine so you can learn every control. The Windows build routes traffic through Tor on your PC."}
      </p>
      {native ? (
        <button
          type="button"
          className="mt-4 h-10 w-full rounded-md bg-secondary text-sm font-medium hover:bg-accent"
          onClick={() => getNative()?.restoreProxy?.()}
        >
          Restore Windows internet
        </button>
      ) : null}
      {native ? (
        <button
          type="button"
          className="mt-4 h-10 w-full rounded-md bg-secondary text-sm font-medium hover:bg-accent"
          onClick={() => getNative()?.window.quit()}
        >
          Quit Torva
        </button>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 px-1 text-2xs uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="overflow-hidden rounded-xl bg-secondary/50">{children}</div>
    </section>
  );
}

function Row({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
