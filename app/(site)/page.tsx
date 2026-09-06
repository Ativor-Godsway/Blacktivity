import Hero from "@/components/home/Hero";
import AboutSection from "@/components/home/AboutSection";
import FeaturedArticles from "@/components/home/FeaturedArticles";
import RotationDoors from "@/components/home/RotationDoors";
import UpcomingEvents from "@/components/home/UpcomingEvents";
import SubmitCTA from "@/components/home/SubmitCTA";
import { getPublishedArticles, getUpcomingEvents } from "@/lib/queries";
import { getHomeRotation } from "@/lib/rotation-queries";

export const revalidate = 300;

export default async function HomePage() {
  const [articles, upcomingEvents, rotation] = await Promise.all([
    getPublishedArticles({ limit: 3 }),
    getUpcomingEvents(6),
    getHomeRotation(),
  ]);

  return (
    <>
      <Hero />
      <AboutSection />
      <FeaturedArticles articles={articles} />
      <RotationDoors rotation={rotation} />
      <UpcomingEvents events={upcomingEvents} />
      <SubmitCTA />
    </>
  );
}
