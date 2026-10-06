import { trackKeyPart } from "./slug";
import type { ImageRef } from "./types";

/**
 * ROTATION — the shared vocabulary for the music section.
 *
 * Pure functions only, no server imports: the seed script, the admin and the
 * public pages all derive slugs and movement the same way, so a track added by
 * the seed and one added by hand collide on the same key rather than
 * duplicating.
 */

/**
 * Fixed priority order so link labels align down the column, and Audiomack and
 * YouTube lead deliberately — that is where this audience actually listens.
 * Rendering is capped at MAX_TRACK_LINKS; the rest are simply omitted.
 *
 * THE ORDER IS UNCHANGED BY REVISION 17 even though the cap drops. That is the
 * point of a fixed order: whichever two a track has, they land in the same
 * sequence, so the labels still form a straight column down each grid column.
 */
export const PLATFORMS = [
  { key: "audiomack", label: "Audiomack" },
  { key: "youtube", label: "YouTube" },
  { key: "spotify", label: "Spotify" },
  { key: "boomplay", label: "Boomplay" },
  { key: "appleMusic", label: "Apple Music" },
  { key: "soundcloud", label: "SoundCloud" },
] as const;

export type PlatformKey = (typeof PLATFORMS)[number]["key"];

/**
 * TWO, NOT THREE — Revision 17 §3.
 *
 * The cap of three was written for a full-width row. Every row now lives in a
 * grid cell under half the page wide, and a third mono label pushes the artist
 * name onto a second line at 1280. Priority order (above) is what keeps the
 * surviving two aligned down the column.
 */
export const MAX_TRACK_LINKS = 2;

/**
 * The lists, in PAGE order — Chart first, New Releases second (Revision 17 §0).
 *
 * `curation` stays in the union because ChartVolume still stores a curation and
 * the admin still edits it (§6). It simply no longer renders on the public
 * page. Removing the key would be a migration for a label change.
 */
export const LIST_TYPES = ["chart", "newMusic", "curation"] as const;
export type ListType = (typeof LIST_TYPES)[number];

/** Playlist blocks only ever offer these three. */
export const PLAYLIST_PLATFORMS = ["spotify", "audiomack", "youtube"] as const;
export type PlaylistPlatform = (typeof PLAYLIST_PLATFORMS)[number];

export const CHART_SIZE = 10;
/** Bi-weekly cadence — weeks-on-chart is volumes × this. */
export const WEEKS_PER_VOLUME = 2;

export type TrackLinks = Partial<Record<PlatformKey, string>>;

export type TrackDTO = {
  id: string;
  title: string;
  artist: string;
  featuring: string[];
  slug: string;
  artwork: ImageRef;
  releaseDate: string;
  origin: string;
  links: TrackLinks;
};

/** `NEW` and `RE` are words; a change is a glyph plus a number. Never a hue. */
export type Movement =
  | { kind: "new" }
  | { kind: "re" }
  | { kind: "up"; by: number }
  | { kind: "down"; by: number }
  | { kind: "hold" };

export type ChartRowDTO = {
  track: TrackDTO;
  position: number;
  note: string;
  movement: Movement;
  /** Bi-weekly, so this is (published volumes containing the track) × 2. */
  weeks: number;
  peak: number;
};

export type ListEntryDTO = { track: TrackDTO; note: string };

export type CuratorDTO = {
  name: string;
  igHandle: string;
  discipline: string;
  photo: ImageRef | null;
  statement: string;
};

export type PlaylistSet = Partial<Record<PlaylistPlatform, string>>;

export type VolumeDTO = {
  id: string;
  number: number;
  slug: string;
  status: "draft" | "published";
  publishedAt: string | null;
  intro: string;
  coverImage: ImageRef | null;
  newMusic: ListEntryDTO[];
  chart: ChartRowDTO[];
  curation: { curator: CuratorDTO; tracks: ListEntryDTO[] } | null;
  playlists: Record<ListType, PlaylistSet>;
};

/**
 * What the homepage's Rotation poster renders — Revision 16.
 *
 * Note how little this is. The three-door block it replaces pulled the top
 * three of each list plus a curator portrait, which is ten images and roughly
 * thirty fields, all to summarise a page the reader was one click from anyway.
 * The poster states the volume, the fortnight and the size of the drop, and
 * sends them there instead.
 */
export type RotationPosterData = {
  number: number;
  slug: string;
  publishedAt: string | null;
  /** Distinct tracks across all three lists — the "10 TRACKS" line. */
  trackCount: number;
};

/**
 * The fortnight a volume covers: "29 AUG — 12 SEP 2026".
 *
 * Thirteen days, not fourteen — the range is inclusive at both ends, so a
 * volume published on the 29th runs THROUGH the 11th and the next one opens on
 * the 12th. Adding WEEKS_PER_VOLUME × 7 here would print two volumes sharing a
 * boundary date.
 *
 * The year appears once, on the end date; the start date's is stripped.
 */
export const FORTNIGHT_DAYS = 13;

export function volumeDateRange(
  publishedAt: string | null,
  formatDate: (d: Date) => string,
): string {
  if (!publishedAt) return "";
  const start = new Date(publishedAt);
  const end = new Date(start.getTime() + FORTNIGHT_DAYS * 24 * 60 * 60 * 1000);
  return `${formatDate(start).replace(/ \d{4}$/, "")} — ${formatDate(end)}`;
}

/** `vol-07` — zero-padded so the archive sorts as text and reads as an issue. */
export function volumeSlug(number: number): string {
  return `vol-${String(number).padStart(2, "0")}`;
}

export function volumeLabel(number: number): string {
  return `VOL. ${String(number).padStart(2, "0")}`;
}

/**
 * `Vol. 07` — the SECOND LINE OF THE <h1> (Revision 17 §2), and nowhere else.
 *
 * The mono form above is uppercase because mono labels on this site are; this
 * one is set in the display serif at 7rem, where full caps read as shouting
 * next to "Rotation". Same number, different voice — which is why it is its own
 * function rather than a `.replace()` at the call site.
 */
export function volumeTitleLabel(number: number): string {
  return `Vol. ${String(number).padStart(2, "0")}`;
}

/**
 * The dedupe key: `normalise(artist)--normalise(title)`. Two dashes, so an
 * artist or title that already contains one cannot forge the boundary.
 */
export function trackSlug(artist: string, title: string): string {
  return `${trackKeyPart(artist)}--${trackKeyPart(title)}`;
}

/**
 * Movement against the previous published volume.
 *
 * `earlierEver` is "did this track chart in ANY published volume before the
 * previous one" — that is the whole difference between NEW and RE, and getting
 * it from the previous volume alone is impossible.
 */
export function deriveMovement(
  position: number,
  previousPosition: number | null,
  earlierEver: boolean,
): Movement {
  if (previousPosition === null) return earlierEver ? { kind: "re" } : { kind: "new" };
  if (previousPosition === position) return { kind: "hold" };
  // A LOWER number is a BETTER position, so a drop in number is a rise.
  return previousPosition > position
    ? { kind: "up", by: previousPosition - position }
    : { kind: "down", by: position - previousPosition };
}

/** `▲2`, `NEW`, `—`. The glyph carries the direction; colour never does. */
export function movementText(m: Movement): string {
  switch (m.kind) {
    case "new":
      return "NEW";
    case "re":
      return "RE";
    case "up":
      return `▲${m.by}`;
    case "down":
      return `▼${m.by}`;
    case "hold":
      return "—";
  }
}

/** Spoken form — the glyphs are meaningless to a screen reader. */
export function movementLabel(m: Movement): string {
  switch (m.kind) {
    case "new":
      return "New entry";
    case "re":
      return "Re-entry";
    case "up":
      return `Up ${m.by}`;
    case "down":
      return `Down ${m.by}`;
    case "hold":
      return "No change";
  }
}

/**
 * Thirty rows at 50ms each is a 1.5s reveal, which reads as broken. The total
 * is capped at 400ms regardless of list length.
 */
export const STAGGER_CAP_MS = 400;
export function staggerDelay(index: number): number {
  return Math.min(index * 50, STAGGER_CAP_MS) / 1000;
}

/**
 * COLUMN-MAJOR SPLIT — Revision 17 §3.
 *
 * `ceil(n / 2)` down the left, the remainder down the right. At ten that is
 * 01-05 and 06-10; at nine it is five and four, and the trailing right-hand
 * cell is simply empty.
 *
 * IT IS DELIBERATELY NOT BALANCED. Moving the ninth row across to even the
 * columns up would put entry 05 at the top of the right column and entry 06
 * below it in the left — i.e. it would break the reading order to fix a ragged
 * edge nobody is reading. The ragged edge wins.
 *
 * Returns the LENGTH of the left column rather than two arrays: the grid keeps
 * ONE list in DOM order and lets `grid-auto-flow: column` place it (see
 * `.rotation-grid`), so all the renderer needs to know is where the second
 * column starts.
 */
export function leftColumnCount(total: number): number {
  return Math.ceil(total / 2);
}

/** `29 AUG` — the New Releases slot column. No year: the volume states it. */
export function releaseDateSlot(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/**
 * How many rows load eagerly — Revision 17 §9.
 *
 * The page carries roughly twenty 72px images where it used to carry ten and a
 * portrait. Four is the count that is actually above the fold at 1280 once the
 * title block has taken its share; every image past it is lazy, and twenty
 * eager decodes is precisely how this page would end up slower than the one it
 * replaces.
 */
export const EAGER_ROWS = 4;

/** The links to actually render, in priority order, capped at three. */
export function visibleLinks(links: TrackLinks): { key: PlatformKey; label: string; url: string }[] {
  return PLATFORMS.filter((p) => Boolean(links[p.key]))
    .slice(0, MAX_TRACK_LINKS)
    .map((p) => ({ key: p.key, label: p.label, url: links[p.key]! }));
}

/** `rotation:track:{slug}:{platform}` — see the analytics contract. */
export const trackEventLabel = (trackSlugValue: string, platform: string) =>
  `rotation:track:${trackSlugValue}:${platform}`;
export const playlistEventLabel = (volume: string, list: ListType, platform: string) =>
  `rotation:playlist:${volume}:${list}:${platform}`;
export const volumeEventLabel = (volume: string) => `rotation:volume:${volume}`;

/*
 * `rotation:curator:*` IS GONE — Revision 17 §6.
 *
 * The curation no longer renders publicly, so there is no link left to emit it
 * from. The historical rows in DailyStat are deliberately left alone: deleting
 * measurements because the thing they measured moved is how a section loses its
 * own history.
 */

/**
 * THE CURATION EDITOR IS OFF — Revision 27 §1.2.
 *
 * The public page doesn't show the curation (Revision 17 §6), and an editor for
 * invisible content confuses a first-time owner. The data and the editor code
 * are kept; set this to true to bring the panel back on /admin/rotation.
 */
export const ROTATION_CURATION_EDITOR = false;

/** The admin's name for a past period: "Rotation 07". Never "volume". */
export function rotationLabel(number: number): string {
  return `Rotation ${String(number).padStart(2, "0")}`;
}
