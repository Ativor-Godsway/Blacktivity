import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Cover } from "@/data/covers";

/**
 * One cover, treated as a physical paper object.
 *
 * Two performance constraints shape this component:
 *
 *  - The grey plate is a second static image whose OPACITY animates. Animating
 *    `filter` would repaint the image on every frame of the transition.
 *  - The drop shadow is a tight, low-blur `box-shadow` on a static inner
 *    element. A wide blurred shadow on the element that actually moves has to
 *    be re-rasterized every frame; `filter: drop-shadow()` is worse still.
 *
 * While `placeholder` is true a masthead is drawn over the photograph so the
 * stack reads as a run of magazine covers. Real artwork sets
 * `placeholder: false` and renders clean, edge to edge.
 */
export function CoverCard({
  cover,
  index,
  active,
  priority = false,
  sizes = "(max-width: 768px) 74vw, 26vw",
}: {
  cover: Cover;
  index: number;
  active: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-paper-raised shadow-[0_2px_10px_-4px_rgba(11,11,11,0.45)]">
      {/* A card that is not at the front is fully covered by its own grey
          plate, so shipping the colour layer as well doubles the image
          requests for something nobody can see. Only the front card renders
          both. Both layers share a src, so promoting a card to the front is a
          cache hit, not a new fetch — no pop. */}
      {active ? (
        <Image
          src={cover.image}
          alt={`${cover.issue} — ${cover.title}`}
          fill
          sizes={sizes}
          priority={priority}
          loading="eager"
          quality={70}
          placeholder="blur"
          className="object-cover"
        />
      ) : null}

      <Image
        src={cover.image}
        alt={active ? "" : `${cover.issue} — ${cover.title}`}
        aria-hidden={active ? "true" : undefined}
        fill
        sizes={sizes}
        priority={priority}
        loading="eager"
        quality={70}
        placeholder="blur"
        className={cn(
          "absolute inset-0 object-cover grayscale contrast-[1.08]",
          "transition-opacity duration-[600ms] ease-[var(--ease-expo)]",
          active ? "opacity-0" : "opacity-100",
        )}
      />

      {cover.placeholder ? (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55"
          />

          <div className="absolute inset-0 flex flex-col justify-between p-4 text-paper md:p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="font-display text-[clamp(1.5rem,3.4vw,2.4rem)] leading-none tracking-[-0.03em]">
                BLACKTIVITY
              </span>
              <span className="mono pt-1 text-[9px] whitespace-nowrap opacity-80 md:text-[10px]">
                {cover.issue}
              </span>
            </div>

            <div>
              <p className="font-display text-[clamp(1.7rem,4vw,2.9rem)] leading-[0.95] tracking-[-0.02em]">
                {cover.title}
              </p>
              <p className="mono mt-2 text-[9px] opacity-80 md:text-[10px]">{cover.line}</p>
            </div>
          </div>
        </>
      ) : null}

      {active ? (
        <span className="sr-only">
          Cover {index + 1}: {cover.issue}, {cover.title}
        </span>
      ) : null}
    </div>
  );
}

export default CoverCard;
