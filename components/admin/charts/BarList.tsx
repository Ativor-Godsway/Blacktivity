import { cn } from "@/lib/utils";

/**
 * A ranked list with a grey fill bar behind each row. Differentiation is by bar
 * LENGTH and fill opacity — no hue anywhere.
 */
export function BarList({
  rows,
  emptyLabel = "No data yet.",
  formatValue = (v: number) => v.toLocaleString(),
  secondary,
  className,
}: {
  rows: { label: string; value: number }[];
  emptyLabel?: string;
  formatValue?: (value: number) => string;
  secondary?: (row: { label: string; value: number }) => string;
  className?: string;
}) {
  if (rows.length === 0) {
    return <p className={cn("mono text-fg-faint", className)}>{emptyLabel}</p>;
  }

  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className={cn("flex flex-col", className)}>
      {rows.map((row) => (
        <li key={row.label} className="relative border-b border-rule">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-fill-subtle"
            style={{ width: `${(row.value / max) * 100}%` }}
          />
          <div className="relative flex items-center justify-between gap-4 px-3 py-3">
            <span className="mono truncate text-fg-muted">{row.label}</span>
            <span className="flex shrink-0 items-baseline gap-4">
              {secondary ? <span className="mono text-fg-faint">{secondary(row)}</span> : null}
              <span className="mono tabular-nums text-fg">{formatValue(row.value)}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default BarList;
