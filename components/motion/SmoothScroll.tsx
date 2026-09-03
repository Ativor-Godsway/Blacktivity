"use client";

import { useEffect } from "react";
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
 * If this ever stops feeling right, delete it. Native scroll that is instant
 * beats smooth scroll that lags.
 */
export function SmoothScroll() {
  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || reduced) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
    });

    const update = (data: { timestamp: number }) => lenis.raf(data.timestamp);
    frame.update(update, true);

    return () => {
      cancelFrame(update);
      lenis.destroy();
    };
  }, []);

  return null;
}

export default SmoothScroll;
