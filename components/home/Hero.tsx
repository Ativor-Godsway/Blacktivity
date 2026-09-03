"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import MonoLabel from "@/components/ui/MonoLabel";
import Wordmark from "@/components/brand/Wordmark";
import CoverCard from "./CoverCard";
import { COVERS } from "@/data/covers";
import { SITE } from "@/lib/constants";
import { pad2 } from "@/lib/utils";

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * Resting offsets for a card sitting `depth` places behind the front one.
 *
 * The scale falloff is 0.075, not the 0.04 first used, for a measurable
 * reason: LCP is scored on an element's axis-aligned bounding box, and these
 * cards are rotated. At 0.04 the 2.6-degree rotation on the depth-1 card
 * enlarged its bounding box more than the scale shrank it (104,857px2 versus
 * the front card's 104,106px2), so a card with no preload became the LCP
 * element and the largest paint waited on it. 0.075 keeps the front card
 * unambiguously the largest at every depth.
 */
function restingTransform(depth: number) {
  return {
    y: depth * 16,
    x: depth * 10,
    scale: 1 - depth * 0.075,
    rotate: [0, -2.6, 2.1, -1.4, 2.8, -0.9][depth % 6] ?? 0,
    opacity: Math.max(0.35, 1 - depth * 0.16),
  };
}

/**
 * THE COVER STACK.
 *
 * Deliberately NOT pinned, on any breakpoint. The previous build made the hero
 * 600vh with a sticky inner container; measured against a production build,
 * that sticky container was responsible for a ~6x increase in rasterization
 * during scroll (277ms vs 48ms over a 4s scroll). Pinning also fights the
 * collapsing URL bar on iOS Safari.
 *
 * Instead the hero is exactly one screen tall and the stack cycles from how far
 * the hero has scrolled out of view. No hijacking, no height manipulation.
 *
 * Height is `100svh`, never `100vh`: `vh` is measured against the expanded
 * mobile viewport and shifts the layout when the URL bar collapses.
 */
export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const [visibleCount, setVisibleCount] = useState(3);
  const [index, setIndex] = useState(0);

  // Mobile shows 3 cards, not 6 — fewer large composited layers.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setVisibleCount(mq.matches ? COVERS.length : 3);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const covers = COVERS.slice(0, visibleCount);
  const total = covers.length;

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // scrollYProgress is a MotionValue, so it updates outside React's render
  // cycle. Only the derived index enters state, and only when it changes —
  // a handful of re-renders across the whole hero, not one per frame.
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduced) return;
    const next = Math.min(total - 1, Math.max(0, Math.floor(p * total * 1.15)));
    setIndex((current) => (current === next ? current : next));
  });

  return (
    <section
      ref={heroRef}
      aria-label="Blacktivity cover archive"
      className="relative h-[100svh] overflow-hidden"
    >
      {/* ── Layer 0 — the wordmark ───────────────────────────────────────
          Cropped on the VERTICAL axis: the full name spans the viewport and
          its bottom edge is clipped by the fold. The previous build cropped
          horizontally to "BLACKT", which made the name unreadable.

          Both numbers here are measured, not chosen:

          Width is exactly 100vw — the viewBox is tight to the glyph bounds,
          so any horizontal bleed slices the tail off the 'y'.

          The clip is 10% of the height from md up, not the third originally
          specified. 'y' is the word's only descender and its tail occupies the
          bottom ~12%; clipping a third renders the mark as "blacktivitu".
          Legibility is what the deeper crop was meant to buy, so it wins.
          Below md it drops to ~4%, because the crop is proportional and 10% of
          an 83px-tall mark leaves too little of that tail to read. */}
      <Wordmark
        className="pointer-events-none absolute bottom-[-1vw] left-0 w-full text-ink md:bottom-[-2.3vw]"
        aria-hidden="true"
      />

      {/* ── Layer 1 — the cover stack, offset right of centre ──────────── */}
      <div
        className="absolute left-1/2 w-[74vw] max-w-[440px] -translate-x-1/2 md:left-[60%] md:w-[26vw]"
        style={{ bottom: "var(--stack-bottom)" }}
      >
        <div className="relative aspect-4/5 w-full">
          {covers.map((cover, i) => {
            const depth = (i - index + total) % total;
            const rest = restingTransform(depth);

            return (
              <motion.div
                key={cover.issue}
                className="absolute inset-0"
                style={{ zIndex: total - depth }}
                aria-hidden={depth !== 0}
                // EVERY card renders at its resting state in the SSR markup.
                // The on-load fan-out used to start the back cards at
                // opacity 0, which put nine invisible elements in the HTML —
                // and because a back card is ~96% the size of the front one it
                // became the LCP element, so the largest paint waited on
                // hydration (LCP 3.7s). Cycling is still animated; only the
                // entrance is gone, and it was the cheaper half of the gesture.
                initial={false}
                animate={rest}
                transition={{ duration: 0.55, ease: EASE_EXPO }}
              >
                <CoverCard
                  cover={cover}
                  index={i}
                  active={depth === 0}
                  priority={i === 0}
                  sizes="(max-width: 768px) 74vw, 26vw"
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Layer 2 — the micro type ──────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-20 p-(--gutter)">
        <div className="hidden justify-end pt-8 md:flex md:pt-9">
          <MonoLabel className="text-right leading-relaxed">
            {SITE.edition}
            <br />
            <span className="text-fg-muted">ACCRA — GH</span>
          </MonoLabel>
        </div>

        {/* Left-hand block, balancing the stack's offset to the right. */}
        <div className="absolute top-[38%] left-(--gutter) hidden max-w-[22ch] md:block">
          <p className="text-fg-muted">
            A creative studio and publication in Accra, documenting Black
            creativity.
          </p>
          <MonoLabel className="mt-6 block text-fg-muted">
            {reduced ? `The archive — ${pad2(total)} covers` : "Scroll to cycle the archive"}
          </MonoLabel>
        </div>

        <div className="absolute top-1/2 right-(--gutter) hidden -translate-y-1/2 md:block">
          <MonoLabel className="block rotate-90 tabular-nums" aria-live="polite">
            {pad2(index + 1)} — {pad2(total)}
          </MonoLabel>
        </div>

        <div className="mt-20 flex justify-center md:hidden">
          <MonoLabel className="text-fg-muted">
            {reduced ? `The archive — ${pad2(total)} covers` : "Scroll to cycle the archive"}
          </MonoLabel>
        </div>
      </div>
    </section>
  );
}

export default Hero;
