import Link from "next/link";
import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import AdminShell from "@/components/admin/AdminShell";
import PastRotationsList, { type VolumeListItem } from "@/components/admin/PastRotationsList";
import { getAdminContext } from "@/lib/admin-context";
import { currentVolume } from "@/lib/rotation-current";

export const metadata: Metadata = { title: "Past rotations" };
export const dynamic = "force-dynamic";

/** The archive, view-only — Revision 27 §1.3. */
export default async function PastRotationsPage() {
  const ctx = await getAdminContext();
  await dbConnect();

  const [docs, current] = await Promise.all([
    ChartVolume.find().sort({ number: -1 }).limit(200).lean(),
    currentVolume(),
  ]);

  const items: VolumeListItem[] = docs.map((v) => ({
    id: String(v._id),
    number: v.number,
    slug: v.slug,
    status: v.status as "draft" | "published",
    published: v.publishedAt
      ? new Date(v.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "",
    curator: v.curation?.curator?.name ?? "",
    chartCount: v.chart?.length ?? 0,
    newMusicCount: v.newMusic?.length ?? 0,
  }));

  return (
    <AdminShell
      {...ctx}
      title="Past rotations"
      subtitle="View only. The current rotation is edited on the Rotation page."
      actions={
        <Link href="/admin/rotation" className="a-btn a-btn-primary">
          ← Back to Rotation
        </Link>
      }
    >
      <PastRotationsList items={items} currentId={current ? String(current._id) : null} />
    </AdminShell>
  );
}
