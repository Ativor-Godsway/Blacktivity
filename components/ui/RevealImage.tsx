import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A single photograph, in its own colours.
 *
 * WHAT WAS HERE, AND WHY IT IS GONE
 *
 * This component used to render the image TWICE — a colour layer and a
 * grayscale plate stacked on top of it — and crossfade their opacity on hover
 * or on scroll into view. That was the site's signature gesture. Revision 12
 * removes it: photography now renders in its own colours everywhere, because a
 * site where article covers are colour and portraits are grey reads as a bug
 * rather than a decision.
 *
 * Do not reintroduce the plate. If selective desaturation is ever wanted it is
 * a deliberate, explicit choice on specific images, not a default that every
 * photograph has to opt out of.
 *
 * The removal also took with it: the aria-hidden duplicate <img>, a second
 * decode of every photograph on the page, the IntersectionObserver that drove
 * the in-view variant, and this component's "use client" boundary — with no
 * state left it is a server component again.
 *
 * THE HOVER AFFORDANCE MOVED, IT DID NOT DISAPPEAR. Cards signal that they are
 * clickable through their own ground, title and arrow — see `.card-hover` in
 * globals.css. Deliberately nothing here: a transform on the image or a scale
 * on the card would break the bordered grid's alignment.
 */
export function RevealImage({
  src,
  alt,
  width,
  height,
  blurDataURL,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  quality,
  className,
  fill = false,
  focalX,
  focalY,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  className?: string;
  fill?: boolean;
  /** Percentage focal point — keeps the subject when a crop is unavoidable. */
  focalX?: number;
  focalY?: number;
}) {
  // Only emitted when a focal point was actually set, so the CSS default
  // (50% 50%) still applies everywhere else.
  const objectPosition =
    focalX === undefined && focalY === undefined
      ? undefined
      : { objectPosition: `${focalX ?? 50}% ${focalY ?? 50}%` };

  const dims = fill
    ? ({ fill: true } as const)
    : ({ width: width ?? 1200, height: height ?? 1600 } as const);

  return (
    <div className={cn("relative overflow-hidden bg-fill-subtle", className)}>
      <Image
        src={src}
        alt={alt}
        {...dims}
        sizes={sizes}
        priority={priority}
        quality={quality}
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
        className="h-full w-full object-cover"
        style={objectPosition}
      />
    </div>
  );
}

export default RevealImage;
