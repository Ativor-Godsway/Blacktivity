import type { MetadataRoute } from "next";
import { getAllArticleSlugs, getAllEventSlugs } from "@/lib/queries";
import { getPublishedVolumeSlugs } from "@/lib/rotation-queries";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/articles"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/events"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/rotation/archive"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/creatives"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/submit"), changeFrequency: "monthly", priority: 0.6 },
  ];

  try {
    const [articles, events, volumes] = await Promise.all([
      getAllArticleSlugs(),
      getAllEventSlugs(),
      getPublishedVolumeSlugs(),
    ]);

    return [
      ...staticRoutes,
      ...articles.map(({ slug, publishedAt }) => ({
        url: absoluteUrl(`/articles/${slug}`),
        lastModified: publishedAt ? new Date(publishedAt) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
      ...events.map((slug) => ({
        url: absoluteUrl(`/events/${slug}`),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      /**
       * Volumes only — NOT `/rotation`. That route renders the latest volume
       * and canonicals to the volume's own URL, so listing both would put two
       * URLs for one page in the sitemap.
       */
      ...volumes.map(({ slug, publishedAt }) => ({
        url: absoluteUrl(`/rotation/${slug}`),
        lastModified: publishedAt ? new Date(publishedAt) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
