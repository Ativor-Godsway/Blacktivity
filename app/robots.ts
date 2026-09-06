import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

/**
 * Preview deploys are noindex by default, production deploys are not — so the
 * placeholder content on blacktivity.vercel.app would be indexed and outrank
 * the real domain later. Stay closed until NEXT_PUBLIC_SITE_URL is the domain.
 */
function isStagingHost(): boolean {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return site === "" || site.includes("vercel.app") || site.includes("localhost");
}

export default function robots(): MetadataRoute.Robots {
  if (isStagingHost()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
