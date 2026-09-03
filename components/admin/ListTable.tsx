"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import StatusPill from "./StatusPill";
import { Empty } from "./ui/Card";
import { cn } from "@/lib/utils";

export type ListColumn = { key: string; label: string; width?: string };

export type ListRow = {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  cells: Record<string, ReactNode>;
  /** Rendered in the right-hand detail panel when the row is opened. */
  detail?: ReactNode;
  /** Deep link for the row's primary action. */
  href?: string;
};

export type BulkAction = {
  label: string;
  /** Called once per selected id. Returning false marks that id as failed. */
  run: (id: string) => Promise<boolean>;
  destructive?: boolean;
  confirm?: string;
};

/**
 * The one table Articles, Events and Submissions share.
 *
 * Rows open a right-hand detail panel rather than navigating, so reviewing an
 * item never costs the reader their place in the table.
 */
export function ListTable({
  columns,
  rows,
  filters,
  activeFilter,
  onFilter,
  bulkActions = [],
  emptyTitle,
  emptyBody,
  emptyAction,
  detailTitle = "Details",
}: {
  columns: ListColumn[];
  rows: ListRow[];
  filters?: { key: string; label: string; count: number }[];
  activeFilter?: string;
  onFilter?: (key: string) => void;
  bulkActions?: BulkAction[];
  emptyTitle: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  detailTitle?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  async function runBulk(action: BulkAction) {
    if (action.confirm && !window.confirm(action.confirm)) return;
    setBusy(true);
    const ids = [...selected];
    const results = await Promise.all(ids.map((id) => action.run(id).catch(() => false)));
    setBusy(false);
    setSelected(new Set());
    const failed = results.filter((r) => !r).length;
    if (failed > 0) window.alert(`${failed} of ${ids.length} could not be updated.`);
    router.refresh();
  }

  return (
    <>
      {filters && filters.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className="a-chip"
              aria-pressed={activeFilter === f.key}
              onClick={() => onFilter?.(f.key)}
            >
              {f.label}
              <span className="a-chip-count">{f.count}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="a-card overflow-hidden">
        {rows.length === 0 ? (
          <Empty title={emptyTitle} body={emptyBody} action={emptyAction} />
        ) : (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all rows"
                      className="size-3.5 align-middle accent-[var(--admin-ink)]"
                    />
                  </th>
                  <th>Title</th>
                  <th className="w-[13%]">Status</th>
                  {columns.map((c) => (
                    <th key={c.key} style={{ width: c.width }}>
                      {c.label}
                    </th>
                  ))}
                  <th className="w-12 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn("cursor-pointer", openId === row.id && "bg-[var(--admin-hover)]")}
                    onClick={() => setOpenId(row.id)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label={`Select ${row.title}`}
                        className="size-3.5 align-middle accent-[var(--admin-ink)]"
                      />
                    </td>

                    <td className="max-w-0">
                      <span className="block truncate text-[13.5px]">{row.title}</span>
                      {row.subtitle ? (
                        <span className="a-muted block truncate text-[11.5px]">{row.subtitle}</span>
                      ) : null}
                    </td>

                    <td>
                      <StatusPill status={row.status} />
                    </td>

                    {columns.map((c) => (
                      <td key={c.key} className="a-ink2 text-[13px] whitespace-nowrap">
                        {row.cells[c.key] ?? "—"}
                      </td>
                    ))}

                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setOpenId(row.id)}
                        className="a-muted px-1 text-[16px] leading-none hover:text-[var(--admin-ink)]"
                        aria-label={`Open ${row.title}`}
                      >
                        ⋯
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating bulk bar — appears only once something is selected. */}
      {selected.size > 0 ? (
        <div
          className="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit items-center gap-3 rounded-xl px-4 py-3 shadow-lg"
          style={{ background: "var(--admin-sidebar)", color: "var(--admin-plane)" }}
          role="status"
        >
          <span className="a-num text-[13px]">
            {selected.size} selected
          </span>
          <span className="h-4 w-px bg-white/20" aria-hidden="true" />
          {bulkActions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={busy}
              onClick={() => runBulk(a)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] disabled:opacity-50",
                a.destructive ? "text-[#ff8b8b] hover:bg-white/10" : "hover:bg-white/10",
              )}
            >
              {a.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-1 rounded-lg px-2 py-1.5 text-[13px] text-white/60 hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">✕</span>
            <span className="sr-only">Clear selection</span>
          </button>
        </div>
      ) : null}

      {/* Detail panel — review without losing table position. */}
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close details"
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setOpenId(null)}
          />
          <aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col overflow-y-auto shadow-xl"
            style={{ background: "var(--admin-surface)" }}
            aria-label={detailTitle}
          >
            <header
              className="sticky top-0 flex items-center justify-between gap-3 border-b px-5 py-4"
              style={{ background: "var(--admin-surface)", borderColor: "var(--admin-rule)" }}
            >
              <div className="min-w-0">
                <p className="a-meta">{detailTitle}</p>
                <p className="truncate text-[14px] font-medium">{open.title}</p>
              </div>
              <div className="flex flex-none items-center gap-2">
                {open.href ? (
                  <Link href={open.href} className="a-btn a-btn-ghost">
                    Open
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="a-btn a-btn-ghost"
                >
                  <span aria-hidden="true">✕</span>
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </header>

            <div className="p-5">{open.detail ?? <p className="a-muted text-[13px]">No further detail.</p>}</div>
          </aside>
        </>
      ) : null}
    </>
  );
}

export default ListTable;
