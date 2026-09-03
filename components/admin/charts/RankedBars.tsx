"use client";

/**
 * Horizontal bars, single hue, direct-labelled. Used for referrers.
 *
 * Colour follows the entity, not its rank — every bar is the same hue, so
 * re-sorting or filtering never repaints anything. Values stay in ink; the
 * coloured mark carries identity only.
 */
export function RankedBars({
  rows,
  emptyLabel = "Nothing yet.",
  formatValue = (v: number) => v.toLocaleString(),
}: {
  rows: { label: string; value: number }[];
  emptyLabel?: string;
  formatValue?: (v: number) => string;
}) {
  if (rows.length === 0) return <p className="a-muted text-[13px]">{emptyLabel}</p>;

  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="group">
          <div className="flex items-baseline justify-between gap-4 text-[13px]">
            <span className="truncate">{r.label}</span>
            <span className="a-num a-ink2 tabular-nums">{formatValue(r.value)}</span>
          </div>
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--admin-rule)" }}
            title={`${r.label}: ${formatValue(r.value)}`}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, (r.value / max) * 100)}%`,
                background: "var(--series-1)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default RankedBars;
