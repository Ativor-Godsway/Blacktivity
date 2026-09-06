import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import AdminShell from "@/components/admin/AdminShell";
import VolumeEditor from "@/components/admin/VolumeEditor";
import { getAdminContext } from "@/lib/admin-context";
import { previousChartFor, tracksByIds } from "@/lib/rotation-admin";
import { getPreviousVolumeClicks } from "@/lib/rotation-analytics";
import { volumeLabel } from "@/lib/rotation";

export const metadata: Metadata = { title: "Edit volume" };
export const dynamic = "force-dynamic";

export default async function EditVolumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  const ctx = await getAdminContext();
  await dbConnect();

  const doc = await ChartVolume.findById(id).lean();
  if (!doc) notFound();

  const [previous, clicks] = await Promise.all([
    previousChartFor(doc.number),
    getPreviousVolumeClicks(doc.number),
  ]);

  const chart = (doc.chart ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((e) => ({ trackId: String(e.track), note: e.note ?? "" }));
  const newMusic = (doc.newMusic ?? []).map((e) => ({ trackId: String(e.track), note: e.note ?? "" }));
  const curationTracks = (doc.curation?.tracks ?? []).map((e) => ({
    trackId: String(e.track),
    note: e.note ?? "",
  }));

  const tracks = await tracksByIds([
    ...new Set([
      ...chart.map((e) => e.trackId),
      ...newMusic.map((e) => e.trackId),
      ...curationTracks.map((e) => e.trackId),
      ...(previous?.trackIds ?? []),
    ]),
  ]);

  const photo = doc.curation?.curator?.photo;

  return (
    <AdminShell {...ctx} title={`Rotation — ${volumeLabel(doc.number)}`} collapsedRail>
      <VolumeEditor
        id={id}
        initial={{
          number: doc.number,
          status: doc.status as "draft" | "published",
          publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString().slice(0, 10) : "",
          intro: doc.intro ?? "",
          newMusic,
          chart,
          curation: doc.curation?.curator?.name
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
            newMusic: {
              spotify: doc.playlists?.newMusic?.spotify ?? "",
              audiomack: doc.playlists?.newMusic?.audiomack ?? "",
              youtube: doc.playlists?.newMusic?.youtube ?? "",
            },
            chart: {
              spotify: doc.playlists?.chart?.spotify ?? "",
              audiomack: doc.playlists?.chart?.audiomack ?? "",
              youtube: doc.playlists?.chart?.youtube ?? "",
            },
            curation: {
              spotify: doc.playlists?.curation?.spotify ?? "",
              audiomack: doc.playlists?.curation?.audiomack ?? "",
              youtube: doc.playlists?.curation?.youtube ?? "",
            },
          },
        }}
        initialTracks={tracks}
        previousChart={previous ? { number: previous.number, entries: previous.entries } : null}
        clicks={clicks}
      />
    </AdminShell>
  );
}
