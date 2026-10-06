import "server-only";
import { revalidatePath } from "next/cache";
import { SLUG_BASE, type SlugType } from "./slug";

/**
 * After an address changes, both pages are stale: the new one doesn't exist in
 * the cache yet, and the old one must start answering with a 308 instead of
 * the article it used to render.
 */
export function revalidateSlugChange(type: SlugType, slug: string, oldSlug?: string) {
  const base = SLUG_BASE[type];
  revalidatePath(`${base}/${slug}`);
  if (oldSlug) revalidatePath(`${base}/${oldSlug}`);
  revalidatePath(base);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}
