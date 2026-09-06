import "server-only";
import dbConnect from "./db";
import DailyStat from "@/models/DailyStat";
import ChartVolume from "@/models/ChartVolume";
import Track from "@/models/Track";
import { dayKey } from "./utils";

/**
 * Rotation analytics — read out of the labels the existing delegated
 * `data-track` listener already records. No new client code, no second
 * pipeline.
 *
 *   rotation:track:{trackSlug}:{platform}
 *
 * Label cardinality is roughly 90–120 new labels per volume, which
 * DailyStat.clicks handles comfortably — but it GROWS WITH THE ARCHIVE, so
 * every read here is capped to the current and previous volume and the rollup
 * keeps the rest. Reading the whole archive back would get slower every
 * fortnight, forever.
 */
const PREFIX = "rotation:track:";

export type RotationClickRow = {
  /** The track slug, which is also the analytics label's identity. */
  label: string;
  title: string;
  artist: string;
  count: number;
};

/** Totals per track slug over the last `days`, for a known set of slugs only. */
async function clicksForSlugs(slugs: string[], days: number): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (slugs.length === 0) return totals;

  const wanted = new Set(slugs);
  const since = dayKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

  const stats = await DailyStat.find({ date: { $gte: since } })
    .select("clicks")
    .lean();

  for (const stat of stats) {
    for (const click of stat.clicks ?? []) {
      if (!click.label?.startsWith(PREFIX)) continue;
      // `slug:platform` — the platform is the last segment, the slug is the
      // rest, because a slug can legitimately contain a colon-free dash but
      // never a colon.
      const rest = click.label.slice(PREFIX.length);
      const slug = rest.slice(0, rest.lastIndexOf(":"));
      if (!wanted.has(slug)) continue;
      totals.set(slug, (totals.get(slug) ?? 0) + (click.count ?? 0));
    }
  }

  return totals;
}

/** The tracks on one volume, resolved to slugs and titles. */
async function volumeTracks(number: number) {
  const volume = await ChartVolume.findOne({ number }).select("number slug chart newMusic").lean();
  if (!volume) return null;

  const ids = [
    ...(volume.chart ?? []).map((e) => String(e.track)),
    ...(volume.newMusic ?? []).map((e) => String(e.track)),
  ];
  const docs = await Track.find({ _id: { $in: ids } }).select("slug title artist").lean();

  return { volume, tracks: docs };
}

/**
 * "Last volume's clicks" for the editor rail: what people actually opened
 * before he sets the next order. He decides; the data informs.
 */
export async function getPreviousVolumeClicks(beforeNumber: number): Promise<RotationClickRow[]> {
  await dbConnect();

  const previous = await ChartVolume.findOne({ number: { $lt: beforeNumber }, status: "published" })
    .sort({ number: -1 })
    .select("number")
    .lean();
  if (!previous) return [];

  const resolved = await volumeTracks(previous.number);
  if (!resolved) return [];

  const totals = await clicksForSlugs(
    resolved.tracks.map((t) => t.slug),
    30,
  );

  return resolved.tracks
    .map((t) => ({
      label: t.slug,
      title: `${t.artist} — ${t.title}`,
      artist: t.artist,
      count: totals.get(t.slug) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * The dashboard panel: "Rotation — most opened, last volume." Capped to the
 * current and previous volume, deliberately.
 */
export async function getRotationClicks(limit = 12): Promise<{
  volumeLabel: string;
  rows: RotationClickRow[];
}> {
  await dbConnect();

  const volumes = await ChartVolume.find({ status: "published" })
    .sort({ number: -1 })
    .limit(2)
    .select("number slug")
    .lean();

  if (volumes.length === 0) return { volumeLabel: "", rows: [] };

  const resolved = (await Promise.all(volumes.map((v) => volumeTracks(v.number)))).filter(
    (r): r is NonNullable<typeof r> => Boolean(r),
  );

  const byId = new Map<string, { slug: string; title: string; artist: string }>();
  for (const entry of resolved) {
    for (const track of entry.tracks) byId.set(track.slug, track);
  }

  const totals = await clicksForSlugs([...byId.keys()], 60);

  const rows = [...byId.values()]
    .map((t) => ({
      label: t.slug,
      title: t.title,
      artist: t.artist,
      count: totals.get(t.slug) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return { volumeLabel: `Vol. ${String(volumes[0]!.number).padStart(2, "0")}`, rows };
}
