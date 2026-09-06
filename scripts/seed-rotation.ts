/**
 * ROTATION SEED — Vols. 04 to 07.
 *
 * Four volumes, not one, so movement, re-entries, weeks-on-chart, peak
 * positions and the archive index all demo properly instead of showing a
 * first-volume edge case on every row.
 *
 * EVERY ARTIST NAME HERE IS INVENTED. Plausible Ghanaian, Nigerian, UK and
 * US-diaspora names, and deliberately not real musicians: the client will
 * screenshot this, and a fabricated chart position attached to a real artist is
 * a problem placeholder data has no business creating.
 *
 * LINKS are platform SEARCH urls, which genuinely resolve. Inventing
 * `open.spotify.com/track/<made-up-id>` would 404 on every row.
 */
export type SeedTrack = {
  key: string;
  artist: string;
  title: string;
  featuring?: string[];
  origin: string;
  /** Days before now the record came out. */
  releasedDaysAgo: number;
  platforms: ("audiomack" | "youtube" | "spotify")[];
};

export const SEED_TRACKS: SeedTrack[] = [
  { key: "a", artist: "Kwabena Osei", title: "Harmattan Season", origin: "Accra", releasedDaysAgo: 58, platforms: ["audiomack", "youtube", "spotify"] },
  { key: "b", artist: "Ama Serwaa", title: "Nightbus", featuring: ["Dele Ajayi"], origin: "London", releasedDaysAgo: 55, platforms: ["spotify", "youtube"] },
  { key: "c", artist: "Nii Lartey", title: "Jamestown Blue", origin: "Accra", releasedDaysAgo: 54, platforms: ["audiomack", "spotify"] },
  { key: "d", artist: "Chidera Nwosu", title: "Owerri Interlude", origin: "Lagos", releasedDaysAgo: 52, platforms: ["audiomack", "youtube"] },
  { key: "e", artist: "Yaa Mensimah", title: "Cocoa Money", origin: "Kumasi", releasedDaysAgo: 50, platforms: ["youtube", "spotify"] },
  { key: "f", artist: "Tobi Adeleke", title: "Third Mainland", origin: "Lagos", releasedDaysAgo: 47, platforms: ["audiomack", "youtube", "spotify"] },
  { key: "g", artist: "Selorm Agbeko", title: "Volta Wide", origin: "Ho", releasedDaysAgo: 45, platforms: ["audiomack"] },
  { key: "h", artist: "Mariama Sesay", title: "Peckham Rye", origin: "London", releasedDaysAgo: 44, platforms: ["spotify", "youtube"] },
  { key: "i", artist: "Kojo Antwi-Barnes", title: "Dansoman Nights", origin: "Accra", releasedDaysAgo: 43, platforms: ["audiomack", "youtube"] },
  { key: "j", artist: "Zainab Bello", title: "Kaduna Gold", origin: "Abuja", releasedDaysAgo: 41, platforms: ["audiomack", "spotify"] },

  { key: "k", artist: "Efe Okonkwo", title: "Slow Burner", featuring: ["Ama Serwaa"], origin: "Lagos", releasedDaysAgo: 33, platforms: ["youtube", "spotify"] },
  { key: "l", artist: "Papa Kwesi", title: "Trotro Sermon", origin: "Cape Coast", releasedDaysAgo: 31, platforms: ["audiomack", "youtube"] },
  { key: "m", artist: "Naa Adjeley", title: "Osu After Rain", origin: "Accra", releasedDaysAgo: 22, platforms: ["audiomack", "spotify", "youtube"] },
  { key: "n", artist: "Bankole Sowande", title: "Ikoyi Bridge", origin: "Lagos", releasedDaysAgo: 20, platforms: ["spotify", "youtube"] },
  { key: "o", artist: "Adjoa Bediako", title: "Kaneshie 6AM", origin: "Accra", releasedDaysAgo: 9, platforms: ["audiomack", "youtube", "spotify"] },
  { key: "p", artist: "Femi Balogun", title: "Yaba Left", origin: "Lagos", releasedDaysAgo: 7, platforms: ["audiomack", "youtube"] },

  { key: "q", artist: "Esi Quartey", title: "Labadi Tape", origin: "Accra", releasedDaysAgo: 38, platforms: ["audiomack"] },
  { key: "r", artist: "Deji Falana", title: "Surulere Slow", origin: "Lagos", releasedDaysAgo: 36, platforms: ["spotify"] },
  { key: "s", artist: "Kesse Boateng", title: "Adum Corner", origin: "Kumasi", releasedDaysAgo: 29, platforms: ["audiomack", "youtube"] },
  { key: "t", artist: "Iyabo Cole", title: "Brixton Dub", origin: "London", releasedDaysAgo: 27, platforms: ["spotify", "youtube"] },
  { key: "u", artist: "Kobby Sarpong", title: "Tema Motorway", origin: "Tema", releasedDaysAgo: 24, platforms: ["audiomack", "spotify"] },
  { key: "v", artist: "Ngozi Umeh", title: "Enugu Rain", origin: "Enugu", releasedDaysAgo: 18, platforms: ["youtube"] },
  { key: "w", artist: "Delali Attipoe", title: "Keta Lagoon", origin: "Keta", releasedDaysAgo: 12, platforms: ["audiomack", "youtube"] },
  { key: "x", artist: "Renee Baffour", title: "Brooklyn Highlife", origin: "New York", releasedDaysAgo: 6, platforms: ["spotify", "youtube"] },
  { key: "y", artist: "Sena Dzikunu", title: "Aflao Border", origin: "Aflao", releasedDaysAgo: 4, platforms: ["audiomack"] },
  { key: "z", artist: "Hakeem Ojo", title: "Alagomeji", featuring: ["Zainab Bello"], origin: "Lagos", releasedDaysAgo: 3, platforms: ["audiomack", "spotify", "youtube"] },
];

export type SeedVolume = {
  number: number;
  publishedDaysAgo: number;
  intro: string;
  /** Chart order — index 0 is position 01. */
  chart: string[];
  newMusic: string[];
  notes?: Record<string, string>;
  curation?: {
    name: string;
    igHandle: string;
    discipline: string;
    statement: string;
    tracks: string[];
  };
};

/**
 * The turnover is deliberate and is what makes the derived numbers legible:
 *
 *   "a" holds 01 across all four volumes — a long-running number one, so
 *        weeks-on-chart reaches 08 WKS and movement reads "—".
 *   "i" charts in 04, drops out of 05, returns in 06 — a RE-ENTRY.
 *   "j" charts in 04, is gone for two volumes, returns in 07 — a second one.
 *   two or three genuine NEW entries arrive in every volume.
 */
export const SEED_VOLUMES: SeedVolume[] = [
  {
    number: 4,
    publishedDaysAgo: 45,
    intro:
      "The harmattan volume. Everything here was recorded in a room with the windows shut and the fan off, and you can hear it.",
    chart: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
    newMusic: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    notes: { a: "The one everybody sent us. Deserved.", i: "Recorded in a Dansoman bedroom on a borrowed interface." },
    curation: {
      name: "Nana Aba Mensah",
      igHandle: "nanaaba.plays",
      discipline: "DJ / Selector",
      statement:
        "I picked records that sound like the walk home rather than the club. Half of these were sent to me as voice notes before they were songs, which is how most of what I play reaches me — a friend of a friend, compressed to nothing, still better than anything on the radio that week.",
      tracks: ["c", "g", "i", "e"],
    },
  },
  {
    number: 5,
    publishedDaysAgo: 31,
    intro:
      "Two weeks that belonged to Lagos. The chart barely moved at the top and moved everywhere else.",
    chart: ["a", "f", "b", "k", "d", "l", "c", "e", "h", "g"],
    newMusic: ["k", "l", "q", "r", "s", "t", "u"],
    notes: { k: "The Ama Serwaa verse is the whole record.", l: "A sermon, an actual one, over an amapiano log drum." },
  },
  {
    number: 6,
    publishedDaysAgo: 17,
    intro:
      "A re-entry, two debuts, and one record that has now been number one for six weeks without ever being played on daytime radio.",
    chart: ["a", "k", "m", "f", "n", "b", "i", "l", "d", "c"],
    newMusic: ["m", "n", "u", "v", "w", "s", "t"],
    notes: { i: "Back, three months later, because a barbershop in Osu never stopped playing it." },
    curation: {
      name: "Kwesi Amankwah",
      igHandle: "kwesi.shoots",
      discipline: "Photographer",
      statement:
        "I shoot to music and I never shoot to anything with words I can follow. So this is a list of records where the voice is doing the work of an instrument — you feel where it goes before you understand what it says. That is the same thing I am trying to do with a portrait.",
      tracks: ["m", "n", "t", "v", "u"],
    },
  },
  {
    number: 7,
    publishedDaysAgo: 3,
    intro:
      "Kaneshie at six in the morning, Yaba in the afternoon, and a record from 2024 that refuses to leave the chart.",
    chart: ["a", "o", "m", "p", "k", "j", "n", "w", "f", "b"],
    newMusic: ["o", "p", "x", "y", "z", "w", "v", "m"],
    notes: {
      a: "Eight weeks at number one. We checked twice.",
      j: "Two volumes away and straight back in at six.",
      o: "The best-produced Ghanaian record of the year so far, and it is not close.",
    },
    curation: {
      name: "Abena Ofori-Atta",
      igHandle: "abena.writes",
      discipline: "Writer",
      statement:
        "Everything on this list is about leaving somewhere. I did not plan that. I put the playlist together over one weekend after helping my sister pack for Toronto, and when I read the titles back it was Aflao, Ikoyi Bridge, Brooklyn, a border, a bridge, a borough. Music finds the thing you were not saying.",
      tracks: ["y", "x", "z", "n", "o"],
    },
  },
];

/** Platform search URLs — real pages, no invented ids. */
export function platformUrl(platform: string, artist: string, title: string): string {
  const q = encodeURIComponent(`${artist} ${title}`);
  switch (platform) {
    case "audiomack":
      return `https://audiomack.com/search?q=${q}`;
    case "youtube":
      return `https://www.youtube.com/results?search_query=${q}`;
    case "spotify":
      return `https://open.spotify.com/search/${q}`;
    default:
      return "";
  }
}

/* -------------------------------------------------------------------------
   THE WRITER.
   
   This lives beside the data rather than in seed.ts because two entry points
   need it: the full local reset (`npm run seed`) and the additive
   rotation-only run (`npm run seed:rotation`) that is safe to point at a
   database holding real articles and events.

   IT IS IDEMPOTENT. Tracks are matched on `slug` and volumes on `number`, so
   re-running updates in place instead of duplicating. That matters more here
   than anywhere else in the seed: a second Track document for the same song
   silently breaks movement — the previous volume still points at the first
   _id — and splits one record's chart history across two documents.
------------------------------------------------------------------------- */
import type { Model } from "mongoose";
import { trackSlug, volumeSlug } from "../lib/rotation";
import { PLACEHOLDER_IMAGES, NEUTRAL_BLUR } from "../data/seed-content";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);

export type RotationSeedResult = {
  tracksInserted: number;
  tracksUpdated: number;
  volumesInserted: number;
  volumesUpdated: number;
  curations: number;
};

export async function seedRotation(
  Track: Model<any>,
  ChartVolume: Model<any>,
  /**
   * Only the full local reset clears first. The rotation-only entry point
   * leaves anything already in these collections alone and upserts over it.
   */
  { reset = false }: { reset?: boolean } = {},
): Promise<RotationSeedResult> {
  if (reset) {
    await Track.deleteMany({});
    await ChartVolume.deleteMany({});
  }

  const result: RotationSeedResult = {
    tracksInserted: 0,
    tracksUpdated: 0,
    volumesInserted: 0,
    volumesUpdated: 0,
    curations: 0,
  };

  // key -> _id, so every volume below points at the SAME track document.
  const ids = new Map<string, string>();

  for (const [i, t] of SEED_TRACKS.entries()) {
    const links: Record<string, string> = {};
    for (const platform of t.platforms) links[platform] = platformUrl(platform, t.artist, t.title);

    const slug = trackSlug(t.artist, t.title);
    const existed = await Track.exists({ slug });

    const doc = await Track.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: t.title,
          artist: t.artist,
          featuring: t.featuring ?? [],
          slug,
          artwork: {
            url: PLACEHOLDER_IMAGES.artwork[i % PLACEHOLDER_IMAGES.artwork.length],
            publicId: "",
            alt: `${t.artist} — ${t.title}`,
            width: 400,
            height: 400,
            blurDataURL: NEUTRAL_BLUR,
          },
          releaseDate: daysAgo(t.releasedDaysAgo),
          origin: t.origin,
          links,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    if (existed) result.tracksUpdated += 1;
    else result.tracksInserted += 1;
    ids.set(t.key, String(doc._id));
  }

  for (const [i, v] of SEED_VOLUMES.entries()) {
    const note = (key: string) => v.notes?.[key] ?? "";
    const existed = await ChartVolume.exists({ number: v.number });

    await ChartVolume.findOneAndUpdate(
      { number: v.number },
      {
        $set: {
          number: v.number,
          slug: volumeSlug(v.number),
          status: "published",
          publishedAt: daysAgo(v.publishedDaysAgo),
          intro: v.intro,
          coverImage: null,
          newMusic: v.newMusic.map((key) => ({ track: ids.get(key), note: note(key) })),
          chart: v.chart.map((key, position) => ({
            track: ids.get(key),
            position: position + 1,
            note: note(key),
          })),
          curation: v.curation
            ? {
                curator: {
                  name: v.curation.name,
                  igHandle: v.curation.igHandle,
                  discipline: v.curation.discipline,
                  statement: v.curation.statement,
                  photo: {
                    url: PLACEHOLDER_IMAGES.curators[i % PLACEHOLDER_IMAGES.curators.length],
                    publicId: "",
                    alt: v.curation.name,
                    width: 1000,
                    height: 1250,
                    blurDataURL: NEUTRAL_BLUR,
                  },
                },
                tracks: v.curation.tracks.map((key) => ({ track: ids.get(key), note: "" })),
              }
            : null,
          // Real, resolvable search pages rather than invented playlist ids.
          playlists: {
            newMusic: { audiomack: "https://audiomack.com/trending" },
            chart: { spotify: "https://open.spotify.com/search/blacktivity%20chart" },
            curation: v.curation
              ? { youtube: "https://www.youtube.com/results?search_query=afrobeats%20mix" }
              : {},
          },
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    if (existed) result.volumesUpdated += 1;
    else result.volumesInserted += 1;
    if (v.curation) result.curations += 1;
  }

  return result;
}
