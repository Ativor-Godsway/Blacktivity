import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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

    // Next 16 requires every quality actually used to be declared.
    qualities: [70, 75],
  },
  serverExternalPackages: ["mongoose"],
  // The OG route reads these TTFs at runtime — trace them into the bundle.
  outputFileTracingIncludes: {
    "/api/og": ["./assets/fonts/**"],
  },
};

export default nextConfig;
