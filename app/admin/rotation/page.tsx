import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import AdminShell from "@/components/admin/AdminShell";
import RotationEditor from "@/components/admin/RotationEditor";
import type { RotationFormValues } from "@/components/admin/rotation-types";
import { getAdminContext } from "@/lib/admin-context";
import { tracksByIds } from "@/lib/rotation-admin";
import { currentVolume } from "@/lib/rotation-current";
import { getPreviousVolumeClicks } from "@/lib/rotation-analytics";

export const metadata: Metadata = { title: "Rotation" };
export const dynamic = "force-dynamic";

const playlistSet = (p?: { spotify?: string | null; audiomack?: string | null; youtube?: string | null } | null) => ({
  spotify: p?.spotify ?? "",
  audiomack: p?.audiomack ?? "",
  youtube: p?.youtube ?? "",
});

/**
 * Rotation opens straight onto the Top 10 and New Releases — Revision 27.
 * This edits the CURRENT rotation; there is no list of volumes in front of it.
 */
export default async function AdminRotationPage() {
  const ctx = await getAdminContext();
  await dbConnect();

  const doc = (await currentVolume())?.toObject() ?? null;

  const chart = (doc?.chart ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((e) => ({ trackId: String(e.track), note: e.note ?? "" }));
  const newMusic = (doc?.newMusic ?? []).map((e) => ({ trackId: String(e.track), note: e.note ?? "" }));
  const curationTracks = (doc?.curation?.tracks ?? []).map((e) => ({ trackId: String(e.track), note: e.note ?? "" }));
  const photo = doc?.curation?.curator?.photo;

  const initial: RotationFormValues = {
    intro: doc?.intro ?? "",
    chart,
    newMusic,
    curation: doc?.curation?.curator?.name
      ? {
          curator: {
            name: doc.curation.curator.name,
            igHandle: doc.curation.curator.igHandle ?? "",
            discipline: doc.curation.curator.discipline ?? "",
            statement: doc.curation.curator.statement ?? "",
            photo: photo?.url
              ? {
                  url: photo.url,
                  width: photo.width ?? 1000,
                  height: photo.height ?? 1250,
                  alt: photo.alt ?? "",
                  blurDataURL: photo.blurDataURL ?? "",
                }
              : null,
          },
          tracks: curationTracks,
        }
      : null,
    playlists: {
      chart: playlistSet(doc?.playlists?.chart),
      newMusic: playlistSet(doc?.playlists?.newMusic),
      curation: playlistSet(doc?.playlists?.curation),
    },
  };

  const number = doc?.number ?? null;
  const [tracks, clicks, previous] = await Promise.all([
    tracksByIds([...new Set([...chart, ...newMusic, ...curationTracks].map((e) => e.trackId))]),
    number ? getPreviousVolumeClicks(number) : Promise.resolve([]),
    number
      ? ChartVolume.findOne({ number: { $lt: number }, status: "published" }).sort({ number: -1 }).select("number").lean()
      : Promise.resolve(null),
  ]);

  return (
    <AdminShell {...ctx} title="Rotation" subtitle="Top 10 and New Releases" collapsedRail>
      <RotationEditor
        initial={initial}
        initialTracks={tracks}
        updatedAt={doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null}
        number={number}
        previousNumber={previous?.number ?? null}
        clicks={clicks}
      />
    </AdminShell>
  );
}
