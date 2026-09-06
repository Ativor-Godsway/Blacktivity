import "server-only";
import Track from "@/models/Track";
import ChartVolume from "@/models/ChartVolume";
import type { TrackLite, EntryValue } from "@/components/admin/rotation-types";

/** Mongoose documents are not serialisable across the RSC boundary. */
function lite(doc: Record<string, any>): TrackLite {
  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    artist: doc.artist,
    featuring: doc.featuring ?? [],
    artwork: doc.artwork
      ? {
          url: doc.artwork.url,
          width: doc.artwork.width ?? 400,
          height: doc.artwork.height ?? 400,
          alt: doc.artwork.alt ?? "",
          blurDataURL: doc.artwork.blurDataURL ?? "",
        }
      : null,
    releaseDate: doc.releaseDate ? new Date(doc.releaseDate).toISOString() : "",
    origin: doc.origin ?? "",
    links: JSON.parse(JSON.stringify(doc.links ?? {})),
  };
}

export async function tracksByIds(ids: string[]): Promise<TrackLite[]> {
  if (ids.length === 0) return [];
  const docs = await Track.find({ _id: { $in: ids } }).lean();
  return docs.map((d) => lite(d as Record<string, any>));
}

/**
 * "Start from last volume" — the previous volume's chart in position order.
 * At a bi-weekly cadence most positions carry over, so this turns twenty
 * minutes of retyping into three edits.
 */
export async function previousChartFor(
  number: number,
): Promise<{ number: number; entries: EntryValue[]; trackIds: string[] } | null> {
  const doc = await ChartVolume.findOne({ number: { $lt: number } })
    .sort({ number: -1 })
    .select("number chart")
    .lean();
  if (!doc) return null;

  const entries = (doc.chart ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((e) => ({ trackId: String(e.track), note: e.note ?? "" }));

  return { number: doc.number, entries, trackIds: entries.map((e) => e.trackId) };
}

/**
 * WHERE A TRACK IS USED.
 *
 * Tracks are one shared collection — that is what makes movement and
 * weeks-on-chart work at all. The consequence is that fixing a typo while
 * editing Vol. 07 silently rewrites Vol. 04, and the owner has to be told that
 * BEFORE the edit, not discover it afterwards in the archive.
 */
export type TrackUsage = {
  /** Every volume referencing this track, in any of the three lists. */
  volumes: { id: string; number: number; slug: string; status: string; lists: string[] }[];
  /** Best position ever held, or null if it has never charted. */
  peak: number | null;
  references: number;
};

export async function trackUsage(trackId: string): Promise<TrackUsage> {
  const id = String(trackId);

  const docs = await ChartVolume.find({
    $or: [
      { "newMusic.track": trackId },
      { "chart.track": trackId },
      { "curation.tracks.track": trackId },
    ],
  })
    .select("number slug status chart newMusic curation.tracks")
    .sort({ number: 1 })
    .lean();

  let peak: number | null = null;
  let references = 0;

  const volumes = docs.map((v) => {
    const lists: string[] = [];

    if ((v.newMusic ?? []).some((e) => String(e.track) === id)) lists.push("New Music");

    const charted = (v.chart ?? []).find((e) => String(e.track) === id);
    if (charted) {
      lists.push("Chart");
      // Peak counts published volumes only — a draft is not chart history yet.
      if (v.status === "published" && (peak === null || charted.position < peak)) {
        peak = charted.position;
      }
    }

    if ((v.curation?.tracks ?? []).some((e) => String(e.track) === id)) lists.push("Curation");

    references += lists.length;

    return { id: String(v._id), number: v.number, slug: v.slug, status: v.status, lists };
  });

  return { volumes, peak, references };
}

/**
 * MERGE, RATHER THAN REJECT.
 *
 * The slug derives from `artist--title`, so an edit can recompute onto an
 * existing track's slug. Almost always that means the owner is fixing a
 * duplicate oEmbed created under a slightly different artist string.
 *
 * Rejecting the edit with "slug already exists" leaves the duplicate in place
 * with no way to fix it, which is how the archive's movement data quietly goes
 * wrong: two documents, two histories, one song.
 *
 * So every reference is repointed onto `keepId` and the loser is deleted.
 *
 * Two details that matter more than they look:
 *  - A list can end up holding the same track twice (both documents were in it).
 *    Duplicates are collapsed, keeping the first occurrence and its note.
 *  - The chart is then RENUMBERED 1..n. Collapsing a duplicate leaves a hole,
 *    and a chart with positions 1,2,4,5 renders a gap and breaks the unique
 *    position invariant the volume schema depends on.
 */
export async function mergeTracks(loserId: string, keepId: string) {
  const loser = String(loserId);
  const keep = String(keepId);

  const docs = await ChartVolume.find({
    $or: [
      { "newMusic.track": loserId },
      { "chart.track": loserId },
      { "curation.tracks.track": loserId },
    ],
  });

  let repointed = 0;

  for (const volume of docs) {
    const dedupe = <T extends { track: unknown }>(entries: T[]): T[] => {
      const seen = new Set<string>();
      return entries.filter((e) => {
        const key = String(e.track);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const repoint = <T extends { track: unknown }>(entries: T[]): T[] =>
      entries.map((e) => {
        if (String(e.track) !== loser) return e;
        repointed += 1;
        (e as { track: unknown }).track = keep;
        return e;
      });

    volume.newMusic = dedupe(repoint(volume.newMusic ?? [])) as typeof volume.newMusic;

    const chart = dedupe(repoint(volume.chart ?? []));
    // Renumber so positions stay 1..n, contiguous and unique.
    chart
      .sort((a, b) => a.position - b.position)
      .forEach((entry, i) => {
        entry.position = i + 1;
      });
    volume.chart = chart as typeof volume.chart;

    if (volume.curation?.tracks) {
      volume.curation.tracks = dedupe(repoint(volume.curation.tracks)) as typeof volume.curation.tracks;
    }

    volume.markModified("newMusic");
    volume.markModified("chart");
    volume.markModified("curation");
    await volume.save();
  }

  await Track.findByIdAndDelete(loserId);

  return { volumes: docs.length, repointed };
}

/** Every volume slug, for revalidation after a change that cascades. */
export async function allVolumeSlugs(): Promise<string[]> {
  const docs = await ChartVolume.find().select("slug").lean();
  return docs.map((d) => d.slug);
}
