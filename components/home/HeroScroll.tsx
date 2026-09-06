"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cancelFrame, frame } from "motion/react";
import { WORDMARK_ASPECT } from "@/components/brand/Wordmark";

/**
 * THE COVER LIFTS, THE MASTHEAD DOCKS — Revision 15 §2.
 *
 * One signature moment on the whole site. The hero pins, and over ~0.6 of a
 * viewport of scrolling four things move together on a single progress value
 * `p`: the giant wordmark scales and translates into the header's wordmark
 * slot, the cover lifts and fades, the statement and headline slide up behind
 * a mask, and the marquee fades out. It reads as the cover lifting away while
 * the masthead shrinks into the navigation, which is what happens when you
 * open a magazine.
 *
 * TRANSFORM AND OPACITY, NOTHING ELSE. No width, height, margin, filter or
 * clip-path is touched at any point. If a version of this gesture seems to
 * need one of those, the gesture changes, not the rule.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO MEASUREMENT IN HERE
 *
 * `audit:perf` bans getBoundingClientRect, offsetTop and scrollHeight outright,
 * and it is right to: a layout read inside a per-frame loop is the single
 * reliable way to turn a compositor-only animation into a 30fps one. So the
 * dock target is COMPUTED, from constants that the CSS also uses:
 *
 *   contentW = min(vw, 1600) - 2 * gutter      the editorial grid's inner width
 *   wordmarkH = contentW / WORDMARK_ASPECT     the viewBox is tight to the glyphs
 *   wordmarkTop = vh - marqueeH - wordmarkH    it sits directly on the marquee
 *
 * The hero wordmark and the header wordmark live in the SAME 1600px centred
 * container with the same gutter, so their left edges are already identical at
 * every width. With `transform-origin: left top` that means X needs no
 * correction at all — scaling about the top-left keeps the left edges together
 * and the only thing left to solve is Y.
 *
 * Every number below is therefore a CSS fact restated in JavaScript, and each
 * one is a coupling. They are listed together, at the top, rather than inlined
 * where they are used, so that the coupling is visible rather than discovered.
 * ---------------------------------------------------------------------------
 */

/** `max-w-[1600px]` on both the hero wordmark's row and the header's row. */
const GRID_MAX = 1600;
/** `--gutter` at md and up. The pin only ever runs at md and up. */
const GUTTER_MD = 32;
/** `--hero-marquee-h` at md and up. */
const MARQUEE_H = 52;
/** The header's `md:w-[160px]` wordmark — the slot being docked into. */
const HEADER_WORDMARK_W = 160;
/** The header row's `py-5`, which is the slot's distance from the viewport top. */
const HEADER_PAD_TOP = 20;
/** `--hero-spacer` is 160svh, so 0.6 of a viewport is travelled while pinned. */
const PIN_TRAVEL = 0.6;
/** Below this the hero does not pin at all — see the mobile note in the effect. */
const PIN_MIN_WIDTH = 768;

/** The class the CSS keys the entire pin off. Also set pre-paint — see layout. */
const PIN_CLASS = "hero-pin";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Maps p onto [from, to] and clamps — the whole easing vocabulary needed here. */
function phase(p: number, from: number, to: number) {
  return clamp01((p - from) / (to - from));
}

type Geometry = {
  travel: number;
  scale: number;
  dy: number;
};

function geometry(): Geometry {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const contentW = Math.min(vw, GRID_MAX) - GUTTER_MD * 2;
  const wordmarkH = contentW / WORDMARK_ASPECT;
  const wordmarkTop = vh - MARQUEE_H - wordmarkH;

  return {
    travel: vh * PIN_TRAVEL,
    scale: HEADER_WORDMARK_W / contentW,
    // transform-origin is left top, so scaling holds the top edge in place and
    // this is simply the distance from where the top edge is to where it goes.
    dy: HEADER_PAD_TOP - wordmarkTop,
  };
}

export function HeroScroll({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /*
     * NO PIN BELOW 768px — Revision 15 §4, and it is not a nicety.
     *
     * Mobile browsers resize the viewport as the URL bar hides and shows. A
     * pinned 100vh hero therefore jumps by the height of the bar mid-gesture,
     * which reads as a bug rather than as motion. The hero scrolls normally
     * there and the composition is built to fit one svh on its own.
     *
     * Reduced motion gets the same treatment for a different reason: no pin, no
     * transforms, no marquee movement. The hero renders resting and the page
     * scrolls straight past it. There is nothing to "stop" mid-way because
     * nothing was ever started.
     */
    const enabled = () =>
      !reduced && window.innerWidth >= PIN_MIN_WIDTH;

    const doc = document.documentElement;

    /*
     * The four moving parts, plus the header's real wordmark.
     *
     * ONE WORDMARK IS RENDERED, NOT TWO. The header's is the slot; while the
     * gesture is running it is held at opacity 0 by CSS and the giant one is
     * transformed into its position. At p >= 0.98 they swap: because they then
     * occupy the same box at the same size, the swap is invisible.
     */
    const wordmark = root.querySelector<HTMLElement>("[data-hero-wordmark]");
    const cover = root.querySelector<HTMLElement>("[data-hero-cover]");
    const marquee = root.querySelector<HTMLElement>("[data-hero-marquee]");
    const copy = Array.from(root.querySelectorAll<HTMLElement>("[data-hero-copy]"));
    const headerWordmark = document.querySelector<HTMLElement>(
      "header[data-overlay] [data-wordmark]",
    );

    let geo = geometry();
    let last = -1;

    /** Returns everything to its resting state and drops every inline style. */
    const reset = () => {
      for (const el of [wordmark, cover, marquee, ...copy]) {
        if (!el) continue;
        el.style.transform = "";
        el.style.opacity = "";
        el.style.transformOrigin = "";
      }
      if (headerWordmark) headerWordmark.style.opacity = "";
      last = -1;
    };

    const apply = (p: number) => {
      if (wordmark) {
        // p = 0 is translate3d(0,0,0) scale(1) — the identity transform, so the
        // resting state is genuinely untransformed and nothing is mid-animation
        // at first paint. This is also why no inline style exists until the
        // first frame runs.
        wordmark.style.transformOrigin = "left top";
        wordmark.style.transform = `translate3d(0, ${geo.dy * p}px, 0) scale(${
          1 + (geo.scale - 1) * p
        })`;
        wordmark.style.opacity = p >= 0.98 ? "0" : "1";
      }

      // The invisible swap. The header's wordmark is held at 0 by CSS for the
      // whole gesture and only raised once the moving one has landed on it.
      if (headerWordmark) headerWordmark.style.opacity = p >= 0.98 ? "1" : "0";

      if (cover) {
        cover.style.transform = `translate3d(0, ${-15 * p}%, 0) scale(${1 + 0.08 * p})`;
        cover.style.opacity = String(1 - phase(p, 0.8, 1));
      }

      // Up behind the mask its parent provides, gone by 0.6.
      const q = phase(p, 0, 0.6);
      for (const el of copy) {
        el.style.transform = `translate3d(0, ${-100 * q}%, 0)`;
        el.style.opacity = String(1 - q);
      }

      if (marquee) marquee.style.opacity = String(1 - phase(p, 0, 0.4));
    };

    /*
     * ONE rAF LOOP FOR THE WHOLE SITE — Revision 06 §5.
     *
     * This is a callback on Motion's SHARED frame loop, which SmoothScroll
     * already drives Lenis from. It is not a second requestAnimationFrame and
     * it is not a ScrollTrigger instance with a loop of its own; `check:raf`
     * asserts that nothing loops at rest.
     *
     * window.scrollY is a read, but it is not one of the three the audit bans,
     * and it is the cheap one: it does not force layout the way
     * getBoundingClientRect does. Everything else in `geo` is arithmetic that
     * changes only on resize.
     */
    const update = () => {
      const p = clamp01(window.scrollY / geo.travel);
      // Scrubbing backwards, fast, or past the end all land here; the state is
      // a pure function of p, so there is no stranded state to recover from.
      if (p === last) return;
      last = p;
      apply(p);
    };

    let attached = false;

    const attach = () => {
      if (attached) return;
      attached = true;
      doc.classList.add(PIN_CLASS);
      geo = geometry();
      frame.update(update, true);
    };

    const detach = () => {
      if (!attached) return;
      attached = false;
      cancelFrame(update);
      doc.classList.remove(PIN_CLASS);
      reset();
    };

    const sync = () => {
      if (enabled()) {
        // Crossing the breakpoint or rotating the device changes every number.
        if (attached) geo = geometry();
        else attach();
      } else {
        detach();
      }
    };

    sync();

    // resize, not scroll: `addEventListener("scroll", ...)` is banned outright
    // and would be pointless here anyway — the frame loop already has the value.
    window.addEventListener("resize", sync);

    return () => {
      window.removeEventListener("resize", sync);
      detach();
    };
  }, []);

  /*
   * THE SPACER IS A FIXED HEIGHT IN CSS — 160svh, applied by the pin class.
   *
   * Nothing here drives height or position from JavaScript. That is what keeps
   * CLS at zero: the spacer's height is present at first paint, because the
   * pin class is set by a tiny pre-paint script in the site layout rather than
   * by this effect. If it were added on hydration the whole page below the
   * hero would jump 60svh on load.
   */
  return (
    <div ref={rootRef} data-hero-spacer>
      {children}
    </div>
  );
}

export default HeroScroll;
