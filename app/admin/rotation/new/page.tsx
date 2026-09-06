import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import AdminShell from "@/components/admin/AdminShell";
import VolumeEditor from "@/components/admin/VolumeEditor";
import { getAdminContext } from "@/lib/admin-context";
import { previousChartFor, tracksByIds } from "@/lib/rotation-admin";
import { getPreviousVolumeClicks } from "@/lib/rotation-analytics";

export const metadata: Metadata = { title: "New volume" };
export const dynamic = "force-dynamic";

export default async function NewVolumePage() {
  const ctx = await getAdminContext();
  await dbConnect();

  const latest = await ChartVolume.findOne().sort({ number: -1 }).select("number").lean();
  const number = (latest?.number ?? 0) + 1;

  const [previous, clicks] = await Promise.all([
    previousChartFor(number),
    getPreviousVolumeClicks(number),
  ]);
  const tracks = await tracksByIds(previous?.trackIds ?? []);

  return (
    <AdminShell {...ctx} title="New volume" collapsedRail>
      <VolumeEditor
        initial={{
          number,
          status: "draft",
          publishedAt: "",
          intro: "",
          newMusic: [],
          chart: [],
          curation: null,
          playlists: {
            newMusic: { spotify: "", audiomack: "", youtube: "" },
            chart: { spotify: "", audiomack: "", youtube: "" },
            curation: { spotify: "", audiomack: "", youtube: "" },
          },
        }}
        initialTracks={tracks}
        previousChart={previous ? { number: previous.number, entries: previous.entries } : null}
        clicks={clicks}
      />
    </AdminShell>
  );
}
