"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cancelFrame, frame } from "motion/react";
import { WORDMARK_ASPECT } from "@/components/brand/Wordmark";

/**
 * THE COVER'S ONE CONTROLLER — Revision 19 §6.
 *
 * Everything that moves on the home page hero is driven from here: the
 * six-second auto-advance, the crossfade, the pointer parallax, and the scroll
 * dock that Revision 15 §2 introduced and §6.4 re-stages.
 *
 * ONE rAF CALLBACK FOR ALL OF IT, on Motion's shared frame loop — the same one
 * SmoothScroll already drives Lenis from. Not a second requestAnimationFrame,
 * not a ScrollTrigger, not a setInterval for the timer. `check:raf` asserts
 * that nothing loops at rest, and the timer being part of this callback rather
 * than a separate interval is what lets one `paused` flag stop the clock, the
 * Ken Burns drift and the tick fill together.
 *
 * WHAT IS *NOT* HERE, DELIBERATELY:
 *
 *   The crossfade, the Ken Burns drift, the cover line's word stagger, the
 *   odometer roll and the tick fill are all CSS — transitions and keyframe
 *   animations keyed off `data-active`. This file moves attributes; the
 *   stylesheet does the animating. That is not a stylistic preference: a
 *   per-frame opacity write from JavaScript is a main-thread job every frame,
 *   while a CSS opacity transition is handed to the compositor once. The only
 *   things written per frame are the two parallax transforms and the dock, and
 *   they are written only while they are actually changing.
 *
 * TRANSFORM AND OPACITY, NOTHING ELSE. No width, height, margin, filter or
 * clip-path is touched at any point. If an effect seems to need one, the effect
 * changes, not the rule.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO MEASUREMENT IN HERE
 *
 * `audit:perf` bans getBoundingClientRect, offsetTop and scrollHeight outright,
 * and it is right to: a layout read inside a per-frame loop is the single
 * reliable way to turn a compositor-only animation into a 30fps one. So the
 * dock target is COMPUTED, from constants the CSS also uses:
 *
 *   contentW  = min(vw, 1600) - 2 * gutter    the editorial grid's inner width
 *   scale     = 160 / contentW                the header's wordmark slot
 *   dy        = headerPadTop - mastheadTop    both constants, both in the CSS
 *
 * REVISION 19 MADE THIS ARITHMETIC SIMPLER, NOT HARDER. Under Revision 15 the
 * masthead was across the BOTTOM of the hero, so its resting position had to be
 * derived from the viewport height, the marquee's height and the mark's own
 * aspect ratio — three constants and a division. It now sits at a fixed offset
 * from the TOP, so its resting Y is one token, and the aspect ratio is needed
 * for nothing but the assertion below.
 *
 * Every number here is a CSS fact restated in JavaScript, and each one is a
 * coupling. They are listed together, at the top, rather than inlined where
 * they are used, so the coupling is visible rather than discovered.
 * ---------------------------------------------------------------------------
 */

/** `max-w-[1600px]` on both the masthead's row and the header's row. */
const GRID_MAX = 1600;
/** `--gutter` at md and up. The pin only ever runs at md and up. */
const GUTTER_MD = 32;
/** The header's `md:w-[160px]` wordmark — the slot being docked into. */
const HEADER_WORDMARK_W = 160;
/** The header row's `py-5`, which is the slot's distance from the viewport top. */
const HEADER_PAD_TOP = 20;
/**
 * `--cover-masthead-top` at md and up: --header-bar-h (77) + --gutter (32).
 *
 * IT WAS 66 — derived from --hero-nav-h, which measures the nav LINE rather
 * than the header BAR. The bar is 77px tall because it also holds the header's
 * own wordmark, invisible over the cover but still taking up its box, and the
 * masthead was therefore starting 11px inside the header at every width from
 * 768 up. Revision 22 §4.
 */
const MASTHEAD_TOP_MD = 109;
/** `--hero-spacer` is 160svh, so 0.6 of a viewport is travelled while pinned. */
const PIN_TRAVEL = 0.6;
/**
 * How far the docked header travels off the top before it is fully gone.
 *
 * The header bar is `py-5` (20 + 20) around a 160px wordmark at 4.349:1, so
 * ~37px of mark: 77px, rounded up. Past this there is nothing left on screen
 * and no reason to keep writing a transform.
 */
const HEADER_H = 80;
/**
 * NO PIN AND NO DOCK BELOW THIS — Revision 15 §4, restated by §7, and it is not
 * a nicety. Mobile browsers resize the viewport as the URL bar hides and shows,
 * so a pinned 100svh cover jumps by the height of the bar mid-gesture, which
 * reads as a bug rather than as motion. The cover scrolls away normally there.
 */
const PIN_MIN_WIDTH = 768;

/** The class the CSS keys the entire pin off. Also set pre-paint — see layout. */
const PIN_CLASS = "hero-pin";

/** §6.2 — auto-advance every six seconds. Also the CSS animations' duration. */
const SLIDE_MS = 6000;
/** §6.2 — the outgoing cover line's exit, before its slide is cleaned up. */
const EXIT_MS = 350;
/** §6.1 — the load sequence plays once per session. */
const PRINT_FLAG = "blacktivity:cover-printed";
const PRINT_CLASS = "cover-print";
/** §6.1 — how long the print sequence owns the cover before the clock starts. */
const PRINT_MS = 1400;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Maps p onto [from, to] and clamps — the whole easing vocabulary needed here. */
function phase(p: number, from: number, to: number) {
  return clamp01((p - from) / (to - from));
}

/** Frame-rate-independent lerp, so the parallax feels the same at 60 and 120Hz. */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type Geometry = { travel: number; scale: number; dy: number };

function geometry(): Geometry {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const contentW = Math.min(vw, GRID_MAX) - GUTTER_MD * 2;

  return {
    travel: vh * PIN_TRAVEL,
    scale: HEADER_WORDMARK_W / contentW,
    // transform-origin is `left top`, so scaling holds the top edge in place
    // and this is simply the distance from where that edge is to where it goes.
    dy: HEADER_PAD_TOP - MASTHEAD_TOP_MD,
  };
}

export function CoverStage({
  children,
  count,
  isStatic,
}: {
  children: ReactNode;
  /** How many slides are in the deck. */
  count: number;
  /** Fewer than three slides: a static cover, no carousel at all — §5. */
  isStatic: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * "SCRIPTING IS RUNNING" — the flag the stylesheet gates the carousel's
   * chrome on. Without it the cover is the static, server-rendered slide 01:
   * no ticks, no pause button, and the other slides' cover lines are
   * `display: none` rather than sitting at opacity 0, where a reader without
   * scripting can select text they cannot see. See the note in globals.css for
   * why this is not `@media (scripting: none)`.
   *
   * IT IS REACT STATE ON AN ELEMENT THIS COMPONENT RENDERS, not a class added
   * imperatively to the section below, and that is a bug fix rather than a
   * style. The first version did `section.classList.add(...)` in the effect,
   * and measured: the class appeared at 176ms and was gone by 1975ms. The cover
   * kept working — so the effect was alive — because what had happened was that
   * the SECTION ELEMENT was replaced by a remount higher up the tree. The new
   * node never got the class, and the old node's cleanup took it away.
   *
   * Anything written onto a DOM node React owns is lost the moment React
   * replaces that node. State survives it, because React reapplies it.
   */
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const section = root.querySelector<HTMLElement>("[data-cover]");
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const doc = document.documentElement;
    const photoSlides = Array.from(section.querySelectorAll<HTMLElement>("[data-cover-slide]"));
    const lines = Array.from(section.querySelectorAll<HTMLElement>("[data-cover-line]"));
    const ticks = Array.from(section.querySelectorAll<HTMLElement>("[data-cover-tick]"));
    const images = Array.from(section.querySelectorAll<HTMLImageElement>("img.cover-photo"));
    const photos = section.querySelector<HTMLElement>("[data-cover-photos]");
    const type = section.querySelector<HTMLElement>("[data-cover-type]");
    const masthead = section.querySelector<HTMLElement>("[data-cover-masthead]");
    const lineBlock = section.querySelector<HTMLElement>("[data-cover-lines]");
    const foot = section.querySelector<HTMLElement>("[data-cover-foot]");
    const odometer = section.querySelector<HTMLElement>(".odometer-strip");
    const pauseBtn = section.querySelector<HTMLButtonElement>("[data-cover-pause]");
    const headerWordmark = document.querySelector<HTMLElement>(
      "header[data-overlay] [data-wordmark]",
    );

    /*
     * SCRIPTING IS RUNNING: reveal the parts that only work with it.
     *
     * Both gates are INLINE `display` values the server rendered, not CSS
     * rules — see the note in Cover.tsx. Flipping them here is what makes the
     * no-script cover a genuine static slide 01 rather than a carousel with
     * dead controls, and it holds whether or not the stylesheet arrived.
     */
    const ticksRow = section.querySelector<HTMLElement>("[data-cover-ticks]");
    for (const el of lines) el.style.display = "block";
    if (ticksRow && !isStatic && count > 1) ticksRow.style.display = "flex";

    /* ------------------------------------------------------------------ *
     * THE FIRST-LOAD SEQUENCE — §6.1
     *
     * A sessionStorage flag, wrapped in try/catch because private browsing
     * and blocked site data both throw on access rather than returning null.
     * A throw here must not take the cover down with it, so the fallback is
     * "play the sequence", which is the harmless direction to fail in.
     * ------------------------------------------------------------------ */
    let printing = false;
    if (!reduced) {
      let printed = false;
      try {
        printed = sessionStorage.getItem(PRINT_FLAG) === "1";
      } catch {
        printed = false;
      }
      if (!printed) {
        printing = true;
        section.classList.add(PRINT_CLASS);
        try {
          sessionStorage.setItem(PRINT_FLAG, "1");
        } catch {
          /* Nothing to do — the sequence plays again next navigation. */
        }
      }
    }

    /* ------------------------------------------------------------------ *
     * SLIDE STATE
     * ------------------------------------------------------------------ */
    let index = 0;
    let elapsed = 0;
    /* Auto-advance is OFF by default under reduced motion — §9 — and off
       entirely when there is nothing to advance to. */
    let userPaused = reduced || isStatic || count < 2;
    let hoverPaused = false;
    let hiddenPaused = document.visibilityState === "hidden";
    let scrollPaused = false;
    let exitTimer: ReturnType<typeof setTimeout> | null = null;

    const paused = () => userPaused || hoverPaused || hiddenPaused || scrollPaused;

    /**
     * The slide's tone, applied to the two blocks that sit over the top of the
     * photograph: the cover's own head block and the overlay header's nav.
     *
     * The header is not a descendant of the cover, so it cannot inherit — it is
     * `position: absolute` over it and, under the pin, `fixed`. Writing the
     * attribute in both places from one call is what keeps them from drifting
     * apart, which is what a second observer would eventually do.
     */
    const overlayHeader = document.querySelector<HTMLElement>("header[data-overlay]");
    const setTone = (dark: boolean) => {
      /*
       * setAttribute, NOT toggleAttribute. `toggleAttribute` sets the value to
       * the empty string, and the stylesheet's selector is
       * `[data-cover][data-tone="dark"]` — an exact value match, which "" does
       * not satisfy. The attribute was present, the rule never fired, and the
       * masthead stayed --bone on the one slide the flag exists for.
       */
      if (dark) section.setAttribute("data-tone", "dark");
      else section.removeAttribute("data-tone");
      if (dark) overlayHeader?.setAttribute("data-cover-tone", "dark");
      else overlayHeader?.removeAttribute("data-cover-tone");
    };

    const syncPausedAttr = () => {
      if (paused()) section.setAttribute("data-paused", "");
      else section.removeAttribute("data-paused");
    };

    /**
     * Wakes the NEXT slide's image and only the next one — §8.
     *
     * Slides 02+ are served with `data-src` / `data-srcset` and no real
     * attribute, so nothing beyond slide 01 is fetched until this runs. Moving
     * the value across is the whole preload: no <link rel=preload> in the head,
     * no duplicate request, and never more than one slide ahead of the reader.
     *
     * `loading="lazy"` cannot do this job — see the note in Cover.tsx. Every
     * slide is a full-viewport absolutely-positioned box, so the browser
     * considers all of them in view and fetches the lot.
     *
     * The <source> has to be moved with the <img>: on a phone the <source> is
     * what actually wins, and an <img> given a src while its <source> is still
     * empty downloads the LANDSCAPE file on a portrait screen — both halves of
     * the art direction, in the wrong order.
     */
    const preloadNext = (i: number) => {
      const next = images[(i + 1) % images.length];
      // `dataset.src` is the flag for "not yet loaded", not `!src`: every
      // withheld slide now carries a transparent pixel as its src so it can
      // never paint alt text, so `src` is always truthy. See Cover.tsx.
      if (!next || !next.dataset.src) return;
      const source = next.parentElement?.querySelector<HTMLSourceElement>("source[data-srcset]");
      if (source?.dataset.srcset) {
        source.srcset = source.dataset.srcset;
        delete source.dataset.srcset;
      }
      const src = next.dataset.src;
      if (src) {
        next.src = src;
        delete next.dataset.src;
      }
    };

    const show = (next: number, fromUser: boolean) => {
      if (next === index || count === 0) return;
      const previous = index;
      index = ((next % count) + count) % count;

      // The outgoing cover line rises OUT rather than dropping back. The
      // attribute is what the stylesheet keys that exit off, and it is cleared
      // once the exit has run so the slide is back in its resting state.
      const leaving = lines[previous];
      if (leaving) {
        leaving.setAttribute("data-leaving", "");
        if (exitTimer) clearTimeout(exitTimer);
        exitTimer = setTimeout(() => leaving.removeAttribute("data-leaving"), EXIT_MS);
      }

      /*
       * OPACITY AND Z-INDEX ARE WRITTEN AS INLINE STYLES — Revision 22 §2.1.
       *
       * They used to be CSS rules keyed off `data-active`, which meant the
       * difference between one slide and three stacked down the page was a
       * stylesheet arriving. The attribute is still set, because the Ken Burns
       * drift and the print sequence key off it, but nothing STRUCTURAL does
       * any more.
       *
       * Position and inset are never touched here. Every slide is positioned
       * identically at all times; only these two properties vary.
       */
      photoSlides.forEach((el, i) => {
        const on = i === index;
        el.toggleAttribute("data-active", on);
        el.style.opacity = on ? "1" : "0";
        el.style.zIndex = on ? "1" : "0";
        el.inert = !on;
      });
      lines.forEach((el, i) => {
        const on = i === index;
        el.toggleAttribute("data-active", on);
        el.style.opacity = on ? "1" : "0";
        el.style.zIndex = on ? "1" : "0";
        el.inert = !on;
      });
      ticks.forEach((el, i) => {
        el.toggleAttribute("data-active", i === index);
        el.toggleAttribute("data-done", i < index);
        if (i === index) el.setAttribute("aria-current", "true");
        else el.removeAttribute("aria-current");
      });

      // The odometer is a masked strip translated by whole line-heights.
      if (odometer) odometer.style.setProperty("--n", String(index));

      // `tone` flips the masthead block and the overlay header's nav — the two
      // things sitting on the top band of the photograph. See globals.css.
      setTone(photoSlides[index]?.dataset.tone === "dark");

      /*
       * POLITENESS IS `off` WHILE AUTO-PLAYING — §6.5.
       *
       * An announcement every six seconds that the reader did not ask for is an
       * interruption, not information. Once they drive the cover themselves the
       * change IS the answer to what they just did, so it is raised to polite
       * and the text is updated.
       */
      /*
        RE-QUERIED, NOT CACHED. React replaces this subtree's nodes on a
        remount, and a cached reference then points at a detached element —
        every write lands somewhere nobody is reading. It cost an afternoon
        once already; see the note on `live` in the render below.
      */
      const liveNow = section.querySelector<HTMLElement>("[data-cover-live]");
      if (liveNow) {
        liveNow.setAttribute("aria-live", fromUser ? "polite" : "off");
        if (fromUser) {
          liveNow.textContent = `Cover ${index + 1} of ${count}: ${
            lines[index]?.querySelector("h1")?.textContent ?? ""
          }`;
        }
      }

      elapsed = 0;
      preloadNext(index);
    };

    // Slide 01's tone is already on the SECTION from the server markup (so the
    // no-JS cover flips too), but the header cannot be server-rendered with it —
    // it does not know which page it is on until hydration. Apply it once here.
    setTone(photoSlides[0]?.dataset.tone === "dark");

    /*
     * SLIDE 02 IS WARMED ON IDLE, NOT ON MOUNT — Revision 22 §5.9.
     *
     * It used to be fetched immediately, which put TWO full-viewport
     * photographs on the wire during the first load — measured in the
     * diagnosis as `/cover/landscape/01.jpg` and `.../02.jpg` before the page
     * had settled. The second one competes with the first for bandwidth on
     * exactly the connection where that matters.
     *
     * There is a whole six seconds before it is needed, so it waits for the
     * browser to be idle. `requestIdleCallback` is not in Safari before 17, so
     * a timeout is the fallback — either way it is off the critical path.
     */
    let idle = 0;
    const warmNext = () => preloadNext(0);
    const scheduleWarm = () => {
      idle =
        typeof requestIdleCallback === "function"
          ? requestIdleCallback(warmNext, { timeout: 2500 })
          : (setTimeout(warmNext, 1200) as unknown as number);
    };
    /*
     * AFTER `load`, THEN ON IDLE. Idle alone was not enough: the browser can
     * be idle before the load event has fired, and the test measured two cover
     * photographs on the wire during the first load anyway. Waiting for `load`
     * first is what makes "one image on first load" true by construction
     * rather than by timing.
     */
    if (document.readyState === "complete") scheduleWarm();
    else window.addEventListener("load", scheduleWarm, { once: true });

    /*
     * THE PRINT CLASS HAS TO COME OFF, and this is not tidying.
     *
     * While `.cover-print` is on the section it REPLACES the Ken Burns drift on
     * whichever slide is active — the print IS slide 01's entrance, and running
     * both would scale 1.08 -> 1 -> 1.06 -> 1 in under two seconds. Leaving the
     * class there means slide 02 inherits slide 01's entrance instead of its own
     * drift, and so does every slide after it.
     *
     * A timer rather than the first advance, because the reader may pause during
     * the sequence and then there is no advance to hang it on.
     */
    let printTimer: ReturnType<typeof setTimeout> | null = null;
    if (printing) {
      printTimer = setTimeout(() => {
        section.classList.remove(PRINT_CLASS);
      }, PRINT_MS + 400);
    }

    /* ------------------------------------------------------------------ *
     * THE POINTER PARALLAX — §6.3
     *
     * Desktop and fine pointers only: off on touch, off on (hover: none), off
     * under reduced motion. The photo layer shifts up to 8px against the
     * pointer, the type layer 3px the other way, both lerped in the frame
     * callback below rather than in a loop of their own.
     * ------------------------------------------------------------------ */
    const PHOTO_SHIFT = 8;
    const TYPE_SHIFT = 3;
    const parallax = finePointer && !reduced;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;

    const onPointer = (e: PointerEvent) => {
      // Normalised to -1..1 from the viewport centre. `innerWidth` is not a
      // layout read — it does not force style or layout the way a
      // getBoundingClientRect on an element does.
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };

    /* ------------------------------------------------------------------ *
     * THE SCROLL DOCK — §6.4
     * ------------------------------------------------------------------ */
    let geo = geometry();
    let pinned = false;
    let lastP = -1;

    const enabled = () => !reduced && window.innerWidth >= PIN_MIN_WIDTH;

    /** Returns the docked elements to rest and drops every inline style. */
    const resetDock = () => {
      for (const el of [masthead, lineBlock, foot]) {
        if (!el) continue;
        el.style.transform = "";
        el.style.opacity = "";
      }
      if (overlayHeader) overlayHeader.style.transform = "";
      headerParked = false;
      if (photos) photos.style.opacity = "";
      if (headerWordmark) headerWordmark.style.opacity = "";
      lastP = -1;
    };

    const applyDock = (p: number) => {
      if (masthead) {
        // p = 0 is translate3d(0,0,0) scale(1) — the identity transform, so the
        // resting state is genuinely untransformed and nothing is mid-animation
        // at first paint.
        masthead.style.transform = `translate3d(0, ${geo.dy * p}px, 0) scale(${
          1 + (geo.scale - 1) * p
        })`;
        masthead.style.opacity = p >= 0.98 ? "0" : "1";
      }

      // The invisible swap: the header's wordmark is held at 0 by CSS for the
      // whole gesture and only raised once the moving one has landed on it, at
      // the same size in the same box.
      if (headerWordmark) headerWordmark.style.opacity = p >= 0.98 ? "1" : "0";

      // The cover line and caption rise behind their masks and are gone by 0.5.
      if (lineBlock) {
        const q = phase(p, 0, 0.5);
        lineBlock.style.transform = `translate3d(0, ${-30 * q}%, 0)`;
        lineBlock.style.opacity = String(1 - q);
      }

      // Ticks and marquee, gone by 0.35.
      if (foot) foot.style.opacity = String(1 - phase(p, 0, 0.35));
    };

    /**
     * THE HEADER LEAVES ONCE THE MAGAZINE IS OPEN.
     *
     * THE BUG THIS FIXES: the pin makes the overlay header `fixed`, and
     * Revision 15 left it fixed for the whole page. So the wordmark that has
     * just docked into the corner then travels down the entire homepage,
     * printing itself over whatever scrolls underneath — measured at 1440, it
     * lands squarely on the "ALL ARTICLES" link at the top of the Selected
     * Writing section. §3 asks for the header to have its own space, and it
     * cannot have one while it is pinned over everything.
     *
     * It is also the right gesture rather than merely the fix. The dock reads
     * as a masthead shrinking into the navigation, which is what happens when
     * you open a magazine; what happens next is that you stop looking at the
     * cover. So past p = 1 the header moves with the page, one pixel per pixel
     * of scroll, until it is off the top — and comes straight back on the way
     * up, because like everything else here it is a pure function of scrollY.
     *
     * Transform only, and written only while it is actually moving.
     */
    let headerParked = false;
    const applyHeaderExit = (scrollY: number) => {
      if (!overlayHeader) return;
      const past = scrollY - geo.travel;
      const dy = past <= 0 ? 0 : Math.min(past, HEADER_H);
      if (dy >= HEADER_H) {
        if (headerParked) return;
        headerParked = true;
      } else {
        headerParked = false;
      }
      overlayHeader.style.transform = dy === 0 ? "" : `translate3d(0, ${-dy}px, 0)`;
    };

    /* ------------------------------------------------------------------ *
     * THE ONE FRAME CALLBACK
     * ------------------------------------------------------------------ */
    const update = ({ timestamp, delta }: { timestamp: number; delta: number }) => {
      /* --- the slide clock ------------------------------------------- */
      if (!paused() && count > 1) {
        // `delta` is Motion's own frame delta, so the clock is wall-time rather
        // than frame-count and a slow frame does not stretch a slide.
        elapsed += delta;
        const due = printing ? SLIDE_MS + PRINT_MS : SLIDE_MS;
        if (elapsed >= due) {
          printing = false;
          show(index + 1, false);
        }
      }

      /* --- the dock --------------------------------------------------- */
      let p = 0;
      if (pinned) {
        // window.scrollY is a read, but not one of the three the audit bans,
        // and it is the cheap one — it does not force layout.
        p = clamp01(window.scrollY / geo.travel);
        applyHeaderExit(window.scrollY);
        if (p !== lastP) {
          lastP = p;
          applyDock(p);
          // Auto-advance pauses the moment the cover starts to leave, and
          // resumes only at a true rest — §6.4.
          const nowScrollPaused = p > 0;
          if (nowScrollPaused !== scrollPaused) {
            scrollPaused = nowScrollPaused;
            syncPausedAttr();
          }
        }
      }

      /* --- the parallax ----------------------------------------------- */
      if (parallax && (photos || type)) {
        // Damped towards the pointer. 0.08 per 16.7ms, scaled by the real
        // delta so the feel holds at any refresh rate.
        const t = 1 - Math.pow(1 - 0.08, delta / 16.7);
        const nx = lerp(curX, targetX, t);
        const ny = lerp(curY, targetY, t);
        // Below a twentieth of a pixel there is nothing left to see, so stop
        // writing transforms rather than converging forever.
        if (Math.abs(nx - curX) > 0.0005 || Math.abs(ny - curY) > 0.0005) {
          curX = nx;
          curY = ny;
          /*
           * The photo layer's transform is written ONCE and carries both the
           * parallax and the dock's lift, because an element has one transform
           * property and the last write wins. This is the only place the two
           * effects meet, and composing them here is what keeps that from
           * becoming a bug someone finds by scrolling with the mouse moving.
           */
          if (photos) {
            const lift = phase(p, 0, 1);
            photos.style.transform =
              `translate3d(${-curX * PHOTO_SHIFT}px, ${-curY * PHOTO_SHIFT - 8 * lift}%, 0) ` +
              `scale(${1 + 0.08 * lift})`;
            photos.style.opacity = String(1 - 0.75 * lift);
          }
          if (type) {
            type.style.transform = `translate3d(${curX * TYPE_SHIFT}px, ${curY * TYPE_SHIFT}px, 0)`;
          }
        }
      } else if (photos) {
        // No parallax: the photo layer still carries the dock's lift.
        const lift = phase(p, 0, 1);
        if (lift > 0 || photos.style.transform) {
          photos.style.transform = `translate3d(0, ${-8 * lift}%, 0) scale(${1 + 0.08 * lift})`;
          photos.style.opacity = String(1 - 0.75 * lift);
        }
      }

      void timestamp;
    };

    /* ------------------------------------------------------------------ *
     * WIRING
     * ------------------------------------------------------------------ */

    // --- the ticks ---------------------------------------------------------
    const onTick = (e: Event) => {
      const el = (e.currentTarget as HTMLElement).dataset.index;
      if (el === undefined) return;
      // Clicking a tick is the reader taking over: the cover stops advancing on
      // its own, because otherwise their choice is overwritten six seconds
      // later by a timer they cannot see.
      userPaused = true;
      syncPausedAttr();
      setPauseLabel();
      show(Number(el), true);
    };
    for (const t of ticks) t.addEventListener("click", onTick);

    // --- pause / play ------------------------------------------------------
    const setPauseLabel = () => {
      if (!pauseBtn) return;
      pauseBtn.textContent = userPaused ? "PLAY" : "PAUSE";
      pauseBtn.setAttribute(
        "aria-label",
        userPaused ? "Play the cover carousel" : "Pause the cover carousel",
      );
    };
    const onPause = () => {
      userPaused = !userPaused;
      elapsed = 0;
      syncPausedAttr();
      setPauseLabel();
    };
    pauseBtn?.addEventListener("click", onPause);

    // --- hover, focus and the hidden tab ------------------------------------
    const onEnter = () => {
      hoverPaused = true;
      syncPausedAttr();
    };
    const onLeave = () => {
      hoverPaused = false;
      syncPausedAttr();
    };
    if (finePointer) {
      section.addEventListener("pointerenter", onEnter);
      section.addEventListener("pointerleave", onLeave);
    }
    // Focus pauses at every input type, not just the mouse — a keyboard reader
    // paging the ticks needs the cover to hold still just as much.
    section.addEventListener("focusin", onEnter);
    section.addEventListener("focusout", onLeave);

    const onVisibility = () => {
      hiddenPaused = document.visibilityState === "hidden";
      syncPausedAttr();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // --- arrow keys ---------------------------------------------------------
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      userPaused = true;
      syncPausedAttr();
      setPauseLabel();
      show(index + (e.key === "ArrowRight" ? 1 : -1), true);
    };
    section.addEventListener("keydown", onKey);

    // --- swipe ---------------------------------------------------------------
    /*
     * HORIZONTAL ONLY, AND IT NEVER TOUCHES VERTICAL SCROLL — §6.5.
     *
     * The gesture is only claimed once the horizontal movement is both past a
     * threshold AND larger than the vertical, which is the check that keeps a
     * diagonal flick from stealing a scroll. Nothing calls preventDefault, so
     * the page continues to scroll normally throughout; a swipe that turns out
     * to be a scroll simply never fires.
     */
    const SWIPE_MIN = 48;
    let sx = 0;
    let sy = 0;
    let tracking = false;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      tracking = true;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
      show(index + (dx < 0 ? 1 : -1), true);
    };
    section.addEventListener("touchstart", onTouchStart, { passive: true });
    section.addEventListener("touchend", onTouchEnd, { passive: true });

    if (parallax) window.addEventListener("pointermove", onPointer, { passive: true });

    // --- the pin ------------------------------------------------------------
    /*
     * THE SECTION'S `position` IS OWNED HERE WHILE THE PIN RUNS — Revision 22.
     *
     * Its structural default is the inline `position: relative` in Cover.tsx,
     * which is what makes the slides' `inset: 0` resolve against the cover with
     * or without a stylesheet. The pin needs `sticky`, and an inline style
     * beats the stylesheet rule that used to provide it — measured: the hero
     * reported `position: relative` and the dock silently stopped pinning.
     *
     * `sticky` establishes a containing block for absolutely positioned
     * descendants exactly as `relative` does, so the slides are unaffected by
     * the swap. Detaching restores `relative`, never `""`, because `""` would
     * drop the inline default and hand the property back to the stylesheet —
     * which is the dependency this revision exists to remove.
     */
    const syncPin = () => {
      if (enabled()) {
        geo = geometry();
        if (!pinned) {
          pinned = true;
          doc.classList.add(PIN_CLASS);
          section.style.position = "sticky";
        }
      } else if (pinned) {
        pinned = false;
        doc.classList.remove(PIN_CLASS);
        section.style.position = "relative";
        resetDock();
        if (scrollPaused) {
          scrollPaused = false;
          syncPausedAttr();
        }
      }
    };

    syncPin();
    syncPausedAttr();
    setPauseLabel();


    // resize, not scroll: `addEventListener("scroll", …)` is banned outright and
    // would be pointless here — the frame loop already has the value.
    window.addEventListener("resize", syncPin);

    /*
     * NOTHING LOOPS UNDER REDUCED MOTION — and `check:raf` is what caught this.
     *
     * The audit counts rAF callbacks at idle with Lenis unmounted, which is the
     * reduced-motion case, and the count must be zero. A `keepAlive` callback on
     * Motion's loop keeps that loop alive whether or not it does any work, so
     * attaching unconditionally put 180 callbacks per three seconds into a mode
     * that has no animation at all.
     *
     * And it genuinely has nothing to drive: §9 turns off the auto-advance, the
     * pin and the parallax, which is everything this callback does. The slides
     * still change — by a CSS crossfade, from a tick click — and that needs no
     * loop of any kind.
     */
    if (!reduced) frame.update(update, true);

    return () => {
      cancelFrame(update);
      if (exitTimer) clearTimeout(exitTimer);
      if (printTimer) clearTimeout(printTimer);
      window.removeEventListener("load", scheduleWarm);
      if (idle) {
        if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle);
        else clearTimeout(idle);
      }
      for (const t of ticks) t.removeEventListener("click", onTick);
      pauseBtn?.removeEventListener("click", onPause);
      section.removeEventListener("pointerenter", onEnter);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("focusin", onEnter);
      section.removeEventListener("focusout", onLeave);
      section.removeEventListener("keydown", onKey);
      section.removeEventListener("touchstart", onTouchStart);
      section.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", syncPin);
      doc.classList.remove(PIN_CLASS);
      section.style.position = "relative";
      section.classList.remove(PRINT_CLASS);
      for (const el of lines) el.style.display = "";
      if (ticksRow) ticksRow.style.display = "";
      overlayHeader?.removeAttribute("data-cover-tone");
      resetDock();
    };
  }, [count, isStatic]);

  /*
   * THE SPACER IS A FIXED HEIGHT IN CSS — 160svh, applied by the pin class.
   *
   * Nothing here drives height or position from JavaScript. That is what keeps
   * CLS at zero: the spacer's height is present at first paint, because the pin
   * class is set by a tiny pre-paint script in the site layout rather than by
   * this effect. If it were added on hydration the whole page below the cover
   * would jump 60svh on load.
   */
  return (
    <div ref={rootRef} data-hero-spacer data-cover-scripted={live ? "" : undefined}>
      {children}
    </div>
  );
}

export default CoverStage;
