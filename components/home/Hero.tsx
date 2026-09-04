import MonoLabel from "@/components/ui/MonoLabel";
import Wordmark from "@/components/brand/Wordmark";
import AdinkraMark from "./AdinkraMark";
import { SITE } from "@/lib/constants";

/**
 * THE HERO.
 *
 * Two elements: the wordmark, and an animated Adinkra mark right of centre.
 * The magazine cover stack it replaced carried cycling state, scroll wiring and
 * drag handling; none of that survives, so this is a server component with no
 * client JavaScript beyond the mark's own draw-on.
 *
 * WORDMARK GEOMETRY — read before changing either number.
 *
 * It is 92vw, ranged left in the gutter, and its descender is NOT clipped.
 * Earlier builds ran it at 100vw with the bottom 10% cut: the 'y' then sat
 * flush against the right edge with its tail sliced off, and the mark read as
 * "blacktivitu". The viewBox is tight to the glyph bounds, so the box touching
 * the viewport edge means the glyph touches it too.
 *
 * `npm run check:wordmark` asserts this at eight widths from 360 to 3440.
 */
export function Hero() {
  return (
    <section
      aria-label="Blacktivity"
      className="relative flex h-[100svh] flex-col overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 z-20 p-(--gutter)">
        <div className="hidden justify-end pt-8 md:flex md:pt-9">
          <MonoLabel className="text-right leading-relaxed">
            {SITE.edition}
            <br />
            <span className="text-fg-muted">ACCRA — GH</span>
          </MonoLabel>
        </div>

        <div className="absolute top-[38%] left-(--gutter) hidden max-w-[22ch] md:block">
          <p className="text-fg-muted">
            A creative studio and publication in Accra, documenting Black
            creativity.
          </p>
        </div>
      </div>

      {/* The mark, right of centre and vertically centred. */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-[58%] md:left-[60%]">
        <AdinkraMark className="w-[clamp(120px,17vw,210px)] text-ink" />
      </div>

      {/* The wordmark, ranged left, sitting on the fold. */}
      <div className="mt-auto w-full px-(--gutter) pb-[6vh]">
        <Wordmark className="w-[92vw] max-w-[1800px] text-ink" title={SITE.name} />
      </div>
    </section>
  );
}

export default Hero;
