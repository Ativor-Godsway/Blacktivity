import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  serverExternalPackages: ["mongoose"],
  // The OG route reads these TTFs at runtime — trace them into the bundle.
  outputFileTracingIncludes: {
    "/api/og": ["./assets/fonts/**"],
  },
};

export default nextConfig;
