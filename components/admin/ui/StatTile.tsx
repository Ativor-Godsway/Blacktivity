import Sparkline from "./Sparkline";
import { cn } from "@/lib/utils";

/**
 * Value, period-over-period delta, and a sparkline. Deliberately not a chart:
 * a single number with trend context reads faster than a one-bar plot.
 */
export function StatTile({
  label,
  value,
  deltaPct,
  note,
  series,
  className,
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  note?: string;
  series?: number[];
  className?: string;
}) {
  const hasDelta = typeof deltaPct === "number" && Number.isFinite(deltaPct);

  return (
    <div className={cn("a-card flex flex-col gap-3 p-5", className)}>
      <p className="a-meta">{label}</p>

      <div className="flex items-end justify-between gap-4">
        <p className="text-[28px] leading-none font-medium tracking-[-0.02em]">{value}</p>
        {series && series.length > 1 ? (
          <Sparkline values={series} className="h-7 w-[110px]" label={`${label} trend`} />
        ) : null}
      </div>

      <div className="flex items-center gap-2 text-[12px]">
        {hasDelta ? (
          <span className="a-ink2 a-num">
            <span aria-hidden="true">{deltaPct >= 0 ? "▲" : "▼"}</span>{" "}
            {Math.abs(deltaPct)}%
            <span className="sr-only">
              {deltaPct >= 0 ? " increase" : " decrease"} on the previous period
            </span>
          </span>
        ) : null}
        {note ? <span className="a-muted">{note}</span> : null}
      </div>
    </div>
  );
}

export default StatTile;
