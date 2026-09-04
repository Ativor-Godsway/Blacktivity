"use client";

import { useEffect, useRef, useState } from "react";
import { ADINKRA_LAYERS, ADINKRA_VIEWBOX } from "@/data/adinkra";
import { cn } from "@/lib/utils";

/**
 * The hero mark: a single Akan symbol, inline SVG.
 *
 * Motion is transform, opacity and stroke-dashoffset ONLY — no canvas, no
 * WebGL, no library, and nothing that touches the animated-filter or blend-mode
 * rules the perf audit enforces. Rotation runs on CSS keyframes, which the
 * compositor drives off the main thread, so this costs nothing per frame.
 *
 * Geometry is data (see data/adinkra.ts) and swaps without touching this file.
 *
 * Under prefers-reduced-motion nothing animates at all: the mark renders in its
 * final drawn state, which is also what the server sends, so it is fully
 * visible with JavaScript disabled.
 */
export function AdinkraMark({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    // Draw once when it first comes into view, then never again.
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setDrawn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      viewBox={ADINKRA_VIEWBOX}
      className={cn("adinkra", drawn && "adinkra-drawn", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ADINKRA_LAYERS.map((layer, i) => (
        <g
          key={i}
          className={layer.spin ? "adinkra-spin" : undefined}
          style={
            layer.spin
              ? {
                  // Negative durations are invalid; direction carries the sign.
                  animationDuration: `${Math.abs(layer.spin)}s`,
                  animationDirection: layer.spin < 0 ? "reverse" : "normal",
                }
              : undefined
          }
        >
          <path
            d={layer.d}
            strokeWidth={layer.width}
            pathLength={1}
            style={{ transitionDelay: `${layer.delay ?? 0}s` }}
          />
        </g>
      ))}
    </svg>
  );
}

export default AdinkraMark;
