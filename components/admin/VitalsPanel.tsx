import { cn } from "@/lib/utils";

/**
 * Core Web Vitals as three stat tiles with a status dot — never a chart.
 * Each reading is p75, the percentile Core Web Vitals is actually scored on.
 */
const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
  FCP: [1800, 3000],
};

const SHOWN = ["LCP", "INP", "CLS"];

function format(name: string, value: number) {
  if (name === "CLS") return value.toFixed(3);
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function state(name: string, value: number): { key: "ok" | "wait" | "bad"; label: string } {
  const t = THRESHOLDS[name];
  if (!t) return { key: "ok", label: "Good" };
  if (value <= t[0]) return { key: "ok", label: "Good" };
  if (value <= t[1]) return { key: "wait", label: "Needs work" };
  return { key: "bad", label: "Poor" };
}

export function VitalsPanel({
  vitals,
}: {
  vitals: { name: string; p75: number; samples: number; goodPct: number; poorPct: number }[];
}) {
  const rows = SHOWN.map((name) => vitals.find((v) => v.name === name)).filter(Boolean) as typeof vitals;

  if (rows.length === 0) {
    return (
      <p className="a-muted text-[13px]">
        No field data yet — vitals appear once real visitors load a page.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {rows.map((v) => {
        const s = state(v.name, v.p75);
        return (
          <li key={v.name} className="flex flex-col gap-2">
            <span className="a-meta">{v.name}</span>
            <span className="a-num text-[24px] leading-none font-medium tracking-[-0.02em]">
              {format(v.name, v.p75)}
            </span>
            <span className="a-pill self-start" data-state={s.key}>
              {s.label}
            </span>
            <span className="a-muted text-[11.5px]">
              p75 · {v.samples.toLocaleString()} {v.samples === 1 ? "sample" : "samples"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default VitalsPanel;
