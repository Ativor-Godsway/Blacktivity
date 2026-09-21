import Link from "next/link";
import { volumeDateRange, volumeLabel, volumeTitleLabel, type VolumeDTO } from "@/lib/rotation";
import { formatDateMono } from "@/lib/utils";

/**
 * THE TITLE BLOCK — Revision 17 §2.
 *
 * REVISION 14 §4'S MASTHEAD IS REPLACED OUTRIGHT: the tan strip, the display
 * headline block and the cover/curator image panel are all gone, and so is the
 * vertical --rule that separated its two columns. Reference C's move is a
 * two-line title whose second line drops to a lighter tint, over a full-width
 * rule, with a small meta row above it. The structure is the reference's; the
 * type is this site's.
 *
 * NO IMAGE HERE, AND NOT BECAUSE THERE WASN'T ROOM. With the panel gone the
 * LCP element is the title TEXT, which is faster than anything the panel could
 * have been — no decode, no network, no reserved box. Do not reintroduce an
 * image to fill the right-hand side: the space is the composition. §2 says so
 * in as many words, and it is the kind of emptiness that gets "fixed".
 *
 * `ChartVolume.coverImage` is still read — by the OG card and the archive
 * index. It just is not rendered on this page.
 *
 * THE SECOND LINE IS --muted ON --sand: 5.16, AA, already measured, no new
 * token. It is display-scale type, so it clears comfortably, and it is the
 * reference's tonal step without inventing a colour for it.
 */
export function RotationMasthead({ volume }: { volume: VolumeDTO }) {
  const range = volumeDateRange(volume.publishedAt, formatDateMono);
  const label = volumeLabel(volume.number);

  return (
    /* Dark masthead — Revision 20 §2.3. The theme is on the outer band so it
       paints edge to edge; the 1600px grid is centred inside it. */
    <header data-theme="dark" className="px-(--gutter) pt-16 pb-10 md:pt-24">
      <div className="mx-auto max-w-[1600px]">
      {/*
        THE META ROW. It WRAPS to two rows before the archive link shrinks
        (§8) — hence flex-wrap with the link on its own line at 360 rather than
        two labels fighting over one.
      */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-rule pb-3">
        <p className="mono text-fg-dim tabular-nums">
          {label}
          {range ? ` · ${range}` : ""}
        </p>
        {/*
          A VISIBLE LABEL, NOT THE REFERENCE'S BARE ↗.

          An arrow sitting alone in a corner either does nothing, which is a
          dead affordance, or does something nobody can guess. §2 and §10 both
          forbid it, so the arrow is decoration beside a word that says where
          the link goes.
        */}
        <Link
          href="/rotation/archive"
          className="group mono text-fg-dim transition-colors duration-300 ease-[var(--ease-expo)] hover:text-fg focus-visible:text-fg"
        >
          The archive
          <span
            aria-hidden="true"
            className="ml-2 inline-block transition-transform duration-300 ease-[var(--ease-expo)] group-hover:translate-x-1 group-focus-visible:translate-x-1"
          >
            →
          </span>
        </Link>
      </div>

      {/*
        ONE <h1>, TWO LINES — §2. "Rotation Vol. 07" is the page's heading; the
        break and the tint are typography inside it, not a second heading. A
        <h2>-shaped volume number under an <h1> would announce a section that
        does not exist.
      */}
      <h1 className="display mt-6 text-[clamp(2.5rem,12vw,4rem)] leading-[0.92] tracking-tight text-fg md:text-[clamp(3.5rem,9vw,7rem)]">
        Rotation
        <span className="block text-fg-dim">{volumeTitleLabel(volume.number)}</span>
      </h1>

      <div className="mt-6 border-b border-rule" />
      </div>
    </header>
  );
}

export default RotationMasthead;
