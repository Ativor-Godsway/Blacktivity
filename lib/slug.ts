import RESERVED_FROM_ROUTES from "./reserved-slugs.json";

/**
 * WEB ADDRESSES FROM TITLES — Revision 27 §2. The one slug helper.
 *
 * Pure and browser-safe: the "Change web address" input runs normaliseSlug()
 * as the owner types, and the server runs slugFromTitle() inside every save.
 * Uniqueness lives in lib/slug-server.ts, because only the server can know
 * what is taken.
 */

export type SlugType = "article" | "event";

/** Where each type lives on the site — the URL prefix the owner sees. */
export const SLUG_BASE: Record<SlugType, string> = { article: "/articles", event: "/events" };

export const SLUG_MAX = 60;

/**
 * Words that are, or would look like, real sub-routes. The list generated from
 * app/ (scripts/build/reserved-slugs.mjs → lib/reserved-slugs.json) is merged
 * in, so a route added later can't be shadowed by a title either.
 */
export const RESERVED_BASE = [
  "new", "edit", "archive", "admin", "api", "page", "feed", "rss",
  "search", "category", "tag", "latest", "drafts",
] as const;

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  ...RESERVED_BASE,
  ...(RESERVED_FROM_ROUTES as { segments: string[] }).segments,
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/**
 * Steps 1–2 of §2.2: lowercase, accents stripped, & → and, apostrophes dropped
 * without a gap, every other run of non-[a-z0-9] → one hyphen, ends trimmed.
 * Used as-is for an address the owner types.
 */
export function normaliseSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "") // combining marks: Kọ́lá → kola
    .replace(/&/g, " and ")
    .replace(/['’‘ʼ`´]/g, "") // Ghana's → ghanas
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Step 3: drop a leading "the", "a" or "an", then keep WHOLE words up to
 * SLUG_MAX characters. A word is never cut — except a single first word longer
 * than the limit, where there is nothing whole to keep.
 */
export function slugFromTitle(title: string, max = SLUG_MAX): string {
  let words = normaliseSlug(title).split("-").filter(Boolean);
  if (words.length > 1 && ["the", "a", "an"].includes(words[0]!)) words = words.slice(1);
  if (words.length === 0) return "";

  const kept: string[] = [];
  let length = 0;
  for (const w of words) {
    const next = length === 0 ? w.length : length + 1 + w.length;
    if (next > max) break;
    kept.push(w);
    length = next;
  }
  if (kept.length === 0) return words[0]!.slice(0, max);
  return kept.join("-");
}

/** Step 4: a title with nothing usable in it (all emoji or symbols). */
export function fallbackSlug(type: SlugType, date = new Date()): string {
  return `${type}-${date.toISOString().slice(0, 10)}`;
}

/** The address a title would get before uniqueness — what the preview starts from. */
export function baseSlug(type: SlugType, title: string, date = new Date()): string {
  return slugFromTitle(title) || fallbackSlug(type, date);
}

/** A slug that can be stored as-is: normalised, non-empty, within the limit. */
export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 80 && normaliseSlug(slug) === slug;
}

/**
 * The Rotation track KEY, `artist--title` — a dedupe key, never a web address.
 * Kept byte-for-byte as it was (no & → and, no apostrophe rule, 80 cap): the
 * key is how an imported track finds its existing document, and changing the
 * normalisation would make every existing track with an apostrophe import as a
 * duplicate and split its chart history.
 */
export function trackKeyPart(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
