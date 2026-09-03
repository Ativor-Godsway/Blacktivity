"use client";

/**
 * Up to THREE categories, slots 1-3, with mandatory direct labels.
 *
 * Not a pie and not a donut: this is a stacked proportion bar with each segment
 * labelled beneath it. Slot 3 is 2.82:1 on white — under the 3:1 bar — so the
 * labels are the signal and the colour is reinforcement, never the other way.
 *
 * A fourth category is not a fourth hue; callers fold the tail into "Other".
 */
const SLOTS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];

export function CategorySplit({
  rows,
  emptyLabel = "No data yet.",
}: {
  rows: { label: string; value: number }[];
  emptyLabel?: string;
}) {
  const shown = rows.slice(0, 3);
  const total = shown.reduce((a, r) => a + r.value, 0);

  if (total === 0) return <p className="a-muted text-[13px]">{emptyLabel}</p>;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {shown.map((r, i) => (
          <div
            key={r.label}
            style={{ width: `${(r.value / total) * 100}%`, background: SLOTS[i] }}
            title={`${r.label}: ${Math.round((r.value / total) * 100)}%`}
          />
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {shown.map((r, i) => (
          <li key={r.label} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 flex-none rounded-full"
                style={{ background: SLOTS[i] }}
              />
              <span>{r.label}</span>
            </span>
            <span className="a-num a-ink2">
              {Math.round((r.value / total) * 100)}%
              <span className="a-muted"> · {r.value.toLocaleString()}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CategorySplit;
