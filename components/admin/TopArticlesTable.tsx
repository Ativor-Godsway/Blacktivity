/**
 * Top articles as a TABLE, not a bar chart — more than a handful of named rows
 * is a table's job. Views carry an inline sequential bar inside the cell so the
 * ranking is scannable without a separate plot.
 */
export function TopArticlesTable({
  rows,
}: {
  rows: { path: string; title: string; views: number; avgSeconds: number; published: string | null }[];
}) {
  if (rows.length === 0) {
    return <p className="a-muted text-[13px]">No page views recorded in this range yet.</p>;
  }

  const max = Math.max(...rows.map((r) => r.views), 1);
  const mmss = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;

  return (
    <div className="overflow-x-auto">
      <table className="a-table">
        <thead>
          <tr>
            <th>Article</th>
            <th className="w-[34%]">Views</th>
            <th className="w-[14%]">Avg. time</th>
            <th className="w-[16%]">Published</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path}>
              <td className="max-w-0">
                <span className="block truncate text-[13.5px]">{r.title}</span>
                <span className="a-muted block truncate text-[11.5px]">{r.path}</span>
              </td>
              <td>
                <div className="flex items-center gap-3">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full"
                    style={{ background: "var(--admin-rule)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, (r.views / max) * 100)}%`, background: "var(--series-1)" }}
                    />
                  </div>
                  <span className="a-num w-14 text-right text-[13px]">{r.views.toLocaleString()}</span>
                </div>
              </td>
              <td className="a-num a-ink2 text-[13px]">{mmss(r.avgSeconds)}</td>
              <td className="a-ink2 text-[13px]">{r.published ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TopArticlesTable;
