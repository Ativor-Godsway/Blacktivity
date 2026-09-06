import Link from "next/link";
import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import AdminShell from "@/components/admin/AdminShell";
import VolumesList, { type VolumeListItem } from "@/components/admin/VolumesList";
import { getAdminContext } from "@/lib/admin-context";

export const metadata: Metadata = { title: "Rotation" };
export const dynamic = "force-dynamic";

export default async function AdminRotationPage() {
  const ctx = await getAdminContext();
  await dbConnect();

  const docs = await ChartVolume.find().sort({ number: -1 }).limit(200).lean();

  const items: VolumeListItem[] = docs.map((v) => ({
    id: String(v._id),
    number: v.number,
    slug: v.slug,
    status: v.status as "draft" | "published",
    published: v.publishedAt
      ? new Date(v.publishedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "",
    curator: v.curation?.curator?.name ?? "",
    chartCount: v.chart?.length ?? 0,
    newMusicCount: v.newMusic?.length ?? 0,
  }));

  const published = items.filter((i) => i.status === "published").length;

  return (
    <AdminShell
      {...ctx}
      title="Rotation"
      subtitle={`${items.length} volumes · ${published} published · bi-weekly`}
      actions={
        <div className="flex gap-2">
          <Link href="/admin/rotation/tracks" className="a-btn a-btn-ghost">
            Track library
          </Link>
          <Link href="/admin/rotation/new" className="a-btn a-btn-primary">
            New volume
          </Link>
        </div>
      }
    >
      <VolumesList items={items} />
    </AdminShell>
  );
}
