/**
 * Custom next/image loader.
 *
 * Images are served from the CDN that already hosts them, with the
 * transformation expressed in the delivery URL. `next/image` still handles
 * sizing, `srcSet` and the blur placeholder — the loader only decides the URL.
 *
 * WHY: the optimizer was fetching Cloudinary originals and re-encoding them
 * locally — a double transformation, where the origin fetch timed out and
 * returned 500 after 9.2s:
 *
 *   upstream image response timed out for https://res.cloudinary.com/...
 *   GET /_next/image?url=...cloudinary...&w=1200&q=75  500 in 9.2s
 *
 * IMPORTANT: setting `loader: "custom"` DISABLES the built-in `/_next/image`
 * route entirely. It is not a per-host opt-in — every image must be handled
 * here or it 404s. A first version fell back to `/_next/image` for non-
 * Cloudinary sources and broke every Unsplash placeholder on the site.
 */
type LoaderArgs = { src: string; width: number; quality?: number };

const CLOUDINARY_UPLOAD = "/image/upload/";

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  // --- Cloudinary: transformation goes in the path ------------------------
  if (src.includes("res.cloudinary.com") && src.includes(CLOUDINARY_UPLOAD)) {
    const [head, tail] = src.split(CLOUDINARY_UPLOAD);
    // f_auto negotiates AVIF/WebP per browser; c_limit never upscales.
    const transform = `f_auto,q_${quality ?? "auto"},w_${width},c_limit`;
    return `${head}${CLOUDINARY_UPLOAD}${transform}/${tail}`;
  }

  // --- Unsplash: imgix query parameters -----------------------------------
  if (src.includes("images.unsplash.com")) {
    try {
      const url = new URL(src);
      const previousW = Number(url.searchParams.get("w"));
      const previousH = Number(url.searchParams.get("h"));

      // The seed URLs request an explicit crop (w + h + fit=crop). Scale the
      // height with the width so the intended aspect ratio is preserved rather
      // than silently changing when a different size is requested.
      if (previousW && previousH) {
        url.searchParams.set("h", String(Math.round((previousH / previousW) * width)));
      }
      url.searchParams.set("w", String(width));
      url.searchParams.set("q", String(quality ?? 75));
      url.searchParams.set("auto", "format");
      return url.toString();
    } catch {
      return src;
    }
  }

  // --- Anything else: served as-is ----------------------------------------
  // The host allowlist (lib/image-hosts.ts) is Cloudinary and Unsplash, so this
  // is only reached by a local static import, which is already the right size.
  return src;
}
