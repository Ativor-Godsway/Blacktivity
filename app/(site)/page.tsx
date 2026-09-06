import Hero from "@/components/home/Hero";
import AboutSection from "@/components/home/AboutSection";
import FeaturedArticles from "@/components/home/FeaturedArticles";
import RotationDoors from "@/components/home/RotationDoors";
import UpcomingEvents from "@/components/home/UpcomingEvents";
import SubmitCTA from "@/components/home/SubmitCTA";
import { getFeaturedArticle, getPublishedArticles, getUpcomingEvents } from "@/lib/queries";
import { getHomeRotation } from "@/lib/rotation-queries";

export const revalidate = 300;

export default async function HomePage() {
  // The featured article is the hero's cover image and headline — Revision 15
  // §1. It is fetched alongside the rest rather than inside Hero so the hero
  // stays a pure render and the page makes one round of queries, not two.
  const [articles, upcomingEvents, rotation, featured] = await Promise.all([
    getPublishedArticles({ limit: 4 }),
    getUpcomingEvents(6),
    getHomeRotation(),
    getFeaturedArticle(),
  ]);

  /*
   * The hero's featured article is dropped from "Selected writing" below it.
   *
   * getFeaturedArticle falls back to the newest published article when nothing
   * is flagged, which is also the first thing getPublishedArticles returns — so
   * the same cover was printed twice on one page, and the browser fetched the
   * same photograph at two different widths during load. On a 1.6Mbps
   * connection that is ~95KB of contention against the LCP element itself.
   *
   * Four are queried so that three cards survive the filter.
   */
  const selectedWriting = articles.filter((a) => a.id !== featured?.id).slice(0, 3);

  return (
    <>
      <Hero featured={featured} />
      <AboutSection />
      <FeaturedArticles articles={selectedWriting} />
      <RotationDoors rotation={rotation} />
      <UpcomingEvents events={upcomingEvents} />
      <SubmitCTA />
    </>
  );
}
