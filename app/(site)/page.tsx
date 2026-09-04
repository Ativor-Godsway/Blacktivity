import Hero from "@/components/home/Hero";
import AboutSection from "@/components/home/AboutSection";
import FeaturedArticles from "@/components/home/FeaturedArticles";
import UpcomingEvents from "@/components/home/UpcomingEvents";
import SubmitCTA from "@/components/home/SubmitCTA";
import { getPublishedArticles, getUpcomingEvents } from "@/lib/queries";

export const revalidate = 300;

export default async function HomePage() {
  const [articles, upcomingEvents] = await Promise.all([
    getPublishedArticles({ limit: 3 }),
    getUpcomingEvents(6),
  ]);

  return (
    <>
      <Hero />
      <AboutSection />
      <FeaturedArticles articles={articles} />
      <UpcomingEvents events={upcomingEvents} />
      <SubmitCTA />
    </>
  );
}
