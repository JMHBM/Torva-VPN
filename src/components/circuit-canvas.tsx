import type { Circuit, Status } from "@/lib/tor/types";
import { cn } from "@/lib/utils";

const CONTINENTS = [
  { cx: 220, cy: 168, rx: 92, ry: 62 },
  { cx: 290, cy: 318, rx: 48, ry: 78 },
  { cx: 508, cy: 148, rx: 58, ry: 42 },
  { cx: 528, cy: 248, rx: 52, ry: 72 },
  { cx: 700, cy: 168, rx: 130, ry: 78 },
  { cx: 820, cy: 330, rx: 48, ry: 32 },
];

export function CircuitCanvas({
  circuit,
  status,
}: {
  circuit: Circuit | null;
  status: Status;
}) {
  const hops = circuit?.hops;
  const live = status === "connected" && hops;

  return (
    <svg
      viewBox="0 0 1000 460"
      className="h-full w-full"
      aria-hidden="true"
    >
      <rect width="1000" height="460" fill="transparent" />
      {CONTINENTS.map((c, i) => (
        <ellipse
          key={i}
          {...c}
          fill="var(--color-foreground)"
          opacity={0.08}
        />
      ))}
      {[120, 240, 360, 480, 600, 720, 840].map((x) => (
        <line
          key={x}
          x1={x}
          y1="20"
          x2={x}
          y2="440"
          stroke="var(--color-foreground)"
          strokeOpacity="0.04"
        />
      ))}
      {[80, 160, 240, 320, 400].map((y) => (
        <line
          key={y}
          x1="40"
          y1={y}
          x2="960"
          y2={y}
          stroke="var(--color-foreground)"
          strokeOpacity="0.04"
        />
      ))}

      {live ? (
        <>
          <polyline
            fill="none"
            stroke="var(--color-connected)"
            strokeOpacity="0.55"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            className="dash-flow"
            points={hops
              .map((h) => `${h.relay.x},${h.relay.y}`)
              .join(" ")}
          />
          {hops.map((h) => (
            <g key={h.role}>
              <circle
                cx={h.relay.x}
                cy={h.relay.y}
                r="18"
                fill="var(--color-connected)"
                fillOpacity="0.12"
              />
              <circle
                cx={h.relay.x}
                cy={h.relay.y}
                r="5"
                fill="var(--color-connected)"
              />
              <text
                x={h.relay.x + 12}
                y={h.relay.y - 10}
                fill="var(--color-foreground)"
                fontSize="12"
                fontFamily="var(--font-sans)"
              >
                {h.relay.country} · {h.role}
              </text>
            </g>
          ))}
        </>
      ) : null}
    </svg>
  );
}
