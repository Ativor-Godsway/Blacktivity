"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ElementType, ReactNode } from "react";
import { DURATION, EASE_EXPO, VIEWPORT } from "./motion-config";

/**
 * Generic fade-and-rise on scroll-into-view. Transform + opacity only.
 *
 * `as` matters for correctness, not styling: inside a <ul> this must render an
 * <li>, or the wrapper breaks list semantics for assistive technology.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  const reduced = useReducedMotion();
  const Tag = as;
  const MotionTag = motion(Tag as ElementType);

  if (reduced) return <Tag className={className}>{children}</Tag>;

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: DURATION.base, ease: EASE_EXPO, delay }}
    >
      {children}
    </MotionTag>
  );
}

export default Reveal;
