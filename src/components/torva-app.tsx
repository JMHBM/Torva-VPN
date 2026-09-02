import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { EulaGate } from "@/components/eula-gate";
import { DesktopShell } from "@/components/desktop-shell";
import { AppsPanel } from "@/components/panels/apps-panel";
import { BridgesPanel } from "@/components/panels/bridges-panel";
import { CircuitPanel } from "@/components/panels/circuit-panel";
import { ConnectPanel } from "@/components/panels/connect-panel";
import { RelaysPanel } from "@/components/panels/relays-panel";
import { SettingsPanel } from "@/components/panels/settings-panel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EULA_VERSION } from "@/lib/eula";
import { getNative } from "@/lib/tor/native";
import { useTorStore } from "@/lib/tor/store";

export function TorvaApp() {
  const view = useTorStore((s) => s.view);
  const hydrated = useTorStore((s) => s.hydrated);
  const eulaAccepted = useTorStore((s) => s.settings.eulaAccepted);
  const eulaVersion = useTorStore((s) => s.settings.eulaVersion);
  const licenseOk = eulaAccepted && eulaVersion >= EULA_VERSION;

  useEffect(() => {
    void useTorStore.persist.rehydrate();
    useTorStore.getState().setHydrated();
  }, []);

  useEffect(() => {
    const native = getNative();
    if (!native) return;
    return native.onEvent((ev) => {
      useTorStore.getState().applyNativeEvent(ev);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const { settings, connect } = useTorStore.getState();
    if (settings.autoConnect && settings.eulaAccepted && settings.eulaVersion >= EULA_VERSION) {
      connect();
    }
  }, [hydrated]);

  useEffect(() => {
    let prev = useTorStore.getState().status;
    return useTorStore.subscribe((s) => {
      if (s.status === prev) return;
      const from = prev;
      prev = s.status;
      if (!s.settings.notifications) return;
      if (s.status === "connected") toast.success("Connected to Tor");
      else if (s.status === "blocked") toast.error("Kill switch engaged");
      else if (s.status === "disconnected" && from === "connected") {
        toast("Disconnected");
      }
    });
  }, []);

  return (
    <TooltipProvider>
      {!hydrated ? (
        <div className="h-full bg-background" />
      ) : !licenseOk ? (
        <EulaGate />
      ) : (
        <DesktopShell>
          {view === "connect" && <ConnectPanel />}
          {view === "circuit" && <CircuitPanel />}
          {view === "relays" && <RelaysPanel />}
          {view === "bridges" && <BridgesPanel />}
          {view === "apps" && <AppsPanel />}
          {view === "settings" && <SettingsPanel />}
        </DesktopShell>
      )}
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          className:
            "!bg-popover !text-popover-foreground !shadow-[var(--shadow-border)] !border-0",
        }}
      />
    </TooltipProvider>
  );
}
