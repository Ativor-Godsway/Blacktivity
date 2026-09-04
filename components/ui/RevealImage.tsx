"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * THE SIGNATURE GESTURE — grayscale resting, full colour on hover / in view.
 *
 * Implemented as a TWO-LAYER CROSSFADE, not an animated filter. Animating
 * `filter` is not compositor-accelerated: every frame of the transition
 * repaints the image. Here the filter is applied statically to the top layer
 * and rasterized once, and only `opacity` animates — which the compositor
 * handles on its own thread.
 *
 * The colour layer carries the alt text; the grey layer is decorative.
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
  colorOnView = true,
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
  colorOnView?: boolean;
  fill?: boolean;
  /** Percentage focal point — keeps the subject when a crop is unavoidable. */
  focalX?: number;
  focalY?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!colorOnView) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [colorOnView]);

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
    <div
      ref={ref}
      className={cn("group/img relative overflow-hidden bg-fill-subtle", className)}
    >
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

      {/* Static grey plate. Only its opacity animates. */}
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        {...dims}
        sizes={sizes}
        priority={priority}
        quality={quality}
        className={cn(
          "absolute inset-0 h-full w-full object-cover grayscale contrast-[1.08]",
          "transition-opacity duration-[600ms] ease-[var(--ease-expo)]",
          // Reveals on hovering the image itself OR the card that wraps it.
          "group-hover/img:opacity-0 group-hover:opacity-0 motion-reduce:opacity-0",
          inView ? "opacity-0" : "opacity-100",
        )}
        style={objectPosition}
      />
    </div>
  );
}

export default RevealImage;
