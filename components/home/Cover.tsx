import Wordmark from "@/components/brand/Wordmark";
import Marquee from "@/components/ui/Marquee";
import CoverStage from "@/components/home/CoverStage";
import { SITE } from "@/lib/constants";
import { coverDeck, coverIsStatic, coverIssue } from "@/data/cover";
import { coverFiles } from "@/data/cover-files";

/**
 * THE COVER — Revision 19 §4.
 *
 * The home page hero is a full-bleed magazine cover that changes issue every
 * six seconds. Each slide is one photograph, set like a Vogue cover: the
 * masthead across the top, an issue line under it, a short cover line and a
 * mono caption bottom-left, progress ticks and the marquee along the foot.
 *
 * WHAT IT DOES NOT HAVE, AND WHY THAT IS THE POINT:
 *
 *   No CTA. No "Read more". No article links. No featured article.
 *
 * Revision 18 §1 removed the featured article from the hero and it stays
 * removed — the cover images are their own content. A cover line is a title for
 * a photograph, not a headline, and there is an Articles page for articles.
 * Anything clickable here turns a cover into a landing page, which is the
 * specific thing three revisions have been walking away from.
 *
 * Revision 18 §2 — "the right side is reserved, empty" — IS WITHDRAWN. The
 * emptiness was waiting for a cover that belonged there; this is it.
 *
 * ---------------------------------------------------------------------------
 * THIS FILE IS A SERVER COMPONENT AND IS COMPLETE ON ITS OWN.
 *
 * Slide 01 carries `data-active` in the server markup, so with no JavaScript at
 * all the page renders a correct static cover — masthead, photograph, cover
 * line, caption, marquee — and scrolls normally. That is §9's no-JS
 * requirement, and it is met by the markup rather than by a fallback branch.
 *
 * CoverStage wraps this and adds the carousel, the motion and the scroll dock.
 * It renders no markup of its own beyond the spacer.
 * ---------------------------------------------------------------------------
 *
 * ART DIRECTION, NOT A CSS SWAP — §5.
 *
 * Each slide is ONE `<picture>` with a portrait `<source>` and a landscape
 * `<img>`. The browser downloads exactly one of the two. The obvious
 * alternative — render both and hide one with `display: none` — downloads both,
 * which on a phone means fetching a 3:2 desktop frame in order to not show it.
 *
 * The same media query appears in globals.css to pick the matching focal point.
 * The two must stay identical; see the note on `.cover-photo`.
 */

/**
 * The marquee — kept from Revision 15 as the cover's barcode strip, bone on
 * black now. Four copies rather than one: Marquee doubles what it is given and
 * travels -50%, so the track needs to be at least two viewports wide for the
 * loop to be seamless.
 */
/**
 * THE STRUCTURAL STYLES ARE INLINE ON PURPOSE — Revision 22 §3.
 *
 * The cover was reported broken twice. Measured, with `scripts/diagnose-hero.mjs`
 * and the stylesheet blocked, the page renders EXACTLY what was reported:
 *
 *     slide position   static, static, static      (should be absolute)
 *     slide tops       1318, 1979, 2475            (should be 0, 0, 0)
 *     ticks display    block                       (should be flex)
 *     document height  15393px                     (should be one viewport)
 *
 * Every cover line stacked down the page, several photographs visible at once,
 * the tick row a vertical list. The carousel had no structure of its own: all
 * of it came from the stylesheet, so when the stylesheet did not arrive there
 * was no carousel, only a column of slides.
 *
 * So the handful of properties WITHOUT WHICH THERE IS NO CAROUSEL are written
 * as inline styles, where nothing can purge, tree-shake, fail to generate or
 * fail to deliver them:
 *
 *     track   position, width, height, overflow
 *     slide   position, inset, opacity, z-index
 *     image   width, height, object-fit, display
 *     ticks   display, flex-direction
 *
 * Everything else — colour, type, scrims, spacing, motion — stays in the normal
 * styling system, where it belongs. Only these lines are inlined, and only
 * because they are the ones that break.
 *
 * `object-position` is DELIBERATELY NOT INLINED, and it is the one item in
 * §3's list that is left out. It has to differ between the portrait and
 * landscape sources, which needs a media query, and an inline style cannot
 * carry one. It is read from `--focal-active`, which the stylesheet sets per
 * orientation; with no stylesheet the `50% 50%` fallback applies and the
 * photograph is merely centred rather than misplaced. That is a refinement
 * failing softly, not a layout collapsing.
 */

/**
 * A 1x1 transparent GIF, 43 bytes, inline — the `src` every not-yet-loaded
 * slide carries.
 *
 * REVISION 20 §1: THIS IS THE FIX FOR THE ALT TEXT ON THE HOME PAGE.
 *
 * Revision 19 withheld the `src` attribute entirely from slides 02+ so that
 * nothing beyond slide 01 was fetched (see the note on the <picture> below —
 * `loading="lazy"` cannot do that job here). A src-less <img> is `complete`
 * with `naturalWidth === 0`, and a browser renders such an image AS ITS ALT
 * TEXT. Four invisible slides were therefore four blocks of alt text, held out
 * of sight by nothing but the carousel's `opacity: 0`.
 *
 * When the stylesheet did not arrive, that was the screen the owner got: every
 * slide in document flow, each one printing its alt, and the words "PLACEHOLDER
 * — describe the real photograph here before this ships" at the top left of the
 * home page.
 *
 * A transparent pixel keeps the optimisation — nothing real is fetched until
 * the slide is one ahead — and removes the failure mode completely. The image
 * is always decodable, so there is never any alt text to paint, whatever else
 * goes wrong with the CSS.
 */
const BLANK_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const MARQUEE_LINE = `${SITE.established} — ACCRA, GH — DOCUMENTING BLACK CREATIVITY`;
const MARQUEE_ITEMS = [MARQUEE_LINE, MARQUEE_LINE, MARQUEE_LINE, MARQUEE_LINE];

/**
 * ~1.5% of drift, in the direction of the slide's focal point.
 *
 * The Ken Burns end state translates TOWARDS what the photograph is about, so
 * the movement reveals the subject rather than sliding off it. A focal point of
 * "50% 30%" is above centre, so the frame drifts up; the sign is inverted
 * because moving the IMAGE up is what brings a high subject into view.
 *
 * Returns percentages, which `transform: translate3d()` resolves against the
 * element's own size — so the drift is proportional at every viewport and needs
 * no measurement.
 */
function kenBurns(focal: string): { "--kb-x": string; "--kb-y": string } {
  const [x = "50%", y = "50%"] = focal.split(/\s+/);
  const dx = ((parseFloat(x) || 50) - 50) / 50; // -1 .. 1
  const dy = ((parseFloat(y) || 50) - 50) / 50;
  const AMOUNT = 1.5;
  return {
    "--kb-x": `${(-dx * AMOUNT).toFixed(2)}%`,
    "--kb-y": `${(-dy * AMOUNT).toFixed(2)}%`,
  };
}

/**
 * The cover line, split into words inside static masks.
 *
 * WORDS, NOT LETTERS — §6.2 is explicit, and it is right: letters staggering on
 * every slide change, six seconds apart, forever, is too busy. Letters are for
 * the once-per-session load sequence.
 *
 * `--i` carries the word's index into the CSS, which is where the 60ms stagger
 * is applied. Doing it as a `transition-delay` in the stylesheet rather than as
 * an inline delay per word means the exit can cancel the stagger with one rule.
 */
function CoverLineWords({ text }: { text: string }) {
  const words = text.split(/\s+/);
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="word-mask">
            <span className="cover-word" style={{ "--i": i } as React.CSSProperties}>
              {word}
            </span>
          </span>
          {/*
            THE SPACE IS OUTSIDE THE MASK, and it has to be: `.word-mask` is an
            `overflow: hidden` inline-block, so a trailing space inside it is
            clipped along with everything else past the word's own width — and
            the cover line renders as "SoundSystem".
          */}
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

export function Cover() {
  const slides = coverDeck;
  const count = slides.length;

  return (
    <CoverStage count={count} isStatic={coverIsStatic}>
      <section
        data-hero-sticky
        data-cover
        /*
          THE CAROUSEL SEMANTICS — §6.5.

          `region` with `aria-roledescription="carousel"` is the pattern the
          APG describes for an auto-rotating set of slides. It is a region
          rather than a listbox or tablist because nothing here is a value being
          chosen: the ticks are buttons that move a view, not options.
        */
        data-theme="dark"
        role="region"
        aria-roledescription="carousel"
        aria-label="Blacktivity covers"
        /*
          Slide 01's tone is on the section in the SERVER markup, so the no-JS
          cover flips its masthead correctly too. CoverStage moves it from here
          on; it reads each slide's own `data-tone` rather than being handed the
          manifest, so there is one source for the value.
        */
        data-tone={slides[0]?.tone === "dark" ? "dark" : undefined}
        /*
          THE DECK IS BIG ENOUGH TO PAGE THROUGH — §5. Fewer than three slides
          and the cover is static: no ticks, no pause, no auto-advance. The
          attribute is what the stylesheet gates the ticks row on, alongside
          the `cover-live` class the controller adds, so BOTH have to be true
          before a control appears.
        */
        data-cover-carousel={coverIsStatic ? undefined : ""}
        /* The permanent diagnostic hook — `npm run diagnose:hero` looks for it,
           and so does the render test. It stays in the markup. */
        data-hero
        className="isolate bg-bg"
        /* Inline on purpose — Revision 22. See the note at the top of this
           file. `overflow: hidden` with a fixed height is also what stops the
           page growing into a stack of slides if one ever escapes. */
        style={{
          position: "relative",
          width: "100%",
          height: "100svh",
          overflow: "hidden",
        }}
      >
        {/*
          --- THE PHOTOGRAPH LAYER -------------------------------------------

          A separate layer from the type so the pointer parallax can move the
          two in opposite directions (§6.3) with one transform write each. It is
          also what the scroll dock scales and fades.
        */}
        <div
          data-cover-photos
          className="absolute inset-0"
          /*
            Inline on purpose — Revision 22.

            `isolation: isolate` IS LOAD-BEARING, and it is the second half of
            giving slides a z-index at all. A slide is `z-index: 1` when active,
            and this wrapper had no stacking context of its own — so that 1 was
            measured against the TYPE LAYER's `auto`, inside the section's
            context, and the photograph painted over the masthead, the cover
            line, the ticks and the marquee. Every one of them was present and
            correctly positioned; none of them was visible.

            Isolating here keeps the slides' z-indices a private matter between
            the slides, and the three layers stack in document order:
            photographs, scrims, type.
          */
          style={{ isolation: "isolate", zIndex: 0 }}
        >
          {slides.map((slide, i) => {
            const files = coverFiles[slide.id];
            const active = i === 0;
            return (
              <div
                key={slide.id}
                data-cover-slide
                data-slide
                data-index={i}
                data-active={active ? "" : undefined}
                data-tone={slide.tone}
                /*
                  Inline on purpose — Revision 22.

                  ACTIVE STATE CONTROLS OPACITY AND Z-INDEX, NOTHING ELSE. Every
                  slide is positioned identically whether or not it is showing;
                  if anything structural ever depends on `active`, that is the
                  bug coming back.
                */
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: active ? 1 : 0,
                  zIndex: active ? 1 : 0,
                  transition: "opacity 1100ms linear",
                }}
                /*
                  INACTIVE SLIDES ARE `inert` — §6.5. Not merely
                  `aria-hidden`: inert also takes them out of the tab order and
                  out of find-in-page, which matters because every slide's
                  photograph is in the DOM the whole time.
                */
                inert={!active}
                role="group"
                aria-roledescription="slide"
                /*
                  aria-label on a `group` LABELS it; it does not replace its
                  contents the way it would on a button. So the position is
                  announced and the photograph's alt text still reaches the
                  reader underneath it.
                */
                aria-label={`${i + 1} of ${count}`}
              >
                <div
                  className="cover-kenburns absolute inset-0"
                  style={kenBurns(slide.focalLandscape) as React.CSSProperties}
                >
                  {/*
                    ONLY SLIDE 01 CARRIES A REAL `src`. 02+ carry a transparent
                    pixel plus `data-src`, and are given the real one a single
                    slide ahead by CoverStage — §8. See BLANK_PIXEL above for
                    why the pixel is there and not simply no `src` at all.

                    `loading="lazy"` WAS TRIED FIRST AND DOES NOT WORK HERE, and
                    the reason is worth writing down because it looks like it
                    should. Lazy loading defers images that are OUTSIDE the
                    viewport, and every slide is `position: absolute; inset: 0`
                    — all five are inside the viewport, stacked, with four of
                    them at opacity 0. Opacity is not visibility as far as the
                    lazy heuristic is concerned. Measured: all five
                    full-viewport photographs were fetched on load, which is
                    precisely what §8 forbids.

                    Withholding the attribute is the only deterministic answer.
                    It also produces exactly §9's no-JS behaviour for free:
                    without scripting, slide 01 is a static cover and the other
                    four never load at all.
                  */}
                  <picture>
                    <source
                      media="(orientation: portrait) and (max-width: 1023px)"
                      {...(active
                        ? { srcSet: files.portrait.src }
                        : { srcSet: BLANK_PIXEL, "data-srcset": files.portrait.src })}
                      width={files.portrait.w}
                      height={files.portrait.h}
                    />
                    <img
                      {...(active
                        ? { src: files.landscape.src }
                        : { src: BLANK_PIXEL, "data-src": files.landscape.src })}
                      alt={slide.alt}
                      width={files.landscape.w}
                      height={files.landscape.h}
                      /*
                        SLIDE 01 IS THE LCP ELEMENT AND NOTHING ELSE ON THE PAGE
                        IS PRIORITISED — §8.
                      */
                      fetchPriority={active ? "high" : "low"}
                      decoding={active ? "sync" : "async"}
                      draggable={false}
                      className="cover-photo"
                      /* Inline on purpose — Revision 22, except
                         `object-position`: see the note at the top of the file
                         for why that one is read from a variable instead. */
                      style={
                        {
                          "--focal-l": slide.focalLandscape,
                          "--focal-p": slide.focalPortrait,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "var(--focal-active, 50% 50%)",
                          display: "block",
                        } as React.CSSProperties
                      }
                    />
                  </picture>
                </div>
              </div>
            );
          })}
        </div>

        {/*
          --- THE SCRIMS ------------------------------------------------------
          Shared, not per-slide: they never change between slides, and two
          elements beat two per slide. Gradients only, and only where type sits.
        */}
        <div className="cover-scrim cover-scrim-top" aria-hidden="true" />
        <div className="cover-scrim cover-scrim-bottom" aria-hidden="true" />

        {/* --- THE TYPE LAYER ------------------------------------------------ */}
        <div
          data-cover-type
          className="absolute inset-0 flex flex-col"
          /* Inline on purpose — Revision 22. Above the photographs and the
             scrims, explicitly, rather than by document order alone. */
          style={{ zIndex: 2 }}
        >
          {/*
            The head block: masthead and issue line. `data-cover-head` is what
            the per-slide `tone` flag inverts — and only this. See globals.css.
          */}
          <div
            data-cover-head
            className="mx-auto w-full max-w-[1600px] px-(--gutter)"
            style={{ paddingTop: "var(--cover-masthead-top)" }}
          >
            <div data-cover-masthead data-masthead>
              {/*
                THE MASTHEAD IS PRESENTATIONAL — no `title`, so no accessible
                name. The header's own wordmark carries the name of the home
                link and is held at opacity 0 over the cover; announcing
                "Blacktivity" twice, once as a link and once as an image, is the
                failure this avoids.

                Full width inside the editorial grid, so its left edge is the
                same x as the header's wordmark at every width — which is what
                lets the dock be a pure scale about `left top` with no X
                correction at all.
              */}
              <span className="cover-print-line" style={{ "--i": 0 } as React.CSSProperties}>
                <Wordmark className="block w-full" />
              </span>
            </div>

            {/*
              The issue line. Left: issue number and date. Right: the place and
              the slide number, which rolls like an odometer on a slide change
              (§6.2). The number is the ONLY thing in this block that moves
              between slides — the masthead is the constant.
            */}
            {/*
              STACKED BELOW md, RANGED LEFT AND RIGHT FROM md UP.

              At 390 the two halves come to ~302px of mono at 0.15em tracking
              inside 350px of content width, and the right half wrapped — so
              "N° 01" sat on its own line under "ACCRA — GH" and the issue line
              read as a paragraph. Two rows is the honest answer at that width;
              shrinking the type below 11px is not.
            */}
            <p className="mono mt-4 flex flex-col gap-1 text-fg md:flex-row md:items-baseline md:justify-between md:gap-4">
              <span className="cover-print-line" style={{ "--i": 1 } as React.CSSProperties}>
                <span className="block">
                  {coverIssue.issue} · {coverIssue.date}
                </span>
              </span>
              <span
                className="cover-print-line md:text-right"
                style={{ "--i": 2 } as React.CSSProperties}
              >
                <span className="block">
                  {coverIssue.place} · N°
                  <span className="odometer" data-cover-odometer aria-hidden="true">
                    <span className="odometer-strip" style={{ "--n": 0 } as React.CSSProperties}>
                      {slides.map((s) => (
                        <span key={s.id}>{s.id}</span>
                      ))}
                    </span>
                  </span>
                </span>
              </span>
            </p>
          </div>

          {/*
            --- THE COVER LINES -----------------------------------------------

            One per slide, absolutely positioned bottom-left within this row, a
            gutter above the cover's foot. They are a sibling of the photo layer
            rather than children of the slides so that the scroll dock can rise
            and fade them as one block without fighting the per-word
            transitions.
          */}
          <div data-cover-lines className="min-h-0 flex-1">
            {/* `relative` HERE, not on the block above: the cover lines are
                absolutely positioned and this is the box whose left edge and
                gutter they have to respect. */}
            <div className="relative mx-auto h-full w-full max-w-[1600px] px-(--gutter)">
              {slides.map((slide, i) => (
                <div
                  key={slide.id}
                  data-cover-line
                  data-index={i}
                  data-active={i === 0 ? "" : undefined}
                  inert={i !== 0}
                  className="md:w-5/12"
                  /*
                    Inline on purpose — Revision 22. Every cover line stacking
                    down the page was the most visible half of the reported
                    fault, and it happened for the same reason the slides did:
                    the positioning lived only in the stylesheet.

                    `display: none` on the inactive ones is the NO-SCRIPT gate,
                    and it is inline rather than in CSS so that it cannot fail
                    open. CoverStage sets them to `block` on mount; without
                    scripting only slide 01's line is in the document, which is
                    the static cover §9 asks for.
                  */
                  style={{
                    position: "absolute",
                    insetInline: "var(--gutter, 20px)",
                    bottom: "var(--gutter, 20px)",
                    display: i === 0 ? "block" : "none",
                    opacity: i === 0 ? 1 : 0,
                    zIndex: i === 0 ? 1 : 0,
                  }}
                >
                  {/*
                    COLUMNS 1-5 on desktop (`md:w-5/12`), full width on a phone.
                    clamp() at two scales — §4 and §7 — because a cover line
                    that fits at 1440 is four lines deep at 390.
                  */}
                  <h1 className="display text-[clamp(2.25rem,11vw,3.5rem)] md:text-[clamp(3rem,7vw,7.5rem)]">
                    <CoverLineWords text={slide.coverLine} />
                  </h1>
                  <p className="mono mt-4 text-fg">
                    <span className="word-mask">
                      <span
                        className="cover-caption-line"
                        /* One step behind the last word of the cover line. */
                        style={{ "--i": slide.coverLine.split(/\s+/).length } as React.CSSProperties}
                      >
                        {slide.caption}
                      </span>
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/*
            --- THE FOOT --------------------------------------------------------
            Ticks and marquee. Its height is --cover-foot-h, which the cover
            lines are positioned against, so this is a constant rather than
            whatever the content happens to come to.
          */}
          <div data-cover-foot className="shrink-0">
            {/*
              THE TICKS ROW, and the pause button that WCAG 2.2.2 requires:
              content that moves automatically for more than five seconds must
              be pausable. Six-second slides are over that line.

              Rendered even when the cover is static so the row's height — and
              therefore --cover-foot-h — does not change with the slide count.
              CoverStage hides it when there is nothing to page through, and the
              no-JS path hides it in CSS, because ticks that cannot do anything
              are worse than none.
            */}
            <div
              data-cover-ticks
              data-ticks
              className="mx-auto w-full max-w-[1600px] px-(--gutter) py-2.5"
              /*
                Inline on purpose — Revision 22. A tick row that loses its
                stylesheet becomes a vertical list, which is symptom 3 of the
                report.

                `display: none` here is the NO-SCRIPT gate, for the same reason
                as the cover lines: controls that cannot do anything are worse
                than absent ones, and that has to hold whether or not the
                stylesheet arrives. CoverStage switches it to `flex` on mount —
                and only when there is more than one slide to page through.
              */
              /*
                `stretch`, not `center`. Centring gives every child the same
                centre line but a DIFFERENT top, because a tick is a numeral
                above a rail and PAUSE is a single line — measured, the pause
                button sat 3px below the ticks. Stretching makes them one row in
                the literal sense the test asserts, and each child arranges
                itself inside its own full-height box.
              */
              style={{
                display: "none",
                flexDirection: "row",
                alignItems: "stretch",
                gap: "12px",
              }}
            >
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  data-cover-tick
                  data-index={i}
                  data-active={i === 0 ? "" : undefined}
                  /*
                    THE VISIBLE TEXT IS IN THE NAME — WCAG 2.5.3, Label in Name.
                    The button shows "01"; its name was "Go to cover 1 of 3",
                    which contains no "01" at all, so a speech-input user saying
                    what they can see would not match it. Lighthouse flags this
                    as label-content-name-mismatch and it is scored at weight 0,
                    which means it is easy to ship and still a real failure.

                    The same mistake is recorded in the header, where an
                    aria-label of "Blacktivity — home" overrode a visible
                    tagline for the same reason.
                  */
                  aria-label={`Cover ${slide.id}, ${i + 1} of ${count}`}
                  aria-current={i === 0 ? "true" : undefined}
                  /* Narrower below md: five ticks plus PAUSE at w-12 came to
                     just over the content width at 360 and the row wrapped. */
                  className="pointer-events-auto group flex w-9 flex-col gap-1.5 md:w-16"
                >
                  <span className="mono text-left text-fg-dim transition-colors duration-300 group-hover:text-fg">
                    {slide.id}
                  </span>
                  <span className="tick-rail">
                    <span className="tick-fill" />
                  </span>
                </button>
              ))}

              <button
                type="button"
                data-cover-pause
                /* `items-end` so the label sits on the ticks' rail line now
                   that the row stretches its children. */
                className="mono pointer-events-auto ml-auto flex items-end text-fg-dim transition-colors duration-300 hover:text-fg md:ml-4"
              >
                PAUSE
              </button>
            </div>

            {/*
              Fixed height, from --hero-marquee-h, because the dock arithmetic
              and --cover-foot-h both read it as a constant. Marquee's own
              border-b is dropped: a hairline along the very bottom edge of the
              viewport reads as a rendering artefact rather than as the cover's
              edge.
            */}
            <div className="h-(--hero-marquee-h)">
              <Marquee
                items={MARQUEE_ITEMS}
                className="flex h-full items-center border-b-0 py-0"
              />
            </div>
          </div>
        </div>

        {/*
          The announcement channel for slide changes — §6.5.

          Politeness is `off` while the cover is auto-playing, because a change
          the reader did not ask for every six seconds is an interruption, not
          information. CoverStage raises it to `polite` once the reader drives
          the cover themselves, and then the change IS the answer to what they
          just did.
        */}
        <p
          data-cover-live
          aria-live="off"
          aria-atomic="true"
          className="sr-only"
        >
          {`Cover 1 of ${count}: ${slides[0]?.coverLine ?? ""}`}
        </p>
      </section>
    </CoverStage>
  );
}

export default Cover;
