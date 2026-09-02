import { Lock, Power, ShieldCheck } from "lucide-react";
import type { Status } from "@/lib/tor/types";
import { cn } from "@/lib/utils";

export function PowerButton({
  status,
  bootstrap,
  onClick,
}: {
  status: Status;
  bootstrap: number;
  onClick: () => void;
}) {
  const label =
    status === "connected"
      ? "Disconnect from Tor"
      : status === "connecting"
        ? "Cancel connection"
        : status === "blocked"
          ? "Reconnect to Tor"
          : "Connect to Tor";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "group relative grid size-44 place-items-center rounded-full outline-none",
        "transition-transform duration-(--motion-quick) ease-(--ease-out)",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        "active:scale-[0.97] sm:size-48",
      )}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full",
          status === "connecting" && "onion-spin pulse-ring",
        )}
        style={{
          boxShadow:
            status === "connected"
              ? "0 0 0 1px color-mix(in oklab, var(--color-connected) 55%, transparent), 0 0 48px color-mix(in oklab, var(--color-connected) 22%, transparent)"
              : status === "blocked"
                ? "0 0 0 1px color-mix(in oklab, var(--color-destructive) 50%, transparent)"
                : "0 0 0 1px color-mix(in oklab, var(--color-foreground) 12%, transparent)",
        }}
      />
      <span
        className={cn(
          "absolute inset-3 rounded-full",
          status === "connecting" && "onion-spin-rev",
        )}
        style={{
          boxShadow:
            status === "connected"
              ? "0 0 0 1px color-mix(in oklab, var(--color-connected) 40%, transparent)"
              : "0 0 0 1px color-mix(in oklab, var(--color-foreground) 10%, transparent)",
        }}
      />
      <span
        className="absolute inset-6 rounded-full"
        style={{
          boxShadow: "0 0 0 1px color-mix(in oklab, var(--color-foreground) 8%, transparent)",
        }}
      />
      {status === "connecting" && (
        <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="var(--color-connected)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(2, bootstrap * 2.95)} 295`}
            className="transition-[stroke-dasharray] duration-(--motion-fast)"
          />
        </svg>
      )}
      <span
        className={cn(
          "relative grid size-24 place-items-center rounded-full sm:size-28",
          "transition-[background-color,color,box-shadow] duration-(--motion-fast) ease-(--ease-out)",
          status === "connected" && "bg-connected text-connected-foreground",
          status === "connecting" && "bg-secondary text-foreground",
          status === "blocked" && "bg-destructive/20 text-destructive",
          status === "disconnected" &&
            "bg-secondary text-muted-foreground group-hover:text-foreground",
        )}
      >
        {status === "connecting" ? (
          <span className="text-xl font-medium tabular tracking-tight">
            {bootstrap}
          </span>
        ) : status === "connected" ? (
          <ShieldCheck className="size-9" strokeWidth={1.5} />
        ) : status === "blocked" ? (
          <Lock className="size-8" strokeWidth={1.5} />
        ) : (
          <Power className="size-9" strokeWidth={1.5} />
        )}
      </span>
    </button>
  );
}
