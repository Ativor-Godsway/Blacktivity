import MonoLabel from "@/components/ui/MonoLabel";
import Wordmark from "@/components/brand/Wordmark";
import { SITE } from "@/lib/constants";

/**
 * THE HERO.
 *
 * Type alone: the wordmark, the edition line, and the statement. The magazine
 * cover stack this replaced carried cycling state, scroll wiring and drag
 * handling, and the Adinkra mark that replaced THAT has now been removed too
 * (see below), so this is a server component that ships no client JavaScript
 * at all.
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
      {/* All hero micro-type shares the wordmark's grid, so nothing is
          stranded against the viewport edge on a wide screen. */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="mx-auto h-full w-full max-w-[1600px] px-(--gutter) py-(--gutter)">
        <div className="hidden justify-end pt-8 md:flex md:pt-9">
          <MonoLabel className="text-right leading-relaxed">
            {SITE.edition}
            <br />
            <span className="text-fg-muted">ACCRA — GH</span>
          </MonoLabel>
        </div>

        <div className="absolute top-[38%] hidden max-w-[22ch] md:block">
          <p className="text-fg-muted">
            A creative studio and publication in Accra, documenting Black
            creativity.
          </p>
        </div>
        </div>
      </div>

      {/*
        An animated Adinkra mark sat here, right of centre and vertically
        centred. It has been taken out of the composition, not out of the tree:
        the component is `components/home/AdinkraMark.tsx` and its path data is
        `data/adinkra.ts`, both intact, both still compiling, and the
        reduced-motion handling and SVG config live with the component.

        There is deliberately no flag guarding this. An unused boolean is a
        thing that gets flipped by accident; a component nobody imports states
        its own status.
      */}

      {/*
        The wordmark, ranged left in the SAME editorial grid as every other
        section — max-w-[1600px] centred, gutter padding — rather than hugging
        the viewport edge.

        It used to be 92vw pinned to a fixed 32px gutter, which on a 2560px
        screen left the glyph 32px from the edge: under 2% of the viewport, and
        visually stranded against it while a thousand pixels sat empty on the
        right. `npm run check:wordmark` asserts real clearance on every edge.
      */}
      <div className="mx-auto mt-auto w-full max-w-[1600px] px-(--gutter) pb-[6vh]">
        <Wordmark className="w-full text-ink" title={SITE.name} />
      </div>
    </section>
  );
}

export default Hero;
