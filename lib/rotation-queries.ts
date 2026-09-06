import "server-only";
import { cache } from "react";
import dbConnect from "./db";
import ChartVolume from "@/models/ChartVolume";
import Track from "@/models/Track";
import {
  deriveMovement,
  volumeSlug,
  WEEKS_PER_VOLUME,
  type ChartRowDTO,
  type ListEntryDTO,
  type TrackDTO,
  type HomeDoorData,
  type VolumeDTO,
} from "./rotation";

function toDTO<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

/**
 * THE CHART HISTORY.
 *
 * Every derived number — movement, weeks-on-chart, peak — comes from one small
 * projection over the published volumes rather than a query per row. Thirty
 * rows used to mean thirty round trips; this is a handful of documents holding
 * ten `{track, position}` pairs each, so it is cheaper to fetch the lot once
 * and derive in memory than to ask the database three questions per song.
 *
 * `cache()` dedupes it within a render (the volume page reads it once, the
 * homepage block once); the surrounding route's `revalidate` and the
 * revalidatePath on publish handle it between renders. Nothing here is stored.
 */
type History = {
  /** Volume number → (track id → position). Published volumes only. */
  byVolume: Map<number, Map<string, number>>;
  numbers: number[];
};

const getChartHistory = cache(async function getChartHistory(): Promise<History> {
  await dbConnect();
  const docs = await ChartVolume.find({ status: "published" })
    .select("number chart.track chart.position")
    .sort({ number: 1 })
    .lean();

  const byVolume = new Map<number, Map<string, number>>();
  for (const doc of docs) {
    const map = new Map<string, number>();
    for (const entry of doc.chart ?? []) {
      map.set(String(entry.track), entry.position);
    }
    byVolume.set(doc.number, map);
  }

  return { byVolume, numbers: [...byVolume.keys()].sort((a, b) => a - b) };
});

function trackDTO(raw: unknown): TrackDTO {
  const t = toDTO<TrackDTO & { _id: string }>(raw);
  return {
    id: String(t._id ?? t.id),
    title: t.title,
    artist: t.artist,
    featuring: t.featuring ?? [],
    slug: t.slug,
    artwork: t.artwork,
    releaseDate: t.releaseDate,
    origin: t.origin ?? "",
    links: t.links ?? {},
  };
}

/**
 * Resolves the ObjectId references on a volume into full tracks with one query,
 * then derives the chart numbers from the shared history.
 *
 * A track referenced by a volume can be missing — deleted by hand in the shell,
 * say — and a volume that renders nine rows is better than a page that throws,
 * so unresolved references are dropped rather than crashing the route.
 */
async function hydrate(doc: Record<string, any>): Promise<VolumeDTO> {
  const ids = new Set<string>();
  const collect = (entries: { track: unknown }[] | undefined) =>
    (entries ?? []).forEach((e) => ids.add(String(e.track)));

  collect(doc.newMusic);
  collect(doc.chart);
  collect(doc.curation?.tracks);

  const trackDocs = await Track.find({ _id: { $in: [...ids] } }).lean();
  const tracks = new Map<string, TrackDTO>(
    trackDocs.map((t) => [String(t._id), trackDTO(t)]),
  );

  const history = await getChartHistory();
  const number: number = doc.number;

  // The most recent PUBLISHED volume below this one. A draft between two
  // published volumes must not break the chain.
  const previousNumber = [...history.numbers].reverse().find((n) => n < number) ?? null;
  const previous = previousNumber === null ? null : history.byVolume.get(previousNumber)!;

  const entryList = (entries: { track: unknown; note?: string }[] | undefined): ListEntryDTO[] =>
    (entries ?? [])
      .map((e) => ({ track: tracks.get(String(e.track)), note: e.note ?? "" }))
      .filter((e): e is ListEntryDTO => Boolean(e.track));

  const chart: ChartRowDTO[] = (doc.chart ?? [])
    .slice()
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((entry: { track: unknown; position: number; note?: string }) => {
      const track = tracks.get(String(entry.track));
      if (!track) return null;

      const id = String(entry.track);
      const previousPosition = previous?.get(id) ?? null;

      // Weeks and peak look at every published volume up to and including this
      // one; a volume above this one is the future as far as this page is
      // concerned, and folding it in would let a re-publish rewrite history.
      let appearances = 0;
      let peak = entry.position;
      let earlierEver = false;

      for (const n of history.numbers) {
        if (n > number) break;
        const position = history.byVolume.get(n)?.get(id);
        if (position === undefined) continue;
        appearances += 1;
        if (position < peak) peak = position;
        if (previousNumber !== null && n < previousNumber) earlierEver = true;
      }

      // A draft being previewed is not in the history at all, so count it here.
      if (!history.byVolume.has(number)) appearances += 1;

      return {
        track,
        position: entry.position,
        note: entry.note ?? "",
        movement: deriveMovement(entry.position, previousPosition, earlierEver),
        weeks: appearances * WEEKS_PER_VOLUME,
        peak,
      } satisfies ChartRowDTO;
    })
    .filter(Boolean) as ChartRowDTO[];

  const curation =
    doc.curation && doc.curation.curator?.name
      ? {
          curator: {
            name: doc.curation.curator.name,
            igHandle: doc.curation.curator.igHandle ?? "",
            discipline: doc.curation.curator.discipline ?? "",
            photo: doc.curation.curator.photo?.url ? toDTO<VolumeDTO["coverImage"]>(doc.curation.curator.photo) : null,
            statement: doc.curation.curator.statement ?? "",
          },
          tracks: entryList(doc.curation.tracks),
        }
      : null;

  return {
    id: String(doc._id),
    number,
    slug: doc.slug,
    status: doc.status,
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : null,
    intro: doc.intro ?? "",
    coverImage: doc.coverImage?.url ? toDTO<VolumeDTO["coverImage"]>(doc.coverImage) : null,
    // Newest release first, and unranked — see the New Music treatment.
    newMusic: entryList(doc.newMusic).sort(
      (a, b) => +new Date(b.track.releaseDate) - +new Date(a.track.releaseDate),
    ),
    chart,
    curation,
    playlists: {
      newMusic: doc.playlists?.newMusic ?? {},
      chart: doc.playlists?.chart ?? {},
      curation: doc.playlists?.curation ?? {},
    },
  };
}

/** The volume `/rotation` renders. Null before Vol. 01 exists. */
export const getCurrentVolume = cache(async function getCurrentVolume(): Promise<VolumeDTO | null> {
  await dbConnect();
  const doc = await ChartVolume.findOne({ status: "published" }).sort({ number: -1 }).lean();
  return doc ? hydrate(doc as Record<string, any>) : null;
});

export async function getVolumeBySlug(slug: string): Promise<VolumeDTO | null> {
  await dbConnect();
  const doc = await ChartVolume.findOne({ slug, status: "published" }).lean();
  return doc ? hydrate(doc as Record<string, any>) : null;
}

export type ArchiveEntry = {
  number: number;
  slug: string;
  publishedAt: string | null;
  intro: string;
  coverImage: VolumeDTO["coverImage"];
  /** The top three artists, which is what the archive row is actually for. */
  leading: string[];
};

export async function getVolumeArchive(): Promise<ArchiveEntry[]> {
  await dbConnect();
  const docs = await ChartVolume.find({ status: "published" })
    .select("number slug publishedAt intro coverImage chart")
    .sort({ number: -1 })
    .lean();

  const ids = docs.flatMap((d) =>
    (d.chart ?? [])
      .filter((e) => e.position <= 3)
      .map((e) => String(e.track)),
  );
  const trackDocs = await Track.find({ _id: { $in: ids } }).select("artist").lean();
  const artists = new Map(trackDocs.map((t) => [String(t._id), t.artist]));

  return docs.map((d) => ({
    number: d.number,
    slug: d.slug,
    publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
    intro: d.intro ?? "",
    coverImage: d.coverImage?.url ? toDTO<VolumeDTO["coverImage"]>(d.coverImage) : null,
    leading: (d.chart ?? [])
      .filter((e) => e.position <= 3)
      .sort((a, b) => a.position - b.position)
      .map((e) => artists.get(String(e.track)))
      .filter((a): a is string => Boolean(a)),
  }));
}

/** Only `/rotation/[slug]` goes in the sitemap — `/rotation` canonicals to it. */
export async function getPublishedVolumeSlugs(): Promise<
  { slug: string; publishedAt: string | null }[]
> {
  await dbConnect();
  const docs = await ChartVolume.find({ status: "published" })
    .select("slug publishedAt")
    .sort({ number: -1 })
    .lean();
  return docs.map((d) => ({
    slug: d.slug,
    publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
  }));
}

export type HomeRotation = HomeDoorData;

/**
 * The homepage section: the current volume's three doors, or nothing at all.
 *
 * Each list is capped at three here rather than in the component, so the
 * homepage never resolves artwork it will not render — this section adds ten
 * small images below the fold and every one of them has to earn its bytes.
 *
 * Returns null with no published volume: the section is ABSENT in that case,
 * not an empty state.
 */
export async function getHomeRotation(): Promise<HomeRotation | null> {
  const volume = await getCurrentVolume();
  if (!volume) return null;

  return {
    number: volume.number,
    slug: volume.slug,
    // Drives the masthead row's date range — Revision 15 §5.1.
    publishedAt: volume.publishedAt,
    newMusic: volume.newMusic.slice(0, 3),
    chart: volume.chart.slice(0, 3),
    // A volume with no curation drops that door and the other two split the
    // width — there is no "curator TBA" state here either.
    curation: volume.curation
      ? { curator: volume.curation.curator, tracks: volume.curation.tracks.slice(0, 3) }
      : null,
  };
}

/** Admin: the previous volume's chart, for "start from last volume". */
export async function getVolumeForCopy(beforeNumber: number) {
  await dbConnect();
  const doc = await ChartVolume.findOne({ number: { $lt: beforeNumber } })
    .sort({ number: -1 })
    .lean();
  return doc;
}

export { volumeSlug };

/** Adjacent published volumes, for the header's previous/next links. */
export async function getVolumeNeighbours(number: number): Promise<{
  previousSlug: string | null;
  nextSlug: string | null;
}> {
  await dbConnect();
  const [previous, next] = await Promise.all([
    ChartVolume.findOne({ status: "published", number: { $lt: number } })
      .sort({ number: -1 })
      .select("slug")
      .lean(),
    ChartVolume.findOne({ status: "published", number: { $gt: number } })
      .sort({ number: 1 })
      .select("slug")
      .lean(),
  ]);
  return { previousSlug: previous?.slug ?? null, nextSlug: next?.slug ?? null };
}
