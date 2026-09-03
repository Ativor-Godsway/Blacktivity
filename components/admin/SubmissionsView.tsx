"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import ListTable, { type ListRow } from "./ListTable";
import StatusPill from "./StatusPill";
import { Empty } from "./ui/Card";
import { cn } from "@/lib/utils";

export type SubmissionItem = {
  id: string;
  name: string;
  email: string;
  igHandle: string;
  discipline: string;
  workUrl: string;
  imageUrl: string;
  note: string;
  status: string;
  received: string;
};

async function setStatus(id: string, status: string) {
  const res = await fetch(`/api/admin/submissions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.ok;
}

function Detail({ s, onDone }: { s: SubmissionItem; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function act(status: string) {
    setBusy(true);
    await setStatus(s.id, status);
    setBusy(false);
    onDone();
  }

  return (
    <div className="flex flex-col gap-4 text-[13px]">
      {s.imageUrl ? (
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg" style={{ background: "var(--admin-hover)" }}>
          <Image src={s.imageUrl} alt={`Work submitted by ${s.name}`} fill sizes="440px" className="object-cover" />
        </div>
      ) : null}

      {s.note ? <p className="a-ink2">{s.note}</p> : null}

      <dl className="flex flex-col gap-2">
        {[
          ["Discipline", s.discipline],
          ["Email", s.email],
          ["Instagram", s.igHandle ? `@${s.igHandle}` : "—"],
          ["Link", s.workUrl || "—"],
          ["Received", s.received],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="a-muted">{k}</dt>
            <dd className="max-w-[62%] truncate text-right">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Approve and reject live here — the whole point of the panel. */}
      <div className="flex gap-2 pt-1">
        <button type="button" disabled={busy} onClick={() => act("approved")} className="a-btn a-btn-primary">
          Approve
        </button>
        <button type="button" disabled={busy} onClick={() => act("rejected")} className="a-btn a-btn-danger">
          Reject
        </button>
        {s.workUrl ? (
          <a href={s.workUrl} target="_blank" rel="noreferrer noopener" className="a-btn a-btn-ghost">
            Open ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Submissions get a card grid as well as the table — the work is visual. */
export function SubmissionsView({
  items,
  counts,
  activeFilter,
}: {
  items: SubmissionItem[];
  counts: { all: number; pending: number; approved: number; rejected: number };
  activeFilter: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [view, setView] = useState<"table" | "grid">("grid");

  function setFilter(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === "all") next.delete("status");
    else next.set("status", key);
    router.push(`/admin/submissions?${next.toString()}`, { scroll: false });
  }

  const rows: ListRow[] = items.map((s) => ({
    id: s.id,
    title: s.name,
    subtitle: s.email,
    status: s.status,
    cells: { discipline: s.discipline, received: s.received },
    detail: <Detail s={s} onDone={() => router.refresh()} />,
  }));

  const filters = [
    { key: "all", label: "All", count: counts.all },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className="a-chip"
              aria-pressed={activeFilter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="a-chip-count">{f.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="View">
          {(["grid", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className="a-chip capitalize"
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <ListTable
          columns={[
            { key: "discipline", label: "Discipline", width: "20%" },
            { key: "received", label: "Received", width: "18%" },
          ]}
          rows={rows}
          bulkActions={[
            { label: "Approve", run: (id) => setStatus(id, "approved") },
            { label: "Reject", destructive: true, run: (id) => setStatus(id, "rejected") },
          ]}
          emptyTitle="Nothing here"
          emptyBody="Submissions from the public form land here for review."
          detailTitle="Submission"
        />
      ) : items.length === 0 ? (
        <div className="a-card">
          <Empty
            title="Nothing here"
            body="Submissions from the public form land here for review."
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((s) => (
            <li key={s.id} className="a-card flex flex-col overflow-hidden">
              {s.imageUrl ? (
                <div className="relative aspect-4/3 w-full" style={{ background: "var(--admin-hover)" }}>
                  <Image src={s.imageUrl} alt={`Work submitted by ${s.name}`} fill sizes="(max-width:1280px) 50vw, 33vw" className="object-cover" />
                </div>
              ) : null}

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{s.name}</p>
                    <p className="a-muted truncate text-[12px]">{s.discipline} · {s.received}</p>
                  </div>
                  <StatusPill status={s.status} className="flex-none" />
                </div>

                {s.note ? <p className="a-ink2 line-clamp-3 text-[13px]">{s.note}</p> : null}

                <div className={cn("mt-auto flex gap-2 pt-1")}>
                  <button
                    type="button"
                    onClick={async () => { await setStatus(s.id, "approved"); router.refresh(); }}
                    className="a-btn a-btn-primary"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await setStatus(s.id, "rejected"); router.refresh(); }}
                    className="a-btn a-btn-danger"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default SubmissionsView;
