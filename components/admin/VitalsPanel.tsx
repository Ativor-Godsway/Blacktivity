import MonoLabel from "@/components/ui/MonoLabel";
import { cn } from "@/lib/utils";

/**
 * Core Web Vitals from real readers, at p75 — the percentile the metric is
 * actually scored against.
 *
 * Monochrome like every other chart: the pass/fail signal is carried by the
 * position of the marker on the track and by the label, never by hue.
 */

/** Google's good / needs-improvement thresholds. */
const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
  FCP: [1800, 3000],
};

function format(name: string, value: number) {
  if (name === "CLS") return value.toFixed(3);
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function verdict(name: string, value: number): "good" | "needs work" | "poor" {
  const t = THRESHOLDS[name];
  if (!t) return "good";
  if (value <= t[0]) return "good";
  if (value <= t[1]) return "needs work";
  return "poor";
}

export function VitalsPanel({
  vitals,
}: {
  vitals: { name: string; p75: number; samples: number; goodPct: number; poorPct: number }[];
}) {
  if (vitals.length === 0) {
    return (
      <p className="mono text-fg-faint">
        No field data yet — vitals appear once real visitors load a page.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-5">
      {vitals.map((v) => {
        const t = THRESHOLDS[v.name] ?? [1, 2];
        // Position on a track where the "good" threshold sits at 50%.
        const pct = Math.min(100, (v.p75 / t[1]) * 75);
        const state = verdict(v.name, v.p75);

        return (
          <li key={v.name}>
            <div className="flex items-baseline justify-between gap-4">
              <MonoLabel>{v.name}</MonoLabel>
              <span className="font-display text-2xl tabular-nums">
                {format(v.name, v.p75)}
              </span>
            </div>

            <div className="relative mt-2 h-px w-full bg-fill-strong">
              {/* Threshold ticks. */}
              <span className="absolute top-[-3px] h-[7px] w-px bg-fg-dim" style={{ left: "37.5%" }} />
              <span className="absolute top-[-3px] h-[7px] w-px bg-fg-dim" style={{ left: "75%" }} />
              {/* The reading. */}
              <span
                className={cn(
                  "absolute top-[-4px] h-[9px] w-[2px] bg-fg",
                  state === "poor" && "h-[13px] top-[-6px]",
                )}
                style={{ left: `${pct}%` }}
              />
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-4">
              <MonoLabel className="text-fg-faint">
                p75 · {v.samples.toLocaleString()} {v.samples === 1 ? "sample" : "samples"}
              </MonoLabel>
              <MonoLabel className={cn(state === "good" ? "text-fg-muted" : "text-fg")}>
                {state} · {v.goodPct}% good
              </MonoLabel>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default VitalsPanel;
