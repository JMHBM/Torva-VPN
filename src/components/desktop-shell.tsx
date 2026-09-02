import {
  Globe2,
  Minus,
  Power,
  Settings,
  ShieldBan,
  Snowflake,
  Square,
  Waypoints,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { TorvaMark, TorvaWordmark } from "@/components/logo";
import { useNow } from "@/components/use-now";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getNative } from "@/lib/tor/native";
import { useTorStore } from "@/lib/tor/store";
import type { Status, View } from "@/lib/tor/types";
import { cn } from "@/lib/utils";

const NAV: { id: View; label: string; icon: typeof Power }[] = [
  { id: "connect", label: "Connect", icon: Power },
  { id: "circuit", label: "Circuit", icon: Waypoints },
  { id: "relays", label: "Relays", icon: Globe2 },
  { id: "bridges", label: "Bridges", icon: Snowflake },
  { id: "apps", label: "Kill switch", icon: ShieldBan },
  { id: "settings", label: "Settings", icon: Settings },
];

function statusDot(status: Status) {
  if (status === "connected") return "bg-connected";
  if (status === "connecting") return "bg-caution";
  if (status === "blocked") return "bg-destructive";
  return "bg-muted-foreground/50";
}

export function DesktopShell({ children }: { children: ReactNode }) {
  const view = useTorStore((s) => s.view);
  const setView = useTorStore((s) => s.setView);
  const windowMode = useTorStore((s) => s.windowMode);
  const setWindowMode = useTorStore((s) => s.setWindowMode);
  const status = useTorStore((s) => s.status);
  const circuit = useTorStore((s) => s.circuit);
  const restoreWindow = useTorStore((s) => s.restoreWindow);
  const disconnect = useTorStore((s) => s.disconnect);
  const connect = useTorStore((s) => s.connect);
  const newIdentity = useTorStore((s) => s.newIdentity);

  const inTray = windowMode === "tray";
  const maximized = windowMode === "maximized";
  const exit = circuit?.hops[2].relay;
  const native = Boolean(getNative());

  const chrome = (
    <>
      <TitleBar
        status={status}
        maximized={maximized}
        native={native}
        onMinimize={() => {
          if (native) getNative()?.window.hide();
          setWindowMode("tray");
        }}
        onMaximize={() => {
          if (native) getNative()?.window.maximize();
          setWindowMode(maximized ? "normal" : "maximized");
        }}
        onClose={() => {
          if (native) getNative()?.window.close();
          else setWindowMode("tray");
        }}
      />
      <div className="flex min-h-0 flex-1">
        <nav className="torva-rail hidden shrink-0 flex-col items-center gap-1 border-r border-border py-3 sm:flex [-webkit-app-region:no-drag]">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setView(item.id)}
                    className={cn(
                      "grid size-12 place-items-center rounded-lg transition-colors duration-(--motion-quick)",
                      active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                  >
                    <Icon className="size-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
        <main className="min-h-0 min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-6">
          {children}
        </main>
      </div>
    </>
  );

  if (native) {
    return (
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-card text-card-foreground">
        {chrome}
        <nav className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 sm:hidden">
          <div className="flex w-full max-w-md justify-around rounded-xl bg-secondary p-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={cn(
                    "grid size-11 place-items-center rounded-lg",
                    active ? "bg-accent text-foreground" : "text-muted-foreground",
                  )}
                  aria-label={item.label}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="desktop-grain relative flex min-h-dvh flex-col overflow-hidden">
      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center p-0 sm:p-6 sm:pb-20",
          inTray && "max-sm:hidden sm:pointer-events-none",
        )}
      >
        <div
          className={cn(
            "torva-window flex min-h-0 flex-col overflow-hidden bg-card text-card-foreground sm:shadow-[var(--shadow-window)]",
            "transition-[transform,opacity] duration-(--motion-fast) ease-(--ease-smooth-out)",
            maximized && "is-max",
            inTray ? "sm:scale-95 sm:opacity-0" : "scale-100 opacity-100",
          )}
        >
          <TitleBar
            status={status}
            maximized={maximized}
            native={false}
            onMinimize={() => setWindowMode("tray")}
            onMaximize={() =>
              setWindowMode(maximized ? "normal" : "maximized")
            }
            onClose={() => setWindowMode("tray")}
          />
          <div className="flex min-h-0 flex-1">
            <nav className="torva-rail hidden shrink-0 flex-col items-center gap-1 border-r border-border py-3 sm:flex">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setView(item.id)}
                        className={cn(
                          "grid size-12 place-items-center rounded-lg transition-colors duration-(--motion-quick)",
                          active
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                        aria-current={active ? "page" : undefined}
                        aria-label={item.label}
                      >
                        <Icon className="size-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
            <main className="min-h-0 min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-6">
              {children}
            </main>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 sm:hidden">
        <div className="flex w-full max-w-md justify-around rounded-xl bg-card p-1 shadow-[var(--shadow-window)]">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  restoreWindow();
                  setView(item.id);
                }}
                className={cn(
                  "grid size-11 place-items-center rounded-lg",
                  active ? "bg-secondary text-foreground" : "text-muted-foreground",
                )}
                aria-label={item.label}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      </nav>

      <footer className="absolute inset-x-0 bottom-0 z-40 hidden h-12 bg-taskbar/90 shadow-[0_-1px_0_rgb(255_255_255_/_0.06)] sm:block">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-3">
          <div className="flex items-center gap-1">
            <span className="grid size-10 place-items-center rounded-md text-muted-foreground">
              <TorvaMark className="size-4 opacity-70" />
            </span>
            <button
              type="button"
              onClick={() =>
                inTray ? restoreWindow() : setWindowMode("tray")
              }
              className={cn(
                "grid size-10 place-items-center rounded-md",
                !inTray && "bg-accent",
              )}
              aria-label="Show Torva VPN"
            >
              <TorvaMark className="size-5 text-primary" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (inTray ? restoreWindow() : setWindowMode("tray"))}
              className="flex h-8 items-center gap-2 rounded-md px-2 hover:bg-accent"
              aria-label="Tray status"
            >
              <span className={cn("size-2 rounded-full", statusDot(status))} />
              <span className="text-xs text-muted-foreground">
                {status === "connected"
                  ? exit
                    ? exit.countryName
                    : "Protected"
                  : status === "connecting"
                    ? "Connecting"
                    : status === "blocked"
                      ? "Blocked"
                      : "Torva"}
              </span>
            </button>
            <Clock />
          </div>
        </div>
      </footer>

      {inTray && (
        <div className="absolute right-3 bottom-20 z-50 w-80 rounded-xl bg-card p-4 shadow-[var(--shadow-window)] sm:right-8 sm:bottom-14">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Torva VPN</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {status === "connected"
                  ? `Protected · ${exit?.countryName ?? "Tor"}`
                  : status === "connecting"
                    ? "Connecting…"
                    : status === "blocked"
                      ? "Kill switch blocking traffic"
                      : "Not connected"}
              </p>
            </div>
            <span className={cn("mt-1 size-2.5 rounded-full", statusDot(status))} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="h-9 rounded-md bg-secondary text-xs font-medium hover:bg-accent"
              onClick={() => restoreWindow()}
            >
              Show window
            </button>
            {status === "connected" ? (
              <button
                type="button"
                className="h-9 rounded-md bg-secondary text-xs font-medium hover:bg-accent"
                onClick={() => disconnect()}
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                className="h-9 rounded-md bg-primary text-xs font-medium text-primary-foreground"
                onClick={() => {
                  restoreWindow();
                  connect();
                }}
              >
                Connect
              </button>
            )}
            <button
              type="button"
              className="col-span-2 h-9 rounded-md bg-secondary text-xs font-medium hover:bg-accent disabled:opacity-40"
              disabled={status !== "connected"}
              onClick={() => newIdentity()}
            >
              New identity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Clock() {
  const now = useNow(true);
  return (
    <span className="font-mono text-xs tabular text-muted-foreground">
      {new Date(now).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

function TitleBar({
  status,
  maximized,
  native,
  onMinimize,
  onMaximize,
  onClose,
}: {
  status: Status;
  maximized: boolean;
  native?: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}) {
  return (
    <header
      className={cn(
        "flex h-11 shrink-0 items-center border-b border-border",
        native && "[-webkit-app-region:drag]",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
        <TorvaWordmark />
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {status === "connected"
            ? "Protected"
            : status === "connecting"
              ? "Connecting"
              : status === "blocked"
                ? "Kill switch"
                : "Ready"}
        </span>
      </div>
      <div className={cn("flex", native && "[-webkit-app-region:no-drag]")}>
        <CaptionBtn label="Minimize" onClick={onMinimize}>
          <Minus className="size-3.5" />
        </CaptionBtn>
        <CaptionBtn
          label={maximized ? "Restore" : "Maximize"}
          onClick={onMaximize}
        >
          <Square className="size-3" />
        </CaptionBtn>
        <CaptionBtn label="Close" onClick={onClose} close>
          <X className="size-3.5" />
        </CaptionBtn>
      </div>
    </header>
  );
}

function CaptionBtn({
  children,
  onClick,
  label,
  close,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  close?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-11 w-11 place-items-center text-muted-foreground transition-colors duration-(--motion-quick)",
        close
          ? "hover:bg-window-close hover:text-foreground"
          : "hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
