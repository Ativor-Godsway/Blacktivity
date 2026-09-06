"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cancelFrame, frame } from "motion/react";
import Lenis from "lenis";

/**
 * Lenis smooth scroll, mounted ONCE for the public site.
 *
 * Three things here are deliberate and load-bearing:
 *
 *  - It shares Motion's frame loop rather than opening a second
 *    requestAnimationFrame. Two independent RAF loops make scrolling feel
 *    doubled and heavy, and waste a frame's budget every frame.
 *  - `syncTouch` is off and Lenis is skipped entirely on coarse pointers.
 *    Native touch scrolling is already hardware-accelerated; Lenis' touch sync
 *    is the usual cause of mobile scroll feeling laggy and disconnected.
 *  - `autoRaf: false`, so Lenis never starts a loop of its own.
 *
 * SCROLL POSITION ON NAVIGATION
 *
 * Lenis owns the scroll position, and Next's App Router resets scroll by
 * calling window.scrollTo — which Lenis does not observe. Its internal position
 * therefore survived the navigation and a new page rendered wherever the last
 * one had been left. Lenis has to be told directly.
 *
 * Forward navigations go to the top; BACK AND FORWARD RESTORE the previous
 * position, because a reader who opens an article from halfway down the index
 * expects to land back where they were. The distinction is made by watching
 * popstate: a pathname change that follows one is a history navigation, and its
 * position is restored from what we recorded on the way out.
 *
 * The outgoing position is captured ON THE CLICK, before navigation starts.
 * That is the only deterministic moment: by the time the pathname effect runs,
 * Next's own scroll reset may already have landed and Lenis synced to it, so
 * reading the offset there returned zero. Reading it from Lenis' emitter was
 * no better — that only fires for scrolling Lenis itself drives.
 *
 * One layout read per click is fine; what `audit:perf` forbids is a read per
 * scroll event, which is why there is no scroll listener here.
 *
 * When Lenis is NOT mounted — touch, or reduced motion — none of this applies:
 * scroll restoration is left on `auto` and the browser does the right thing on
 * its own. There is nothing for Lenis to disagree with.
 *
 * If this ever stops feeling right, delete it. Native scroll that is instant
 * beats smooth scroll that lags.
 *
 * HASH ARRIVALS (Revision 14 §3)
 *
 * The homepage's three doors link to /rotation#new-music, #chart and #curation.
 * The native anchor jump works on its own with JavaScript disabled — that is
 * the baseline, and it is not negotiable — but LENIS FIGHTS IT. Lenis
 * initialises after paint with an internal position of 0, so the browser lands
 * on the section and Lenis immediately yanks the page back to the top. The same
 * happens on a client-side navigation, where the effect below would otherwise
 * scroll to 0 unconditionally.
 *
 * So both paths check the hash and re-apply the target through Lenis itself.
 *
 * `immediate: true`, deliberately: the reader asked to ARRIVE at a section, not
 * to watch a 600ms flight past two sections they did not choose. Arriving
 * instantly is the correct behaviour here, and it is what reduced motion would
 * demand anyway.
 *
 * `anchors: true` handles SAME-PAGE anchor clicks, which do animate normally —
 * only the cross-page arrival is immediate.
 *
 * The hash is set on entry and then LEFT ALONE. There is deliberately no
 * scroll-spy here: rewriting the hash as the reader scrolls turns the back
 * button into a scroll-position undo, which is the single most annoying thing
 * a long page can do.
 */
/**
 * Sends Lenis to the element named by the current hash, if there is one and it
 * exists. Returns whether it did, so callers can fall back to their own target.
 *
 * `scroll-margin-top` on the target is honoured by Lenis, so the section
 * heading clears the top of the viewport by the same amount here as it does on
 * the native jump.
 */
function scrollToHash(lenis: Lenis): boolean {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return false;

  let el: Element | null = null;
  try {
    el = document.querySelector(hash);
  } catch {
    // A hash that is not a valid selector is not an error, just not a target.
    return false;
  }
  if (!(el instanceof HTMLElement)) return false;

  lenis.scrollTo(el, { immediate: true });

  /**
   * AND AGAIN ONCE THE FONTS HAVE SWAPPED.
   *
   * The first call measures the element against the FALLBACK font's metrics.
   * The masthead headline is display serif at up to 9rem, so when Zodiak swaps
   * in, everything below it moves — #curation landed 77px short of its mark on
   * exactly this. The browser re-anchors a native fragment jump on its own;
   * Lenis, which has taken the scroll position over, does not.
   *
   * Both calls are `immediate`, so this reads as arriving in the right place
   * rather than as a correction — and it only ever fires while the reader is
   * still at the position the first call set, never mid-scroll.
   */
  if (typeof document !== "undefined" && "fonts" in document) {
    const settled = lenis.scroll;
    void document.fonts.ready.then(() => {
      // If the reader has already started scrolling, their position wins.
      if (Math.abs(lenis.scroll - settled) > 4) return;
      lenis.scrollTo(el as HTMLElement, { immediate: true });
    });
  }

  return true;
}

export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  /** Scroll offset per history entry, so back/forward can restore it. */
  const positions = useRef(new Map<string, number>());
  const poppedRef = useRef(false);
  const currentPath = useRef(pathname);

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Without Lenis the browser's own restoration is correct — leave it alone.
    if (isTouch || reduced) return;

    // With Lenis mounted the two would disagree, so take it over.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const onPop = () => { poppedRef.current = true; };
    window.addEventListener("popstate", onPop);

    // Capture phase, so it runs before Next's <Link> begins the navigation.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      // layout-read-ok: once per click, never on a scroll or per-frame path
      positions.current.set(currentPath.current, window.scrollY);
    };
    document.addEventListener("click", onClick, true);

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
      // Same-page anchors animate; the cross-page arrival below does not.
      anchors: true,
    });
    lenisRef.current = lenis;

    const update = (data: { timestamp: number }) => lenis.raf(data.timestamp);
    frame.update(update, true);

    // A direct load of /rotation#chart: the browser has already jumped, and
    // Lenis is about to undo it. Re-apply the target through Lenis so the two
    // agree, after the first frame so layout and fonts have settled.
    const hashFrame = requestAnimationFrame(() => scrollToHash(lenis));

    return () => {
      cancelAnimationFrame(hashFrame);
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick, true);
      cancelFrame(update);
      lenis.destroy();
      lenisRef.current = null;
      if ("scrollRestoration" in history) history.scrollRestoration = "auto";
    };
  }, []);

  useEffect(() => {
    if (currentPath.current === pathname) return;

    const wasPop = poppedRef.current;
    poppedRef.current = false;

    currentPath.current = pathname;

    const target = wasPop ? (positions.current.get(pathname) ?? 0) : 0;

    // After the new route has committed and painted.
    const id = requestAnimationFrame(() => {
      const lenis = lenisRef.current;
      // Only meaningful while Lenis is mounted; otherwise the browser has
      // already handled it.
      if (!lenis) return;

      // A forward navigation carrying a hash lands at that section, not at the
      // top. A back/forward restores its recorded offset regardless — the
      // reader's previous position beats the URL's opinion.
      if (!wasPop && scrollToHash(lenis)) return;

      lenis.scrollTo(target, { immediate: true });
    });

    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}

export default SmoothScroll;
