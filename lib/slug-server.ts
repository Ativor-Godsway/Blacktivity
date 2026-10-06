import "server-only";
import type { Model } from "mongoose";
import { baseSlug, isReservedSlug, isValidSlug, normaliseSlug, type SlugType } from "./slug";

/**
 * UNIQUE WEB ADDRESSES — Revision 27 §2.3. Server only: the browser can never
 * know what is taken, so it is never asked.
 *
 * Taken means: another document's slug, another document's previousSlugs (an
 * old address that now redirects), or a reserved word. The unique index on
 * `slug` is the final guard — two saves that race past the check both hit
 * Mongo, one gets E11000, and withUniqueSlug() retries it with the next suffix.
 */

type SlugModel = Model<any>;

async function taken(Model: SlugModel, slug: string, excludeId?: unknown): Promise<boolean> {
  if (isReservedSlug(slug)) return true;
  const query: Record<string, unknown> = { $or: [{ slug }, { previousSlugs: slug }] };
  if (excludeId) query._id = { $ne: excludeId };
  return Boolean(await Model.exists(query));
}

/** `base`, else `base-2`, `base-3`… — the first one that is free. */
export async function uniqueSlug(
  Model: SlugModel,
  base: string,
  { excludeId, skip = new Set<string>() }: { excludeId?: unknown; skip?: Set<string> } = {},
): Promise<string> {
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (skip.has(candidate)) continue;
    if (!(await taken(Model, candidate, excludeId))) return candidate;
  }
  throw new Error(`No free web address for "${base}".`);
}

/** True when a candidate the owner typed is free for this document. */
export async function isSlugFree(Model: SlugModel, slug: string, excludeId?: unknown): Promise<boolean> {
  return !(await taken(Model, slug, excludeId));
}

export function isDuplicateSlugError(err: unknown): boolean {
  const e = err as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
  return e?.code === 11000 && (e.keyPattern ? "slug" in e.keyPattern : /slug/.test(e.message ?? ""));
}

/**
 * Pick a free slug and run `write(slug)`. If the write loses a race (E11000 on
 * slug), that candidate is skipped and the next suffix tried — up to 5 times.
 */
export async function withUniqueSlug<T>(
  Model: SlugModel,
  base: string,
  write: (slug: string) => Promise<T>,
  { excludeId }: { excludeId?: unknown } = {},
): Promise<T> {
  const skip = new Set<string>();
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = await uniqueSlug(Model, base, { excludeId, skip });
    try {
      return await write(slug);
    } catch (err) {
      if (!isDuplicateSlugError(err)) throw err;
      skip.add(slug);
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * SAVE A DOCUMENT AND ITS WEB ADDRESS — the one path Article and Event share.
 *
 *   requested   an address the owner typed in "Change web address" (or undefined)
 *   wasLive     the item has been public, so its current address is out in the
 *               world: a change keeps the old one in previousSlugs (→ 308)
 *   followsTitle  draft that has never been public and never had a hand-set
 *               address, whose title changed (or is new): the slug is remade
 *
 * Otherwise the slug is left exactly as it is — after publishing, retitling
 * never changes the address. Returns { error } for the owner, or { oldSlug }
 * when the address changed (so the caller can revalidate both pages).
 */
export async function saveWithSlug(
  Model: SlugModel,
  doc: any,
  {
    type,
    requested,
    wasLive,
    followsTitle,
  }: { type: SlugType; requested?: string; wasLive: boolean; followsTitle: boolean },
): Promise<{ error?: string; oldSlug?: string }> {
  const old: string | undefined = doc.slug || undefined;

  if (requested !== undefined && requested.trim() !== "") {
    const next = normaliseSlug(requested);
    if (!isValidSlug(next)) return { error: "Use letters and numbers for the web address." };
    if (next !== old) {
      if (!(await isSlugFree(Model, next, doc.isNew ? undefined : doc._id))) {
        return { error: "That web address is already used. Try another." };
      }
      const previous: string[] = (doc.previousSlugs ?? []).filter((s: string) => s !== next);
      if (wasLive && old) previous.push(old);
      doc.previousSlugs = previous;
      doc.slug = next;
      doc.slugSetByOwner = true;
    }
    try {
      await doc.save();
    } catch (err) {
      if (isDuplicateSlugError(err)) return { error: "That web address was just taken. Try another." };
      throw err;
    }
    return { oldSlug: old && old !== doc.slug ? old : undefined };
  }

  if (followsTitle || !doc.slug) {
    const base = baseSlug(type, doc.title ?? "");
    await withUniqueSlug(
      Model,
      base,
      async (slug) => {
        doc.slug = slug;
        return doc.save();
      },
      { excludeId: doc.isNew ? undefined : doc._id },
    );
    return { oldSlug: old && old !== doc.slug ? old : undefined };
  }

  await doc.save();
  return {};
}
