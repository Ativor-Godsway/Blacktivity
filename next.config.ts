import type { NextConfig } from "next";

/**
 * THE SITE'S OWN ADDRESS, never localhost in production — Revision 27.
 *
 * NEXT_PUBLIC_SITE_URL drives canonicals, OG URLs, the sitemap and the admin's
 * "Web address" line. It was never set on Vercel, so production printed
 * http://localhost:3000 in every canonical. When it's unset at build, fall
 * back to the production hostname Vercel provides to every build. A value set
 * in the dashboard (the real domain, later) still wins. robots.ts keeps a
 * vercel.app host noindexed either way.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

const nextConfig: NextConfig = {
  env: siteUrl ? { NEXT_PUBLIC_SITE_URL: siteUrl } : {},
  images: {
    /**
     * Cloudinary images are served from Cloudinary's CDN with the
     * transformation in the URL; everything else falls back to the built-in
     * optimizer. See lib/image-loader.ts for why.
     */
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",

    formats: ["image/avif", "image/webp"],

    /**
     * next/image THROWS for a hostname that is not listed here — in dev that is
     * a 500 on the public route, which is exactly how a pasted Pinterest URL
     * took down a published article.
     *
     * Everything the admin uploads is served from Cloudinary, so this is
     * deliberately short. Keep it in sync with ALLOWED_IMAGE_HOSTS in
     * lib/image-hosts.ts, which the editor validates pastes against.
     *
     * images.unsplash.com is only here for the seed placeholders and should be
     * removed once real content has replaced them.
     */
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],

    /*
      Next 16 requires every quality actually used to be declared.

      65 is the hero's featured cover (Revision 15 §1), which is the LCP
      element and was tuned down from q_auto to buy ~250ms on a 1.6Mbps link.
      It was missing here, and dev logged on every homepage request:

        Image ... is using quality "65" which is not configured in
        images.qualities [70, 75]

      Undeclared qualities are not silently honoured — the value is dropped —
      so the LCP image was being served at the loader's default rather than at
      the quality it was measured with.
    */
    qualities: [65, 70, 75],
  },
  /**
   * DEVELOPMENT ONLY: never let a browser reuse a stylesheet — Revision 23 §1.
   *
   * THE FAULT THIS REMOVES. `next dev` serves its CSS from a STABLE,
   * NON-HASHED URL — `/_next/static/chunks/[root-of-the-server]__….css` — with
   * `Cache-Control: no-cache, must-revalidate`. `no-cache` does not mean "do
   * not store"; it means "store it, but revalidate before reuse". So the
   * browser keeps a copy, and on the next load it asks whether that copy is
   * still good. If the answer is 304, or if the revalidation does not happen
   * at all, it renders fresh HTML against a stylesheet from an older build.
   *
   * That is exactly what was reported twice and what Revision 22 measured:
   * Revision 20's markup on Revision 18's cream palette. Production was never
   * at risk, because its chunks are content-hashed and immutable — a new build
   * means a new URL, and there is nothing to revalidate.
   *
   * `no-store` is the one directive that forbids keeping a copy at all. There
   * is nothing to go stale, so there is no stale stylesheet to serve.
   *
   * IT IS GUARDED ON NODE_ENV AND RETURNS AN EMPTY LIST IN PRODUCTION, so the
   * immutable caching that makes the deployed site fast is untouched. The
   * guard is evaluated when the config is loaded, not per request.
   */
  async headers() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        // The stylesheet itself, and every other dev chunk alongside it.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        /*
         * Everything served from `public/` too — the grain tiles and the cover
         * photographs are on stable URLs in dev exactly as the stylesheet is.
         *
         * THE DOCUMENT ITSELF IS NOT REACHABLE FROM HERE, and that is worth
         * recording rather than discovering again. Next sets
         * `Cache-Control: no-cache, must-revalidate` on its own HTML and RSC
         * responses AFTER custom headers are applied, so this rule does not win
         * for a page. The only place that can override it is the proxy, and a
         * proxy `matcher` must be a static literal — it cannot be widened in
         * development and narrowed in production, so reaching the document
         * would mean running middleware on every request of the deployed site
         * to fix a development-only problem.
         *
         * It is also not the fault. `no-cache` means "revalidate before reuse",
         * and the dev server re-renders the page every time it is asked; a
         * document cannot go stale the way the stylesheet did, because the
         * stylesheet's URL never changes and its content does.
         */
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },

  serverExternalPackages: ["mongoose"],
  // The OG route reads these TTFs at runtime — trace them into the bundle.
  outputFileTracingIncludes: {
    "/api/og": ["./assets/fonts/**"],
    "/api/og/rotation": ["./assets/fonts/**"],
  },
};

export default nextConfig;
