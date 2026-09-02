import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TorvaMark } from "@/components/logo";
import { EULA_TEXT, EULA_TITLE, EULA_VERSION } from "@/lib/eula";
import { getNative } from "@/lib/tor/native";
import { useTorStore } from "@/lib/tor/store";

export function EulaGate() {
  const [checked, setChecked] = useState(false);
  const acceptEula = useTorStore((s) => s.acceptEula);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4 [-webkit-app-region:drag]">
        <TorvaMark className="size-6 text-primary" />
        <div className="[-webkit-app-region:no-drag]">
          <p className="text-sm font-medium tracking-tight">Torva VPN</p>
          <p className="text-2xs uppercase tracking-wider text-muted-foreground">
            License agreement
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 px-6 py-5">
        <div className="custom-scroll h-full overflow-y-auto rounded-xl bg-secondary/40 p-5 shadow-[var(--shadow-border)]">
          <h1 className="text-base font-medium tracking-tight">{EULA_TITLE}</h1>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
            {EULA_TEXT}
          </pre>
        </div>
      </div>

      <footer className="border-t border-border px-6 py-4">
        <label className="mb-4 flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-connected"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>
            I have read and accept the End User License Agreement
            <span className="block text-xs text-muted-foreground">
              Version {EULA_VERSION}
            </span>
          </span>
        </label>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              const native = getNative();
              if (native) native.window.quit();
            }}
          >
            Decline
          </Button>
          <Button disabled={!checked} onClick={() => acceptEula()}>
            Accept
          </Button>
        </div>
      </footer>
    </div>
  );
}
