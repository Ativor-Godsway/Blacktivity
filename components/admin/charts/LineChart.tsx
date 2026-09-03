import { cn } from "@/lib/utils";

/**
 * Hand-rolled SVG. Series are differentiated by STROKE WEIGHT and DASH PATTERN,
 * never by hue — a coloured chart would break the one rule of the whole site.
 */
export type Series = {
  label: string;
  values: number[];
  /** Solid heavier stroke reads as primary; dashed lighter as secondary. */
  variant: "primary" | "secondary";
};

export function LineChart({
  series,
  labels,
  height = 220,
  className,
}: {
  series: Series[];
  labels: string[];
  height?: number;
  className?: string;
}) {
  const width = 1000;
  const pad = { top: 12, right: 4, bottom: 4, left: 4 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const count = Math.max(1, labels.length - 1);

  const x = (i: number) => pad.left + (i / count) * innerW;
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const path = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");

  const area = (values: number[]) =>
    values.length === 0
      ? ""
      : `${path(values)} L${x(values.length - 1).toFixed(2)},${(pad.top + innerH).toFixed(2)} L${x(0).toFixed(2)},${(pad.top + innerH).toFixed(2)} Z`;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-[220px] w-full"
        role="img"
        aria-label={`${series.map((s) => s.label).join(" and ")} across ${labels.length} days`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + innerH * g}
            y2={pad.top + innerH * g}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {series.map((s) =>
          s.variant === "primary" ? (
            <path key={`${s.label}-area`} d={area(s.values)} fill="rgba(255,255,255,0.07)" />
          ) : null,
        )}

        {series.map((s) => (
          <path
            key={s.label}
            d={path(s.values)}
            fill="none"
            stroke="#ffffff"
            strokeWidth={s.variant === "primary" ? 2 : 1}
            strokeOpacity={s.variant === "primary" ? 1 : 0.45}
            strokeDasharray={s.variant === "primary" ? undefined : "4 4"}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {series.map((s) => (
            <span key={s.label} className="mono flex items-center gap-2 text-fg-muted">
              <svg width="22" height="6" aria-hidden="true">
                <line
                  x1="0"
                  y1="3"
                  x2="22"
                  y2="3"
                  stroke="#ffffff"
                  strokeWidth={s.variant === "primary" ? 2 : 1}
                  strokeOpacity={s.variant === "primary" ? 1 : 0.45}
                  strokeDasharray={s.variant === "primary" ? undefined : "4 4"}
                />
              </svg>
              {s.label}
            </span>
          ))}
        </div>
        <span className="mono text-fg-faint">Peak {max.toLocaleString()}</span>
      </div>

      <div className="mt-2 flex justify-between">
        <span className="mono text-fg-faint">{labels[0]}</span>
        <span className="mono text-fg-faint">{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

export default LineChart;
