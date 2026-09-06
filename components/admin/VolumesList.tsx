"use client";

import Link from "next/link";
import ListTable, { type ListRow } from "./ListTable";

export type VolumeListItem = {
  id: string;
  number: number;
  slug: string;
  status: "draft" | "published";
  published: string;
  curator: string;
  chartCount: number;
  newMusicCount: number;
};

export function VolumesList({ items }: { items: VolumeListItem[] }) {
  const rows: ListRow[] = items.map((v) => ({
    id: v.id,
    title: `Vol. ${String(v.number).padStart(2, "0")}`,
    subtitle: v.curator ? `Curated by ${v.curator}` : "No curation",
    status: v.status,
    href: `/admin/rotation/${v.id}`,
    cells: {
      published: v.published || "—",
      chart: `${v.chartCount}/10`,
      newMusic: String(v.newMusicCount),
      curator: v.curator || "—",
    },
    detail: (
      <div className="flex flex-col gap-4 text-[13px]">
        <dl className="flex flex-col gap-2">
          {[
            ["Slug", `/rotation/${v.slug}`],
            ["Published", v.published || "Not published"],
            ["Chart entries", `${v.chartCount} of 10`],
            ["New music", String(v.newMusicCount)],
            ["Curator", v.curator || "None"],
          ].map(([k, value]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="a-muted">{k}</dt>
              <dd className="max-w-[60%] truncate text-right">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-2 pt-1">
          <Link href={`/admin/rotation/${v.id}`} className="a-btn a-btn-primary">
            Edit volume
          </Link>
          {v.status === "published" ? (
            <Link href={`/rotation/${v.slug}`} target="_blank" className="a-btn a-btn-ghost">
              View ↗
            </Link>
          ) : null}
        </div>
      </div>
    ),
  }));

  return (
    <ListTable
      columns={[
        { key: "published", label: "Published", width: "18%" },
        { key: "chart", label: "Chart", width: "10%" },
        { key: "newMusic", label: "New music", width: "12%" },
        { key: "curator", label: "Curator", width: "22%" },
      ]}
      rows={rows}
      emptyTitle="No volumes yet"
      emptyBody="Rotation publishes bi-weekly as numbered volumes. Vol. 01 is the place to start — /rotation shows a designed coming-soon state until then."
      emptyAction={
        <Link href="/admin/rotation/new" className="a-btn a-btn-primary">
          New volume
        </Link>
      }
      detailTitle="Volume"
    />
  );
}

export default VolumesList;
