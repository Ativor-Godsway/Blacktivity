"use client";

import { motion, useScroll, useReducedMotion } from "motion/react";

/** A thin rule pinned to the top. scaleX only — never width. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: scrollYProgress, originX: 0 }}
      className="fixed inset-x-0 top-0 z-50 h-px bg-fg"
    />
  );
}

export default ScrollProgress;
