"use client";

import Link from "next/link";
import { rotationLabel } from "@/lib/rotation";
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

/**
 * Past rotations — READ-ONLY (Revision 27 §1.3). The one place in the admin
 * where the public "Vol." numbering and web address appear, because this is
 * where the archive is browsed. Editing an archived rotation is not offered.
 */
export function PastRotationsList({ items, currentId }: { items: VolumeListItem[]; currentId: string | null }) {
  const rows: ListRow[] = items.map((v) => ({
    id: v.id,
    title: rotationLabel(v.number) + (v.id === currentId ? " — current" : ""),
    subtitle: `Vol. ${String(v.number).padStart(2, "0")} on the site`,
    status: v.status,
    href: v.id === currentId ? "/admin/rotation" : `/admin/rotation/past/${v.id}`,
    cells: {
      published: v.published || "—",
      chart: `${v.chartCount}/10`,
      newMusic: String(v.newMusicCount),
    },
    detail: (
      <div className="flex flex-col gap-4 text-[13px]">
        <dl className="flex flex-col gap-2">
          {[
            ["Web address", `/rotation/${v.slug}`],
            ["Published", v.published || "Not published"],
            ["Top 10", `${v.chartCount} of 10`],
            ["New releases", String(v.newMusicCount)],
          ].map(([k, value]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="a-muted">{k}</dt>
              <dd className="max-w-[60%] truncate text-right">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-2 pt-1">
          {v.id === currentId ? (
            <Link href="/admin/rotation" className="a-btn a-btn-primary">
              Edit the current rotation
            </Link>
          ) : (
            <Link href={`/admin/rotation/past/${v.id}`} className="a-btn a-btn-primary">
              View lists
            </Link>
          )}
          {v.status === "published" ? (
            <Link href={`/rotation/${v.slug}`} target="_blank" className="a-btn a-btn-ghost">
              View on site ↗
            </Link>
          ) : null}
        </div>
      </div>
    ),
  }));

  return (
    <ListTable
      columns={[
        { key: "published", label: "Published", width: "20%" },
        { key: "chart", label: "Top 10", width: "12%" },
        { key: "newMusic", label: "New releases", width: "14%" },
      ]}
      rows={rows}
      emptyTitle="No past rotations yet"
      emptyBody="Each time you start a new rotation, the previous one is kept here."
      detailTitle="Past rotation"
    />
  );
}

export default PastRotationsList;
