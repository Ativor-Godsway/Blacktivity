import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import ScrollReveal from "@/components/motion/ScrollReveal";
import { rotationVisual } from "@/data/rotation-visual";
import {
  volumeDateRange,
  volumeLabel,
  type RotationPosterData,
} from "@/lib/rotation";
import { formatDateMono, cn } from "@/lib/utils";

/**
 * THE ROTATION POSTER — Revision 16.
 *
 * One image, one word, one line and one button. This REPLACES the three-column
 * block of Revision 14 §2 and the three fixes to it in Revision 15 §5, both of
 * which are withdrawn. Two attempts at summarising the charts on the homepage
 * did not work; this stops trying and sends the reader to them instead.
 *
 * The composition is a poster: the word sits behind the figure, the figure is
 * bottom-anchored so the section's own edge crops it, and the meta, the
 * category line and the button occupy the corners the figure leaves free.
 *
 * WHAT MAKES IT LOOK DESIGNED IS THE OVERLAP, and the overlap is nothing but
 * z-index on two positioned boxes. No mix-blend-mode — Revision 06 §5 forbids
 * it, because a blended full-width layer cannot be GPU-cached and re-composites
 * on every scroll frame. Nothing here needs one.
 *
 * Deep links survive from Revision 14 §3: the three category names still point
 * at #new-music, #chart and #curation, and still arrive through Lenis with
 * `immediate: true`. They are one restrained mono row now instead of three
 * columns, but the behaviour behind them is unchanged.
 */

/**
 * The figure.
 *
 * A <picture>, not next/image, and the reason is in next.config.ts:
 * `loader: "custom"` disables the /_next/image route outright, so next/image
 * would hand this straight back to the browser as the 780KB source PNG with no
 * format negotiation at all. The AVIF and WebP siblings are encoded ahead of
 * time by `npm run build:rotation-figure` and listed here in preference order,
 * with the PNG as the last resort — which is the same negotiation the pipeline
 * would have done, moved to author time where this static asset belongs.
 *
 * `loading="lazy"` and NO `priority`: this is below the fold and the hero's
 * cover image has to keep the LCP. Explicit width and height hold CLS at zero
 * even though the rendered size is driven by the section's height.
 */
function Figure() {
  const { src, alt, width, height } = rotationVisual;
  const avif = src.replace(/\.png$/, ".avif");
  const webp = src.replace(/\.png$/, ".webp");

  return (
    <picture>
      <source srcSet={avif} type="image/avif" />
      <source srcSet={webp} type="image/webp" />
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        /*
          Anchored to the TOP of its wrapper and taller than it, so the edge
          that clips is the BOTTOM one — the figure runs through the section's
          lower boundary instead of resting neatly above it. Cropping from the
          top instead would cut the head off, which is a different picture.
        */
        /*
          `object-contain` is a no-op here — `h-[112%] w-auto` already gives the
          box the image's own aspect ratio — but it is declared rather than left
          to the initial value, which is `fill`. audit:perf flags object-fit:fill
          on any img, and it is right to: an explicit height with an auto width
          is exactly the shape where a later edit turns a no-op into a stretch.
        */
        /*
          THE 150% ON MOBILE IS MEASURED, not picked.

          The cut-out's opaque bounds are x 137-667 of 820 and y 99-1023 of
          1024 — so the SUBJECT is 65% of the image's width, with 9.7% of
          transparent air above her head. Sizing the image to the viewport
          therefore leaves the figure at two thirds of the frame with brown
          down both sides, which is what §2.2 is complaining about.

          To put a 531/820 subject across a 390px viewport the image has to be
          390 x 820/531 = 602 wide, i.e. ~150% of a 58vh box. The sides
          overflow and are clipped, which is exactly what References C and D
          do. Desktop keeps 112%, where the figure is a column beside the word
          rather than the frame itself.
        */
        className="absolute inset-x-0 top-0 mx-auto h-[150%] w-auto max-w-none object-contain md:h-[112%]"
      />
    </picture>
  );
}

const SECTIONS = [
  { href: "/rotation#new-music", label: "New Music" },
  { href: "/rotation#chart", label: "The Chart" },
  { href: "/rotation#curation", label: "Creators Curation" },
] as const;

export function RotationPoster({ rotation }: { rotation: RotationPosterData | null }) {
  // No published volume: the whole section is absent, never an empty state.
  if (!rotation) return null;

  const range = volumeDateRange(rotation.publishedAt, formatDateMono);
  const right = rotationVisual.align === "right";

  return (
    <section
      /* Tells the header to invert over this section — Revision 17 §1. The
         header is fixed under the hero pin and its --ink type is 1.06:1 here. */
      data-surface="dark"
      className="on-gradient relative mt-(--spacing-section-lg) overflow-hidden"
      aria-labelledby="rotation-poster-heading"
    >
      {/*
        Content-driven below md, a viewport fraction from md up — Revision 16
        §2 and §5. `overflow-hidden` on the section is what crops the figure:
        a cut-out that fits entirely inside its own box loses the whole point,
        so the section's bottom edge has to be the thing that cuts it off.
      */}
      <div
        className={cn(
          "mx-auto flex max-w-[1600px] flex-col px-(--gutter) pt-16 md:h-[80vh] md:min-h-[600px] md:pt-14",
          // No bottom padding: the figure is anchored to this edge.
          "pb-14 md:pb-0",
        )}
      >
        {/* --- meta, top right ------------------------------------------- */}
        <Reveal className="md:self-end">
          <p className="mono text-fg-dim md:text-right">
            {volumeLabel(rotation.number)}
            {range ? (
              <>
                <br />
                {range}
              </>
            ) : null}
            <br />
            {rotation.trackCount} {rotation.trackCount === 1 ? "track" : "tracks"}
          </p>
        </Reveal>

        {/*
          --- the word and the figure ---------------------------------------

          One positioned container holding both. On desktop the figure is
          absolutely placed over the word and the two overlap; below md the
          stack is linear — word ABOVE figure, never behind it, because at
          phone widths an overlap leaves neither of them legible (§5).
        */}
        <div className="mt-10 flex min-h-0 flex-1 flex-col md:mt-0 md:block">
          {/*
            The word. Vertically parked just above the section's lower third on
            desktop, which is where the figure's shoulder crosses it.

            `break-words` guards the one real failure mode: at 360px a 4rem
            word plus its stroke is close to the viewport width, and an
            overflowing sticker would push the page sideways.
          */}
          <div
            className={cn(
              /*
                z-20 below md so the word sits IN FRONT of the figure's top
                edge; z-10 from md up so the figure crosses in front of the
                word, which is the desktop composition. Same two elements, the
                ordering simply swaps at the breakpoint.
              */
              /*
                z-30 below md so the word is IN FRONT of the figure's top edge;
                z-10 from md up so the figure crosses in front of the word,
                which is the desktop composition. Same two elements, the
                ordering simply swaps at the breakpoint.

                It was z-20 on both, which ties with the figure's own z-20 and
                hands the decision to DOM order — so the figure painted over
                the word and buried the last three letters.
              */
              "relative z-30 md:z-10 md:absolute md:inset-x-(--gutter) md:bottom-[26%]",
              right ? "md:text-left" : "md:text-right",
            )}
          >
            {/*
              `.rotation-word` — Anton, solid, --sand. Revision 17 §2.1 removed
              the outline: at this size it read as a drop shadow rather than a
              die-cut, and it was the thing making the word look wrong. The fill
              moved from --tan to --sand for the near-white contrast Reference D
              carries against a saturated ground (10.64 on --cocoa, the
              gradient's lightest point).
            */}
            <ScrollReveal
              as="h2"
              text="Rotation"
              className="rotation-word block break-words text-sand"
            />
            <span id="rotation-poster-heading" className="sr-only">
              In Rotation — {volumeLabel(rotation.number)}
            </span>
          </div>

          {/*
            The figure, bottom-anchored and right of centre.

            z-20 puts it in front of the word — that single ordering is the
            whole overlap. On mobile it returns to normal flow beneath the
            word and is centred.

            The fixed heights are what let the section's bottom edge crop it:
            the image is taller than the room it is given, so the tail of the
            figure runs past the boundary and is clipped by the section's
            `overflow-hidden`.
          */}
          <Reveal
            /* 12px, not the site default 24 — Revision 16 §6. And a fade plus
               that translate is ALL: no parallax, no scroll-linked transform,
               no float loop. The homepage's one signature gesture is the hero
               (Revision 15 §2) and this section does not compete with it. */
            y={12}
            className={cn(
              /*
                `overflow-hidden` here rather than relying on the section's,
                because the two crops are not the same crop.

                On DESKTOP this wrapper's bottom edge IS the section's bottom
                edge, so clipping here and clipping there are identical — the
                figure runs off the lower boundary of the poster.

                On MOBILE they are not. §5 stacks the figure ABOVE the category
                line and the button, so the section's bottom edge is a long way
                below it and could never crop it. Clipping against this wrapper
                keeps the intent — the cut-out does not fit its box, which is
                the whole point of a cut-out — while leaving the specified
                stack order intact.
              */
              /*
                MOBILE: FULL VIEWPORT WIDTH, and it has to escape the gutter to
                get there. `w-screen` with a half-viewport translate is the
                standard full-bleed break-out; the section is `overflow-hidden`
                so nothing scrolls sideways.

                References C and D both fill the frame edge to edge — that is
                the whole reason a cut-out was worth having. It was `h-[40vh]`
                centred with brown all around it, which wasted it.

                `-mt-[8vh]` is what puts the figure's top behind the word: the
                word is z-10 and this is z-20 in DOM order, but the negative
                margin pulls roughly the top 15% of the figure up under the
                word's baseline. Over the cap, never over the face — the crown
                of the hat crosses the type and her features stay clear.
              */
              /*
                MOBILE: FULL VIEWPORT WIDTH, via negative gutter margins.

                References C and D both fill the frame edge to edge — that is
                the whole reason a cut-out was worth having, and it was `h-[40vh]`
                centred with brown all around it.

                `-mx-(--gutter)` rather than the `w-screen` + half-viewport
                translate trick: below md the container IS the viewport, so
                cancelling its padding is already full bleed, and it needs no
                horizontal offset to undo. The translate version fought
                `md:left-[42%]` for the same properties at the same specificity
                and won unpredictably — on desktop it dragged the figure across
                the middle of the word and over the copy.

                `-mt-[8vh]` is what puts the figure's top behind the word: the
                negative margin pulls roughly its top 15% up under the word's
                baseline. Over the cap, never over the face — the crown of the
                hat crosses the type and her features stay clear.
              */
              /*
                -20vh, and the number comes out of the same measurement. The
                transparent air above her head is 9.7% of the image, which at
                150% of a 58vh box is ~71px — so the image box has to start
                that much higher again before any of HER crosses the word.
                §2.2 asks for the top ~15% of the figure to pass behind it.
              */
              "relative z-20 -mx-(--gutter) -mt-[20vh] h-[58vh] overflow-hidden",
              "md:mx-0 md:mt-0 md:h-[86%] md:w-[46%]",
              /*
                Anchored to the bottom of the section on desktop; the image
                inside is taller than this box, so the boundary does the crop.

                POSITIONED FROM THE WORD'S SIDE, NOT THE SECTION'S EDGE, and
                that is deliberate. The overlap is the whole composition — §2
                calls it the single move that makes the section look designed —
                and the word is a FIXED width once clamp() hits its 11rem cap,
                while the container keeps growing to 1600. Anchoring the figure
                to the right edge therefore pulled it away from a word that was
                not following, and at 1440 the two missed each other by 25px:
                a cut-out standing politely beside some large type.

                Anchored from the same side the word starts on, the figure
                stays over the word's tail at every width.
              */
              "md:absolute md:bottom-0 md:top-auto",
              right ? "md:left-[42%]" : "md:right-[42%]",
            )}
          >
            <Figure />
          </Reveal>
        </div>

        {/*
          --- category line and button, bottom left ------------------------

          z-30, above the figure: on a narrow desktop window the figure's lower
          edge reaches across, and the reader's way into the section must never
          be the thing that ends up underneath.
        */}
        <div className="relative z-30 mt-10 md:mt-0 md:pb-14">
          <Reveal>
            {/*
              Wraps to two or three rows rather than shrinking — `.mono` sets
              11px and §5 puts that at the floor.
            */}
            <p className="mono flex flex-wrap items-center gap-x-3 gap-y-2 text-fg-dim">
              {SECTIONS.map((section, i) => (
                <span key={section.href} className="flex items-center gap-x-3">
                  <Link
                    href={section.href}
                    className="transition-colors duration-300 ease-[var(--ease-expo)] hover:text-fg focus-visible:text-fg"
                  >
                    {section.label}
                  </Link>
                  {i < SECTIONS.length - 1 ? (
                    <span aria-hidden="true" className="text-fg-dim">
                      ·
                    </span>
                  ) : null}
                </span>
              ))}
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            {/*
              The section's primary action, and the only one that goes to the
              page itself rather than to a section of it.

              Bordered block, --sand type on a transparent ground, filling to
              --sand with --espresso type on hover. Both reached through the
              semantic tokens, so nothing here names a colour.
            */}
            <Link
              href="/rotation"
              data-track="rotation:homepage:enter"
              /*
                FILLED — Revision 17 §2.3. The outlined block was too quiet to
                read as the section's action; the inversion is the whole fix.

                --sand ground with --espresso text (13.61), hovering to --tan
                with the text held at --espresso (8.57 — passes). Square
                corners: Reference C's button is a pill, and this is the one
                place the reference is deliberately not followed, because the
                site is built on hairlines and hard edges and the fill alone
                already carries the prominence.

                Full width below md, inline from md up.
              */
              className={cn(
                "mono group mt-10 flex w-full items-center justify-center gap-3 px-10 py-5",
                "bg-sand text-espresso tracking-[0.2em]",
                "md:inline-flex md:w-auto",
                "transition-colors duration-300 ease-[var(--ease-expo)]",
                "hover:bg-tan focus-visible:bg-tan",
              )}
            >
              Enter rotation
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-300 ease-[var(--ease-expo)] group-hover:translate-x-1 group-focus-visible:translate-x-1"
              >
                →
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default RotationPoster;
