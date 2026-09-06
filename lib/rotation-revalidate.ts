import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Publishing or editing anything in Rotation changes five surfaces, and missing
 * one of them is how a chart goes stale in public: the homepage doors,
 * `/rotation`, the volume's own page, the archive index and the sitemap.
 *
 * WHY LITERAL VOLUME PATHS AND NOT JUST THE ROUTE PATTERN.
 *
 * `revalidatePath("/rotation/[slug]", "page")` alone was NOT enough. After an
 * edit, Vols 04-06 regenerated and Vol. 07 — the current one, the one also
 * rendered at `/rotation` — kept serving its build-time prerender with
 * `x-nextjs-cache: HIT`. So every affected slug is invalidated explicitly as
 * well; the pattern call stays as a backstop for volumes the caller did not
 * name.
 *
 * Callers pass EVERY affected slug, not just the one they edited. Editing an
 * older volume changes the derived movement in every volume above it — that is
 * the whole point of deriving it — so those pages are stale too even though
 * nothing in their own documents changed.
 */
export function revalidateRotation(slugs: string[] = []) {
  revalidatePath("/");
  revalidatePath("/rotation");
  revalidatePath("/rotation/archive");
  revalidatePath("/rotation/[slug]", "page");
  revalidatePath("/sitemap.xml");

  for (const slug of new Set(slugs.filter(Boolean))) {
    revalidatePath(`/rotation/${slug}`);
  }
}
