/**
 * The one place that decides which image hosts are allowed.
 *
 * `next/image` THROWS when it is handed a hostname that is not in
 * `images.remotePatterns` — in dev that is a 500 on the public route, which is
 * exactly how a pasted Pinterest URL took down a published article. The editor
 * validates against this list at paste time so the author is told immediately,
 * where they can fix it, instead of the reader finding out.
 *
 * Keep this in sync with `images.remotePatterns` in next.config.ts.
 */
export const ALLOWED_IMAGE_HOSTS = [
  "res.cloudinary.com", // everything uploaded through the admin
  "images.unsplash.com", // seed placeholders, removable once real content lands
] as const;

export type ImageHostCheck =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/** Validates a pasted image URL against the allowlist. */
export function checkImageUrl(raw: string): ImageHostCheck {
  const value = raw.trim();
  if (!value) return { ok: false, reason: "Paste an image URL first." };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      ok: false,
      reason: "That isn't a full URL — it needs to start with https://",
    };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "Image URLs must use https." };
  }

  if (!ALLOWED_IMAGE_HOSTS.includes(parsed.hostname as (typeof ALLOWED_IMAGE_HOSTS)[number])) {
    return {
      ok: false,
      reason: `Images can't be loaded from ${parsed.hostname}. Upload the file instead — it'll be served from Cloudinary.`,
    };
  }

  return { ok: true, url: parsed.toString() };
}

/** Server-side guard used by the renderer so a stored bad URL never throws. */
export function isAllowedImageUrl(raw: unknown): boolean {
  return typeof raw === "string" && checkImageUrl(raw).ok;
}
