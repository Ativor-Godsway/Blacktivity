import Link from "next/link";
import MonoLabel from "@/components/ui/MonoLabel";
import Marquee from "@/components/ui/Marquee";
import RevealImage from "@/components/ui/RevealImage";
import Wordmark from "@/components/brand/Wordmark";
import HeroScroll from "@/components/home/HeroScroll";
import { SITE } from "@/lib/constants";
import type { ArticleDTO } from "@/lib/types";

/**
 * THE HERO — a magazine cover.
 *
 * Revision 11 removed the Adinkra mark and left the question of rebalancing
 * open. Revision 15 §1 closes it: the hero had a masthead and no cover image,
 * which is exactly why the middle was empty. The cover image goes in it.
 *
 * The composition, desktop:
 *
 *   header block          top-left, plus EDITION / ACCRA top-right
 *   statement             columns 1-4
 *   featured article      columns 1-4, directly beneath the statement
 *   cover image           columns 7-11, 4:5 portrait
 *   giant wordmark        full width, bottom
 *   mono marquee          beneath the wordmark, the cover's barcode strip
 *
 * THE NEAR-TOUCH IS THE COMPOSITION. The cover image runs down to just above
 * the wordmark's cap height and stops there. Do not add breathing room in that
 * gap — the tension between the two is the whole point of the layout, and the
 * instinct to "fix" it by opening it up is what produces a generic hero.
 *
 * The markup below is a server component and is complete and correct on its
 * own — which is what makes the no-JS, reduced-motion and mobile paths free.
 * HeroScroll wraps it and adds the Revision 15 §2 scroll gesture on top; it
 * adds no markup of its own beyond the spacer, and when the pin is not active
 * it does nothing at all.
 *
 * WORDMARK GEOMETRY — read before changing either number.
 *
 * It is full-width inside the 1600px editorial grid, ranged left in the gutter,
 * and its descender is NOT clipped. Earlier builds ran it at 100vw with the
 * bottom 10% cut: the 'y' then sat flush against the right edge with its tail
 * sliced off, and the mark read as "blacktivitu". The viewBox is tight to the
 * glyph bounds, so the box touching the viewport edge means the glyph touches
 * it too. `npm run check:wordmark` asserts this at eight widths from 360 to
 * 3440.
 *
 * ITS BOTTOM EDGE IS NOW LOAD-BEARING FOR THE DOCK. The wordmark sits directly
 * on the marquee, whose height is fixed at --hero-marquee-h, so the wordmark's
 * position in the viewport is pure arithmetic: vh - marquee - wordmarkHeight.
 * HeroScroll computes the dock transform from exactly that and never measures
 * the DOM. Putting anything else between the wordmark and the bottom of the
 * hero, or giving the wordmark bottom padding, silently breaks the landing.
 */

/**
 * The marquee the original build spec asked for and never got a home. It works
 * here as the cover's barcode strip and closes the composition with an edge.
 *
 * Four copies rather than one: Marquee doubles whatever it is given and travels
 * -50%, so the track has to be at least two viewports wide for the loop to be
 * seamless. One copy of this string is roughly 600px and would show a gap on
 * any desktop screen.
 */
const MARQUEE_LINE = `${SITE.established} — ACCRA, GH — ${SITE.edition} — DOCUMENTING BLACK CREATIVITY`;
const MARQUEE_ITEMS = [MARQUEE_LINE, MARQUEE_LINE, MARQUEE_LINE, MARQUEE_LINE];

export function Hero({ featured }: { featured: ArticleDTO | null }) {
  return (
    <HeroScroll>
    <section
      aria-label="Blacktivity"
      data-hero-sticky
      /*
        `min-h` below md, a hard `h` from md up, and the difference is not
        cosmetic.

        The hero is exactly one viewport at EVERY width, and on mobile that is
        a hard constraint rather than a preference: `check:wordmark` requires
        the wordmark's descender to clear the fold by 16px at 360, 390 and 430.
        An earlier pass here let the mobile hero grow past the fold and scroll,
        which reads fine and fails that check at all three widths — the mark
        ends up below the fold entirely. So the mobile composition is budgeted
        to fit instead, and the cover is the element that gives (see its height
        note below).

        `min-h` rather than `h` only so that a viewport short enough to break
        the budget gets a scrollbar instead of clipping the wordmark off inside
        `overflow-hidden`.

        svh throughout, never vh: vh on mobile is the LARGE viewport, so the
        hero jumps by the height of the URL bar as it hides and shows.
      */
      className="relative flex min-h-svh flex-col overflow-hidden md:h-svh"
    >
      {/* All hero micro-type shares the wordmark's grid, so nothing is
          stranded against the viewport edge on a wide screen. */}
      <div className="mx-auto w-full max-w-[1600px] px-(--gutter)">
        <div className="hidden justify-end pt-8 md:flex md:pt-9">
          <MonoLabel className="text-right leading-relaxed">
            {SITE.edition}
            <br />
            <span className="text-fg-muted">ACCRA — GH</span>
          </MonoLabel>
        </div>
      </div>

      {/*
        THE COVER ROW. `min-h-0` matters: this is a flex child that has to be
        allowed to SHRINK below its content's natural height, otherwise a
        short viewport pushes the wordmark off the bottom of the hero instead
        of squeezing the image. Without it the 4:5 cover wins the negotiation
        and the masthead is the thing that goes.
      */}
      {/*
        `pt-24` below md clears the OVERLAY HEADER. On the homepage the header
        is absolutely positioned over the hero rather than sitting above it in
        a bar, and the EDITION block that reserves space for it is `hidden
        md:flex` — so below md this row starts at y=0 and the statement ran
        straight through the wordmark and tagline. Nothing in the flex column
        reserves that space; this padding is the only thing that does.
      */}
      <div className="mx-auto w-full min-h-0 max-w-[1600px] flex-1 px-(--gutter) pt-24 pb-4 md:pt-0 md:pb-6">
        {/*
          `md:grid-rows-[minmax(0,1fr)]` is what makes the cover's `h-full`
          resolve. Without it the single row is auto-sized, so its height comes
          FROM the 4:5 image while the image's height is supposed to come from
          the row — the circular case resolves to "content wins", and a
          559px-wide cover became 699px tall and ran 232px straight through the
          wordmark. minmax(0,1fr) makes the row definite and forbids the content
          from growing it.

          md only: the mobile stack is three auto rows and must stay that way.
        */}
        <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-12 md:grid-rows-[minmax(0,1fr)] md:gap-6">
          {/*
            `contents` below md, a flex column from md up.

            On mobile the wrapper dissolves and its two children become grid
            items of the outer single column, so `order` can interleave them
            with the cover image — Revision 15 §4 stacks statement, THEN the
            image, THEN the headline. On desktop the wrapper re-forms and the
            two sit together in columns 1-4, which is the desktop
            composition. One element, both layouts, no duplicated markup.
          */}
          <div className="contents md:col-span-4 md:flex md:flex-col md:justify-center md:gap-10">
            {/*
              The statement is masked: HeroScroll translates it up behind
              this overflow-hidden box rather than fading it in place.
            */}
            <div data-hero-mask className="order-1 overflow-hidden md:order-0">
              <p data-hero-copy className="max-w-[22ch] text-fg-muted">
                A creative studio and publication in Accra, documenting Black
                creativity.
              </p>
            </div>

            {/*
              THE FEATURED ARTICLE — new content in the hero, and it costs
              nothing: the article already exists and is already queried.

              Omitted entirely when there is no featured article, along with
              the cover image. There is deliberately no placeholder — Revision
              15 §1 — so the hero falls back to the composition it had before.
            */}
            {featured ? (
              <div data-hero-mask className="order-3 overflow-hidden md:order-0">
                <div data-hero-copy>
                  <Link href={`/articles/${featured.slug}`} className="group block">
                    {/*
                      The label is FEATURED · <category>, not the "ISSUE 04"
                      of the Revision 15 sketch: articles carry a category but
                      no issue number, and inventing one would put a number on
                      the page that nothing else in the system agrees with.
                    */}
                    <MonoLabel className="text-fg-dim">
                      Featured · {featured.category}
                    </MonoLabel>
                    <p className="display card-title mt-3 max-w-[16ch] text-[1.5rem] text-fg md:mt-4 md:text-[2rem]">
                      {featured.title}
                    </p>
                    <span className="mono mt-3 flex items-center gap-2 text-fg-dim md:mt-4">
                      Read
                      <span
                        aria-hidden="true"
                        className="inline-block transition-transform duration-300 ease-[var(--ease-expo)] group-hover:translate-x-1 group-focus-visible:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          {featured ? (
            /*
              THE COVER, columns 7-11.

              HEIGHT-DRIVEN AT EVERY WIDTH. On mobile the cover is 34svh tall
              and takes its width from the 4:5 ratio, which comes to roughly
              two thirds of the column — NOT the full column width the §4
              sketch implies. Full width is 400px of a 780px phone, and the
              rest of the stack needs 470 of it; something has to give, and the
              only alternative to the cover giving is the wordmark dropping
              below the fold, which `check:wordmark` rejects outright.

              On desktop it
              has to fill the row and derive its WIDTH from that, so its bottom
              edge lands just above the wordmark at every viewport height —
              sizing it from the column width there makes it ~700px tall in
              ~440px of space, and the wordmark is what gives way.

              THE CELL IS A FLEX CONTAINER, and that is the whole mechanism.
              `width: auto` on a BLOCK element means "fill the container", so
              the box had two definite dimensions and the aspect ratio was
              ignored outright — which is why the first attempt at this changed
              nothing at all. In a flex container `width: auto` is
              shrink-to-fit, which lets the 4:5 ratio and the definite height
              actually decide the width.

              `max-w-full` keeps it inside its columns when the viewport is
              tall and narrow enough for 4:5 to want more width than it has.

              THIS IS NOW THE LCP ELEMENT — `priority`, explicit dimensions
              via the aspect box, and a blur placeholder.
            */
            <div
              data-hero-cover
              className="order-2 flex min-h-0 justify-start md:order-0 md:col-span-5 md:col-start-7 md:row-start-1 md:h-full"
            >
              <RevealImage
                src={featured.coverImage.url}
                alt={featured.coverImage.alt || featured.title}
                fill
                blurDataURL={featured.coverImage.blurDataURL}
                /*
                  MEASURED, not guessed. The cover renders 230px wide at 390
                  and 354px at 1440 — it is height-driven, so its width is a
                  good deal narrower than its column. The first pass declared
                  100vw/34vw, which had Next serving an 828px-wide file for a
                  230px box and put LCP at 3.3s on 4G. These are the real
                  fractions, rounded up: re-measure them if the 34svh or the
                  column span ever changes.
                */
                sizes="(max-width: 768px) 60vw, 26vw"
                priority
                /*
                  65 rather than the loader's q_auto. This is a single
                  photograph at ~230px on a phone, and q_auto was spending
                  78KB on it while it was the LCP element on a 1.6Mbps link.
                  The difference is not visible at this size; the ~250ms is.
                */
                quality={65}
                className="aspect-4/5 h-[34svh] w-auto md:h-full md:max-w-full"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/*
        The wordmark, ranged left in the SAME editorial grid as every other
        section — max-w-[1600px] centred, gutter padding — rather than hugging
        the viewport edge.

        It used to be 92vw pinned to a fixed 32px gutter, which on a 2560px
        screen left the glyph 32px from the edge: under 2% of the viewport,
        and visually stranded against it while a thousand pixels sat empty on
        the right. `npm run check:wordmark` asserts real clearance on every
        edge.

        NO BOTTOM PADDING. See the note on dock geometry above — the wordmark
        sits directly on the marquee and HeroScroll depends on that.
      */}
      <div className="mx-auto w-full max-w-[1600px] px-(--gutter)">
        {/*
          THE TRANSFORMED ELEMENT IS THIS INNER DIV, NOT THE PADDED ONE.

          The dock scales about `left top`, so whatever is scaled has its left
          edge held in place. Scaling the padded wrapper scales the gutter with
          it — the mark's left edge travelled from 32px to 32 * 0.13 = 4px and
          landed 28px left of the header's slot. This div starts at the content
          edge and carries no padding, so its left edge IS the mark's left edge
          and the two wordmarks share it at every width by construction.

          `block` on the mark itself: an inline SVG sits on a text baseline and
          picks up the line box's leading, which put it 5px below where the
          arithmetic said it was. Both wordmarks are block for that reason —
          see the header.
        */}
        <div data-hero-wordmark>
          <Wordmark className="block w-full text-ink" title={SITE.name} />
        </div>
      </div>

      {/*
        Fixed height, from --hero-marquee-h, because the dock arithmetic reads
        it as a constant. Marquee's own border-b is dropped: it would draw a
        hairline along the very bottom edge of the viewport, which reads as a
        rendering artefact rather than as the cover's edge.
      */}
      <div data-hero-marquee className="h-(--hero-marquee-h) shrink-0">
        <Marquee
          items={MARQUEE_ITEMS}
          className="flex h-full items-center border-b-0 py-0"
        />
      </div>
    </section>
    </HeroScroll>
  );
}

export default Hero;
