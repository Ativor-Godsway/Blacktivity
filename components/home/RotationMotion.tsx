"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cancelFrame, frame } from "motion/react";

/**
 * THE ROTATION SECTION'S MOTION — Revision 20 §6.
 *
 * Revision 16 §6 said this section must not move: "no parallax, no
 * scroll-linked transform, no float loop", because the homepage's one signature
 * gesture is the cover and this section should not compete with it. Revision 20
 * withdraws that FOR THIS SECTION, because the owner asked for it animated and
 * interactive. The reasoning it overturned is still worth knowing — that is why
 * everything here stops the moment the section leaves the viewport.
 *
 * WHAT STILL HOLDS, and is not up for negotiation:
 *
 *   - ONE rAF LOOP. This is a callback on Motion's shared frame loop, the same
 *     one SmoothScroll drives Lenis from. Not a second requestAnimationFrame,
 *     not a ScrollTrigger. `check:raf` asserts nothing loops at rest.
 *   - TRANSFORM AND OPACITY ONLY. No filter, clip-path, mask-position,
 *     background-position, width, height or margin is animated anywhere here.
 *     The spotlight is an ELEMENT THAT MOVES rather than a gradient whose
 *     position is animated — `background-position` is a paint property and
 *     animating it repaints a full-viewport layer every frame.
 *   - NO LAYOUT READS IN THE LOOP. `audit:perf` bans getBoundingClientRect,
 *     offsetTop and scrollHeight. The section's position is read ONCE per
 *     resize, outside the loop, and the loop does arithmetic on scrollY.
 *   - REDUCED MOTION STOPS EVERYTHING. Nothing below is attached at all.
 *
 * THE LOOP SLEEPS WHEN THE SECTION IS OFF SCREEN. The same
 * IntersectionObserver that fires the enter sequence detaches the frame
 * callback on the way out and re-attaches on the way in, so a reader three
 * screens away pays nothing for any of this.
 */

/** §6.1 — the sequence fires once, when this much of the section is visible. */
const ENTER_RATIO = 0.25;
/** §6.3 — the photo layer's pointer travel, and the type layer's, in px. */
const PHOTO_SHIFT = 14;
const TYPE_SHIFT = 5;
/** §6.3 — how close the cursor must be to the button for it to lean over. */
const MAGNET_RANGE = 80;
const MAGNET_PULL = 6;
/** §6.3 — how far a letter lifts under the cursor, and how far the effect reaches. */
const LETTER_LIFT = 6;
const LETTER_RANGE = 120;

/* --- the record's rotation — Revision 21 §5.3 ---------------------------- */
/** Idle: one turn every 12 seconds. */
const SPIN_IDLE = 360 / 12000;
/** Hover: 33 1/3 rpm — one turn per 1.8s, the speed an LP actually plays at. */
const SPIN_PLAY = 360 / 1800;
/** How quickly the record reaches the speed it is asked for, per millisecond.
 *  Spinning UP is quicker than spinning down, the way a turntable behaves:
 *  the motor drives it up and friction brings it back. §5.3 asks for 600ms up
 *  and 1200ms down, and these are the damping constants that produce that. */
const SPIN_UP = 0.0045;
const SPIN_DOWN = 0.0022;
/** Scroll adds a flick, clamped so a fast scroll cannot send it spinning. */
const SPIN_SCROLL_GAIN = 0.02;
const SPIN_SCROLL_MAX = SPIN_PLAY * 1.5;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function RotationMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const section = root.querySelector<HTMLElement>("[data-rotation]");
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const photo = section.querySelector<HTMLElement>("[data-rotation-photo]");
    const imageBox = section.querySelector<HTMLElement>(".rotation-image-box");
    const type = section.querySelector<HTMLElement>("[data-rotation-type]");
    const word = section.querySelector<HTMLElement>("[data-rotation-word]");
    const meta = section.querySelector<HTMLElement>("[data-rotation-meta]");
    const spotlight = section.querySelector<HTMLElement>("[data-rotation-spotlight]");
    const button = section.querySelector<HTMLElement>("[data-rotation-button]");
    const letters = Array.from(section.querySelectorAll<HTMLElement>(".rotation-letter"));
    /* The two drawn layers over the painted record — §5. They turn together and
       share one angle, because they are two halves of one object. */
    const spinners = Array.from(
      section.querySelectorAll<HTMLElement>("[data-rotation-disc], [data-rotation-label]"),
    );

    /*
     * §6.1's meta lines are staggered by a CSS delay keyed off `--i`, and the
     * markup cannot know its own index. Setting it here is the one DOM write
     * that happens outside the loop, once.
     */
    section.querySelectorAll<HTMLElement>(".rotation-meta-line").forEach((el, i) => {
      el.style.setProperty("--i", String(i));
    });

    /*
     * REDUCED MOTION: attach NOTHING. Not a loop that does nothing, not an
     * observer that sets a class the stylesheet ignores — nothing. The section
     * renders in its resting state, which is what the markup already is, and
     * `check:raf` stays at zero callbacks.
     */
    if (reduced) return;

    /* ------------------------------------------------------------------ *
     * GEOMETRY — read once per resize, never in the loop.
     * ------------------------------------------------------------------ */
    let sectionTop = 0;
    let sectionHeight = 0;

    const measure = () => {
      /*
       * The one layout read, and it is deliberately outside the frame callback.
       * `audit:perf` bans reads inside the loop because that is what turns a
       * compositor animation into a 30fps one; a read on resize is free.
       */
      // layout-read-ok: once on mount and once per resize, never per frame
      const rect = section.getBoundingClientRect();
      sectionTop = rect.top + window.scrollY;
      sectionHeight = rect.height;
    };
    measure();

    /* ------------------------------------------------------------------ *
     * POINTER STATE — §6.3
     * ------------------------------------------------------------------ */
    const parallax = finePointer;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    /** Cursor position in section-local pixels, for the spotlight and letters. */
    let localX = 0;
    let localY = 0;
    let pointerInside = false;

    const onPointerMove = (e: PointerEvent) => {
      // clientX/Y and innerWidth/Height are not layout reads — they force
      // neither style nor layout, unlike an element's bounding rect.
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      targetX = (e.clientX / vw) * 2 - 1;
      targetY = (e.clientY / vh) * 2 - 1;
      localX = e.clientX;
      localY = e.clientY + window.scrollY - sectionTop;
    };

    /* ------------------------------------------------------------------ *
     * THE RECORD'S ROTATION — §5.3
     *
     * One angle, advanced by a speed that is itself eased towards a target.
     * That second-order shape is what makes it read as a turntable rather than
     * as a value being animated: asking for 33 1/3 rpm does not snap to it, it
     * winds up to it.
     * ------------------------------------------------------------------ */
    let angle = 0;
    let spin = 0;
    let spinTarget = 0;
    /*
     * TWO SEPARATE HOVERS, OR-ed — §5.3 spins the record up for the LISTEN
     * button OR the record itself.
     *
     * THE RECORD IS NOT A HOVER TARGET, and that is why it is tracked by
     * geometry rather than by a listener. The disc layer is
     * `pointer-events: none` so it can never eat a click, and the type layer
     * above it covers the whole section — so `pointerenter` on the image box
     * never fires. Measured: hovering the record left it at 30 deg/s while the
     * button correctly took it to 199.
     *
     * Testing the cursor against the record's CIRCLE is also more accurate than
     * any rectangle would have been. The centre and radius come from the same
     * percentages the layers are positioned with, read off the element, so
     * there is no second copy of the geometry to drift.
     */
    let hoveringButton = false;
    let hoveringDisc = false;
    let lastScrollY = window.scrollY;

    const onRecordEnter = () => { hoveringButton = true; };
    const onRecordLeave = () => { hoveringButton = false; };

    const onEnter = () => {
      pointerInside = true;
      section.setAttribute("data-pointer", "");
    };
    const onLeave = () => {
      pointerInside = false;
      section.removeAttribute("data-pointer");
      targetX = 0;
      targetY = 0;
    };

    /* ------------------------------------------------------------------ *
     * THE ONE FRAME CALLBACK
     * ------------------------------------------------------------------ */
    let lastS = -1;

    const update = ({ delta }: { delta: number }) => {
      /* --- §6.2: scroll-linked depth --------------------------------- */
      // s = 0 when the section's top enters the bottom of the viewport,
      // s = 1 when its bottom leaves the top. Pure arithmetic on scrollY.
      const vh = window.innerHeight;
      const span = sectionHeight + vh;
      const s = span > 0 ? clamp01((window.scrollY + vh - sectionTop) / span) : 0;

      if (s !== lastS) {
        lastS = s;
        if (photo) {
          // scale 1.04 -> 1.0 and translateY -4% -> 4%: slow depth against the
          // page. Composed into ONE transform because an element has one.
          photo.style.transform =
            `translate3d(${-curX * PHOTO_SHIFT}px, ${(-4 + 8 * s).toFixed(3)}%, 0) ` +
            `scale(${(1.04 - 0.04 * s).toFixed(4)})`;
        }
        if (word) word.style.transform = `translate3d(${(-2 + 4 * s).toFixed(3)}%, 0, 0)`;
        if (meta) meta.style.transform = `translate3d(0, ${(8 - 16 * s).toFixed(2)}px, 0)`;
      }

      /* --- §5.3: the record turns -------------------------------------- */
      if (spinners.length) {
        /*
         * Scroll VELOCITY, not position: a flick is proportional to how fast
         * the page moved since the last frame. window.scrollY is a read, but
         * not one of the three the audit bans, and it is the cheap one.
         */
        const dy = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;

        spinTarget = hoveringButton || hoveringDisc ? SPIN_PLAY : SPIN_IDLE;
        // Clamped, so a trackpad flick adds character rather than a blur.
        const flick = Math.max(
          -SPIN_SCROLL_MAX,
          Math.min(SPIN_SCROLL_MAX, dy * SPIN_SCROLL_GAIN * 0.06),
        );

        // Ease the SPEED towards its target, then advance the angle by it.
        const rate = spinTarget > spin ? SPIN_UP : SPIN_DOWN;
        const k = 1 - Math.pow(1 - rate, delta);
        spin = spin + (spinTarget - spin) * k;

        angle = (angle + (spin + flick) * delta) % 360;
        for (const el of spinners) {
          el.style.transform = `translate(-50%, -50%) rotate(${angle.toFixed(2)}deg)`;
        }
      }

      /* --- §6.3: pointer ---------------------------------------------- */
      if (!parallax) return;

      // Damped towards the cursor, scaled by the real delta so the feel holds
      // at 60Hz and at 120Hz alike.
      const t = 1 - Math.pow(1 - 0.08, delta / 16.7);
      const nx = lerp(curX, targetX, t);
      const ny = lerp(curY, targetY, t);
      const moved = Math.abs(nx - curX) > 0.0005 || Math.abs(ny - curY) > 0.0005;
      curX = nx;
      curY = ny;

      if (moved) {
        if (photo) {
          photo.style.transform =
            `translate3d(${-curX * PHOTO_SHIFT}px, ${(-4 + 8 * s).toFixed(3)}%, 0) ` +
            `scale(${(1.04 - 0.04 * s).toFixed(4)})`;
        }
        // The type layer moves WITH the cursor while the photo moves against
        // it — that opposition is what reads as depth rather than as drift.
        if (type) {
          type.style.transform = `translate3d(${curX * TYPE_SHIFT}px, ${curY * TYPE_SHIFT}px, 0)`;
        }
      }

      if (!pointerInside) {
        hoveringDisc = false;
        return;
      }

      /* §5.3: is the cursor on the record? A circle test, in section-local px. */
      hoveringDisc =
        discCentre.r > 0 &&
        Math.hypot(localX - discCentre.x, localY - discCentre.y) <= discCentre.r;

      // The spotlight: one element, moved. Never a gradient position.
      if (spotlight) {
        spotlight.style.transform = `translate3d(${localX}px, ${localY}px, 0)`;
      }

      /*
       * §6.3: the letters react, falling off with distance.
       *
       * Each letter's centre is derived from its INDEX and the word's own
       * metrics rather than from a rect per letter per frame — eleven
       * getBoundingClientRect calls every frame is exactly the layout thrash
       * the audit bans. `offsetLeft`/`offsetWidth` are read once, on enter and
       * on resize, and cached below.
       */
      for (let i = 0; i < letters.length; i++) {
        const el = letters[i];
        const cx = letterCentres[i];
        if (cx === undefined) continue;
        const d = Math.abs(localX - cx);
        if (d > LETTER_RANGE) {
          if (letterState[i] !== "") {
            letterState[i] = "";
            el.style.transform = "";
          }
          continue;
        }
        const falloff = 1 - d / LETTER_RANGE;
        const lift = -LETTER_LIFT * falloff;
        // Alternating tilt, so neighbouring letters lean apart rather than all
        // leaning the same way — which would read as the word sliding.
        const rot = (i % 2 === 0 ? 3 : -3) * falloff;
        const next = `translate3d(0, ${lift.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
        if (next !== letterState[i]) {
          letterState[i] = next;
          el.style.transform = next;
        }
      }

      /* §6.3: the magnetic button. */
      if (button) {
        const bx = buttonCentre.x;
        const by = buttonCentre.y;
        const dx = localX - bx;
        const dy = localY - by;
        const dist = Math.hypot(dx, dy);
        if (dist < MAGNET_RANGE) {
          const pull = (1 - dist / MAGNET_RANGE) * MAGNET_PULL;
          const k = dist === 0 ? 0 : pull / dist;
          button.style.transform = `translate3d(${(dx * k).toFixed(2)}px, ${(dy * k).toFixed(2)}px, 0)`;
        } else if (button.style.transform) {
          button.style.transform = "";
        }
      }
    };

    /*
     * THE LAST TRANSFORM WRITTEN PER LETTER.
     *
     * Each letter carries a --black `-webkit-text-stroke`, and STROKED TEXT
     * REPAINTS WHENEVER ITS TRANSFORM CHANGES — a rotation in particular cannot
     * be served from a cached layer the way a plain translate can. Writing all
     * eight every frame put ~420ms of Paint into a four-second trace on a 4x
     * throttled CPU.
     *
     * So a write only happens when the value actually differs at the precision
     * anyone can see: a tenth of a pixel and a hundredth of a degree. With the
     * cursor moving it changes most frames and this saves little; with the
     * cursor still — which is most of the time a reader spends here — it drops
     * to nothing.
     */
    const letterState: string[] = letters.map(() => "");

    /* --- cached positions, refreshed on resize and on pointer entry ----- */
    let letterCentres: number[] = [];
    let buttonCentre = { x: 0, y: 0 };
    let discCentre = { x: 0, y: 0, r: 0 };

    const cachePositions = () => {
      // Layout reads, outside the loop. Section-local coordinates, so they stay
      // valid as the page scrolls and only change when the layout does.
      letterCentres = letters.map((el) => {
        // layout-read-ok: cached on entry and on resize; the loop reads the array
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2;
      });
      if (button) {
        // layout-read-ok: cached on entry and on resize; the loop reads the pair
        const r = button.getBoundingClientRect();
        buttonCentre = {
          x: r.left + r.width / 2,
          y: r.top + window.scrollY - sectionTop + r.height / 2,
        };
      }

      /*
       * The record's circle, derived from the SAME inline percentages the disc
       * layer is positioned with — read off the element rather than duplicated
       * here, so the hover target cannot drift away from the thing it targets.
       */
      const discEl = section.querySelector<HTMLElement>("[data-rotation-disc]");
      if (discEl && imageBox && getComputedStyle(discEl).display !== "none") {
        // layout-read-ok: cached on entry and on resize
        const b = imageBox.getBoundingClientRect();
        const pct = (name: string) => parseFloat(discEl.style.getPropertyValue(name)) || 0;
        discCentre = {
          x: b.left + (b.width * pct("--disc-cx")) / 100,
          y: b.top + window.scrollY - sectionTop + (b.height * pct("--disc-cy")) / 100,
          r: (b.width * pct("--disc-r")) / 100,
        };
      } else {
        discCentre = { x: 0, y: 0, r: 0 };
      }
    };

    /* ------------------------------------------------------------------ *
     * VISIBILITY — the enter sequence, and the loop's on/off switch
     * ------------------------------------------------------------------ */
    let attached = false;
    let entered = false;

    const attach = () => {
      if (attached) return;
      attached = true;
      measure();
      cachePositions();
      frame.update(update, true);
      if (parallax) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        section.addEventListener("pointerenter", onEnter);
        section.addEventListener("pointerleave", onLeave);
        /*
         * §5.3: hovering the LISTEN button or the record itself spins it up.
         * The disc layer is `pointer-events: none` so it never eats a click, so
         * the hover target is the image box it sits in — which is the record's
         * half of the section and nothing else.
         */
        for (const el of [button, imageBox]) {
          if (!el) continue;
          el.addEventListener("pointerenter", onRecordEnter);
          el.addEventListener("pointerleave", onRecordLeave);
        }
      }
      lastScrollY = window.scrollY;
    };

    const detach = () => {
      if (!attached) return;
      attached = false;
      cancelFrame(update);
      window.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerenter", onEnter);
      section.removeEventListener("pointerleave", onLeave);
      for (const el of [button, imageBox]) {
        if (!el) continue;
        el.removeEventListener("pointerenter", onRecordEnter);
        el.removeEventListener("pointerleave", onRecordLeave);
      }
      hoveringButton = false;
      hoveringDisc = false;
      onLeave();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // §6.1 fires once and stays fired: `data-entered` is never removed,
            // so scrolling back up does not replay the sequence.
            if (!entered && entry.intersectionRatio >= ENTER_RATIO) {
              entered = true;
              section.setAttribute("data-entered", "");
            }
            attach();
          } else {
            detach();
          }
        }
      },
      { threshold: [0, ENTER_RATIO] },
    );
    observer.observe(section);

    const onResize = () => {
      measure();
      if (attached) cachePositions();
    };
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      detach();
      section.removeAttribute("data-entered");
      section.removeAttribute("data-pointer");
      for (const el of [photo, type, word, meta, spotlight, button, ...spinners]) {
        if (el) el.style.transform = "";
      }
      for (const el of letters) el.style.transform = "";
      letterState.fill("");
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}

export default RotationMotion;
