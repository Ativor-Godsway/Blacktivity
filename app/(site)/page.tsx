import Cover from "@/components/home/Cover";
import AboutSection from "@/components/home/AboutSection";
import FeaturedArticles from "@/components/home/FeaturedArticles";
import RotationPoster from "@/components/home/RotationPoster";
import UpcomingEvents from "@/components/home/UpcomingEvents";
import SubmitCTA from "@/components/home/SubmitCTA";
import { getPublishedArticles, getUpcomingEvents } from "@/lib/queries";
import { getRotationPoster } from "@/lib/rotation-queries";

export const revalidate = 300;

export default async function HomePage() {
  /*
   * THE FEATURED-ARTICLE QUERY IS GONE — Revision 18 §1.
   *
   * It existed to supply the hero's cover image and headline. The hero no
   * longer renders either, so the fetch had no consumer, and a query whose
   * result is discarded is precisely the thing that survives three revisions
   * and then gets re-wired to something by accident.
   *
   * THE DEDUPE FILTER WENT WITH IT, and that is the part worth stating. It read
   * `articles.filter(a => a.id !== featured?.id)` and existed for ONE reason:
   * the hero printed the featured cover, getFeaturedArticle falls back to the
   * newest published article, and so the same photograph was fetched twice at
   * two different widths during load. With the hero image gone that contention
   * cannot happen — and keeping the filter would now do the opposite of what it
   * was for, quietly HIDING the featured article from the homepage entirely.
   *
   * So three are queried instead of four, and "Selected writing" is simply the
   * three newest published articles. The `featured` flag, its admin control and
   * its behaviour everywhere else on the site are untouched.
   */
  const [articles, upcomingEvents, rotation] = await Promise.all([
    getPublishedArticles({ limit: 3 }),
    getUpcomingEvents(6),
    getRotationPoster(),
  ]);

  return (
    <>
      {/*
        THE ORDER IS THE ALTERNATION — Revision 20 §2.3.

          Cover              dark   (photograph)
          What we are        light
          Selected writing   dark
          Upcoming events    light
          Rotation           dark   (photograph)
          Submit             light
          Footer             dark

        UPCOMING EVENTS MOVED UP, and it is the only thing that moved. §2.3
        fixes four of the seven — cover, What we are, Selected writing,
        Rotation, footer — and with Events left where it was, Selected writing
        and Rotation sat next to each other: two dark sections, and the second
        of them a photograph, so the join read as one very long black stretch
        with a picture in the middle of it. Events is the smallest section that
        can go between them, and moving it makes the whole page alternate
        without a filler band.

        The Events row is a horizontally scrolling strip of posters, so it also
        happens to be the right thing to meet a full-bleed photograph: the eye
        crosses a light band before it hits the next image.
      */}
      <Cover />
      <AboutSection />
      <FeaturedArticles articles={articles} />
      <UpcomingEvents events={upcomingEvents} />
      <RotationPoster rotation={rotation} />
      <SubmitCTA />
    </>
  );
}
