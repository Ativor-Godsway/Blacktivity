import type { RotationClickRow } from "@/lib/rotation-analytics";

/**
 * "Rotation — most opened, last volume."
 *
 * A table, not a bar chart: more than a handful of named rows is a table's job,
 * and the opens carry an inline sequential bar so the ranking is still scannable
 * without a separate plot. It sits below the existing analytics, not in the KPI
 * row — this is a reading, not a headline number.
 */
export function RotationClicksTable({ rows }: { rows: RotationClickRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="a-muted text-[13px]">
        No Rotation link opens recorded yet. Every platform link on a volume page carries a
        data-track label, so this fills in as soon as one is published and opened.
      </p>
    );
  }

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="overflow-x-auto">
      <table className="a-table">
        <thead>
          <tr>
            <th>Track</th>
            <th className="w-[24%]">Artist</th>
            <th className="w-[34%]">Opens</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="max-w-0">
                <span className="block truncate text-[13.5px]">{row.title}</span>
                <span className="a-muted block truncate text-[11.5px]">{row.label}</span>
              </td>
              <td className="a-ink2 text-[13px]">{row.artist}</td>
              <td>
                <div className="flex items-center gap-3">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full"
                    style={{ background: "var(--admin-rule)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, (row.count / max) * 100)}%`,
                        background: "var(--series-1)",
                      }}
                    />
                  </div>
                  <span className="a-num w-12 text-right text-[13px]">{row.count.toLocaleString()}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RotationClicksTable;
