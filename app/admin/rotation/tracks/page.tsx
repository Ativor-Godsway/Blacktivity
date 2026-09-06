import Link from "next/link";
import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import Track from "@/models/Track";
import ChartVolume from "@/models/ChartVolume";
import AdminShell from "@/components/admin/AdminShell";
import TrackLibrary, { type LibraryTrack } from "@/components/admin/TrackLibrary";
import { getAdminContext } from "@/lib/admin-context";

export const metadata: Metadata = { title: "Track library" };
export const dynamic = "force-dynamic";

export default async function TrackLibraryPage() {
  const ctx = await getAdminContext();
  await dbConnect();

  const [tracks, volumes] = await Promise.all([
    Track.find().sort({ artist: 1 }).lean(),
    ChartVolume.find().select("number status chart newMusic curation.tracks").sort({ number: 1 }).lean(),
  ]);

  /**
   * Usage is folded in ONE pass over the volumes rather than a query per track.
   * The library lists every track there has ever been, so a per-row lookup is a
   * query count that grows with the archive — the exact shape this section has
   * avoided everywhere else.
   */
  const usedIn = new Map<string, number[]>();
  const peaks = new Map<string, number>();

  for (const v of volumes) {
    const ids = new Set<string>();
    for (const e of v.newMusic ?? []) ids.add(String(e.track));
    for (const e of v.curation?.tracks ?? []) ids.add(String(e.track));
    for (const e of v.chart ?? []) {
      const id = String(e.track);
      ids.add(id);
      // Peak counts published volumes only — a draft is not chart history yet.
      if (v.status === "published") {
        const current = peaks.get(id);
        if (current === undefined || e.position < current) peaks.set(id, e.position);
      }
    }
    for (const id of ids) usedIn.set(id, [...(usedIn.get(id) ?? []), v.number]);
  }

  const items: LibraryTrack[] = tracks.map((t) => {
    const id = String(t._id);
    return {
      id,
      slug: t.slug,
      artist: t.artist,
      title: t.title,
      artwork: t.artwork?.url ? { url: t.artwork.url } : null,
      releaseDate: t.releaseDate ? new Date(t.releaseDate).toISOString() : "",
      volumes: usedIn.get(id) ?? [],
      peak: peaks.get(id) ?? null,
    };
  });

  const orphans = items.filter((t) => t.volumes.length === 0).length;

  return (
    <AdminShell
      {...ctx}
      title="Track library"
      subtitle={`${items.length} tracks · ${orphans} not used by any volume`}
      actions={
        <Link href="/admin/rotation" className="a-btn a-btn-ghost">
          Volumes
        </Link>
      }
    >
      <TrackLibrary tracks={items} />
    </AdminShell>
  );
}
