"use client";

import { useEffect, useState } from "react";
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
  const [ready, setReady] = useState(false);
  const Tag = as;
  // motion() is deprecated in favour of motion.create().
  const MotionTag = motion.create(Tag as ElementType);

  useEffect(() => setReady(true), []);

  // Motion writes `initial` into the server markup, so an `opacity: 0` start
  // means the content is invisible to anything that does not run JavaScript —
  // a failed script, a bot, a reader with it turned off. The animated element
  // is therefore only mounted after hydration; the server sends the finished
  // state. `npm run audit:text` enforces this.
  if (reduced || !ready) return <Tag className={className}>{children}</Tag>;

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
