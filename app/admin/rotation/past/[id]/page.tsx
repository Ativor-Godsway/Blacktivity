import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import AdminShell from "@/components/admin/AdminShell";
import Card from "@/components/admin/ui/Card";
import { getAdminContext } from "@/lib/admin-context";
import { tracksByIds } from "@/lib/rotation-admin";
import { currentVolume } from "@/lib/rotation-current";
import { rotationLabel } from "@/lib/rotation";

export const metadata: Metadata = { title: "Past rotation" };
export const dynamic = "force-dynamic";

/** One archived rotation's lists, read-only. The current one redirects to the editor. */
export default async function PastRotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  const ctx = await getAdminContext();
  await dbConnect();

  const [doc, current] = await Promise.all([ChartVolume.findById(id).lean(), currentVolume()]);
  if (!doc) notFound();
  if (current && String(current._id) === id) redirect("/admin/rotation");

  const chart = (doc.chart ?? []).slice().sort((a, b) => a.position - b.position);
  const tracks = new Map(
    (await tracksByIds([...new Set([...chart, ...(doc.newMusic ?? [])].map((e) => String(e.track)))])).map((t) => [t.id, t]),
  );
  const published = doc.publishedAt
    ? new Date(doc.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "Not published";

  const Row = ({ trackId, lead }: { trackId: string; lead: string }) => {
    const t = tracks.get(trackId);
    return (
      <li className="flex items-center gap-3 border-b a-border py-2.5 last:border-0">
        <span className="a-num a-muted w-14 flex-none text-[12px]">{lead}</span>
        {t?.artwork?.url ? (
          <Image src={t.artwork.url} alt="" width={32} height={32} className="size-8 flex-none object-cover" />
        ) : (
          <span className="a-bg-rule size-8 flex-none" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13.5px]">
          {t ? `${t.artist} — ${t.title}` : "Track no longer in the library"}
        </span>
      </li>
    );
  };

  return (
    <AdminShell
      {...ctx}
      title={rotationLabel(doc.number)}
      subtitle={`Published ${published} · view only · Vol. ${String(doc.number).padStart(2, "0")} on the site`}
      actions={
        <div className="flex gap-2">
          <Link href="/admin/rotation/past" className="a-btn a-btn-ghost">
            ← Past rotations
          </Link>
          <Link href={`/rotation/${doc.slug}`} target="_blank" className="a-btn a-btn-ghost">
            View on site ↗
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Top 10" note={`${chart.length} / 10`}>
          <ol>
            {chart.map((e) => (
              <Row key={String(e.track)} trackId={String(e.track)} lead={String(e.position).padStart(2, "0")} />
            ))}
          </ol>
        </Card>
        <Card title="New Releases" note={`${doc.newMusic?.length ?? 0} tracks`}>
          <ul>
            {(doc.newMusic ?? []).map((e) => {
              const t = tracks.get(String(e.track));
              const day = t?.releaseDate
                ? new Date(t.releaseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).toUpperCase()
                : "";
              return <Row key={String(e.track)} trackId={String(e.track)} lead={day} />;
            })}
          </ul>
        </Card>
      </div>
    </AdminShell>
  );
}
