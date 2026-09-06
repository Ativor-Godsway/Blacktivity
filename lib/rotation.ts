import { slugify } from "./utils";
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

export const MAX_TRACK_LINKS = 3;

/** The three lists, in page order. */
export const LIST_TYPES = ["newMusic", "chart", "curation"] as const;
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

/** What the homepage's three doors render. See getHomeRotation. */
export type HomeDoorData = {
  number: number;
  slug: string;
  newMusic: ListEntryDTO[];
  chart: ChartRowDTO[];
  curation: VolumeDTO["curation"];
};

/** `vol-07` — zero-padded so the archive sorts as text and reads as an issue. */
export function volumeSlug(number: number): string {
  return `vol-${String(number).padStart(2, "0")}`;
}

export function volumeLabel(number: number): string {
  return `VOL. ${String(number).padStart(2, "0")}`;
}

/**
 * The dedupe key: `normalise(artist)--normalise(title)`. Two dashes, so an
 * artist or title that already contains one cannot forge the boundary.
 */
export function trackSlug(artist: string, title: string): string {
  return `${slugify(artist)}--${slugify(title)}`;
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
export const curatorEventLabel = (igHandle: string) => `rotation:curator:${igHandle}`;
