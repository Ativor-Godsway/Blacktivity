"use client";

import { useId, useMemo, useState } from "react";

/**
 * Single-series line with area fill, crosshair and tooltip.
 *
 * Single series means blue alone and no legend — the panel title names it.
 * Never dual-axis: two measures at different scales get two charts.
 */
export type Point = { label: string; value: number };

export function AreaChart({
  points,
  valueLabel,
  formatValue = (v: number) => v.toLocaleString(),
  height = 220,
}: {
  points: Point[];
  valueLabel: string;
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const W = 1000;
  const H = height;
  const PAD = { top: 12, right: 8, bottom: 26, left: 44 };

  const { max, ticks, coords, line, area } = useMemo(() => {
    const values = points.map((p) => p.value);
    const rawMax = Math.max(1, ...values);
    // Round up to a friendly tick so the axis reads cleanly.
    const mag = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const max = Math.ceil(rawMax / mag) * mag;

    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const coords = points.map((p, i) => {
      const x = PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
      const y = PAD.top + innerH - (p.value / max) * innerH;
      return { x, y, ...p };
    });

    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const area =
      coords.length > 0
        ? `${line} L${coords[coords.length - 1]!.x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${coords[0]!.x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`
        : "";

    const ticks = [0, 0.5, 1].map((t) => ({
      v: max * t,
      y: PAD.top + innerH - t * innerH,
    }));

    return { max, ticks, coords, line, area };
  }, [points, H]);

  if (points.length === 0) return null;

  const active = hover === null ? null : coords[hover];

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img"
           aria-label={`${valueLabel} over time`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t.y}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y}
                  stroke="var(--admin-rule)" strokeWidth="1" />
            <text x={PAD.left - 8} y={t.y + 4} textAnchor="end"
                  fill="var(--admin-muted)" fontSize="11" className="a-num">
              {Math.round(t.v).toLocaleString()}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="var(--series-1)" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" />

        {active ? (
          <>
            <line x1={active.x} x2={active.x} y1={PAD.top} y2={H - PAD.bottom}
                  stroke="var(--admin-ink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
            <circle cx={active.x} cy={active.y} r="4" fill="var(--series-1)"
                    stroke="var(--admin-surface)" strokeWidth="2" />
          </>
        ) : null}

        {coords.map((c, i) => {
          const half = coords.length > 1 ? (W - PAD.left - PAD.right) / (coords.length - 1) / 2 : W;
          return (
            <rect
              key={`hit-${c.label}`}
              x={c.x - half}
              width={half * 2}
              y={PAD.top}
              height={H - PAD.top - PAD.bottom}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          );
        })}

        {coords.map((c, i) =>
          i === 0 || i === coords.length - 1 ? (
            <text key={c.label} x={c.x} y={H - 8}
                  textAnchor={i === 0 ? "start" : "end"}
                  fill="var(--admin-muted)" fontSize="11">
              {c.label}
            </text>
          ) : null,
        )}
      </svg>

      {active ? (
        <div
          className="a-card pointer-events-none absolute top-2 z-10 px-3 py-2 text-[12px]"
          style={{
            left: `calc(${(active.x / W) * 100}% + 8px)`,
            transform: active.x / W > 0.72 ? "translateX(calc(-100% - 16px))" : undefined,
          }}
        >
          <p className="a-muted">{active.label}</p>
          <p className="a-num mt-0.5 font-medium">
            {formatValue(active.value)} {valueLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default AreaChart;
