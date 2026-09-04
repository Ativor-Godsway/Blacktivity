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
 */
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
    });
    lenisRef.current = lenis;

    const update = (data: { timestamp: number }) => lenis.raf(data.timestamp);
    frame.update(update, true);

    return () => {
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
      // Only meaningful while Lenis is mounted; otherwise the browser has
      // already handled it.
      lenisRef.current?.scrollTo(target, { immediate: true });
    });

    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}

export default SmoothScroll;
