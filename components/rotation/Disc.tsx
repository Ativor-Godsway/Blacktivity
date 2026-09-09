import RevealImage from "@/components/ui/RevealImage";
import type { ImageRef } from "@/lib/types";

/**
 * THE RECORD — Revision 17 §3.3.
 *
 * The volume's cover, circular-cropped, bleeding off the left edge and turning
 * slowly while the cards scroll past it. Yes, a turning record on a page called
 * Rotation is an obvious pun. It is the right kind of obvious.
 *
 * WHAT MAKES IT READ AS A RECORD rather than as a round photograph is the
 * centre hole and the ring — without those it is just a circular crop, and the
 * joke does not land. Both are --espresso and --sand, already measured, no new
 * colours.
 *
 * MOTION: `transform: rotate()` and nothing else, on one composited layer. Same
 * cost profile as the marquee that already ships — no layout, no paint per
 * frame. Under `prefers-reduced-motion` it stops completely and rests at 0deg
 * rather than freezing mid-turn; see `.rotation-disc` in globals.css.
 *
 * It is DECORATION: aria-hidden, lazy, and hidden below lg where it would eat
 * the column the cards need. The volume number and dates are all in the
 * masthead as real text, so nothing here is the only copy of anything.
 *
 * `sticky` so it holds while its section scrolls past — that is what makes it
 * feel like a record on a deck rather than an image in a column.
 */
export function Disc({ image, size = 520 }: { image: ImageRef; size?: number }) {
  return (
    /*
      `h-full` IS WHAT MAKES `sticky` WORK, and its absence is silent.

      A sticky element travels within its PARENT. This wrapper's height was its
      content — i.e. exactly the disc's 520px — so there was no room to travel
      in and the disc simply scrolled away with the cards. Measured: 444px above
      the viewport while the chart was still on screen.

      The grid cell above already stretches to the row's full height, so taking
      it here gives the sticky child the whole section to hold across.
    */
    <div aria-hidden="true" className="pointer-events-none hidden h-full lg:block">
      <div className="sticky top-32">
        {/*
          Bled off the left edge by 40% of its own width — §3.3. The parent
          column is narrower than the disc, so the overflow is deliberate and
          the page's own overflow-x guard keeps it from creating a scrollbar.
        */}
        {/*
          THE BLEED IS A COMPUTED MARGIN, NOT `-ml-[40%]`.

          §3.3 asks for 40% of the DISC'S width. A percentage margin resolves
          against the CONTAINING BLOCK, which here is an 18rem column — so
          `-ml-[40%]` bled 115px, or 22% of a 520px disc, and the number quietly
          changed with the column rather than with the disc.

          `translateX(-40%)` would resolve against the element's own box and be
          the idiomatic fix, but `transform` on this element belongs to the spin
          animation, which replaces it outright. So the offset is derived from
          `size` directly, where it is exact and cannot drift.
        */}
        <div
          className="rotation-disc relative aspect-square rounded-full"
          style={{ width: size, marginLeft: -size * 0.4 }}
        >
          <RevealImage
            src={image.url}
            alt=""
            width={size}
            height={size}
            blurDataURL={image.blurDataURL}
            sizes={`${size}px`}
            className="size-full rounded-full"
          />

          {/* The ring — a thin --sand edge that separates the disc from the
              page ground at any crop. */}
          <span className="absolute inset-0 rounded-full border-4 border-sand" />

          {/* The label and the spindle hole. */}
          <span className="absolute top-1/2 left-1/2 size-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-sand bg-espresso" />
          <span className="absolute top-1/2 left-1/2 size-[5%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sand" />
        </div>
      </div>
    </div>
  );
}

export default Disc;
