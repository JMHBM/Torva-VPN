import { cn } from "@/lib/utils";

export function TorvaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-5", className)}
      aria-hidden="true"
    >
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.4"
      />
      <circle
        cx="16"
        cy="16"
        r="9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.7"
      />
      <circle cx="16" cy="16" r="4.5" fill="currentColor" />
    </svg>
  );
}

export function TorvaWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-foreground">
      <TorvaMark className="size-5 text-primary" />
      {!compact && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-sm font-medium tracking-tight">Torva</span>
          <span className="text-2xs font-medium tracking-wider text-muted-foreground">
            VPN
          </span>
        </span>
      )}
    </div>
  );
}
