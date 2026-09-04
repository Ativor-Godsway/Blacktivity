"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ElementType } from "react";
import { DURATION, EASE_EXPO, STAGGER, VIEWPORT } from "./motion-config";
import { cn } from "@/lib/utils";

/**
 * Masked line reveal. Lines are author-supplied so the break points are a
 * typographic decision, not a measurement accident — and deliberately NOT
 * letter-by-letter, which is a 2019 tell.
 */
export function DisplayHeading({
  lines,
  as: Tag = "h2",
  className,
  delay = 0,
}: {
  lines: string[];
  as?: ElementType;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  // motion() is deprecated in favour of motion.create().
  const MotionTag = motion.create(Tag as ElementType);

  useEffect(() => setReady(true), []);

  // A line translated 110% inside an overflow-hidden mask sits entirely outside
  // its own box — invisible, though still selectable, to anything that does not
  // run JavaScript. The masked version therefore mounts only after hydration
  // and the server sends the finished heading. `npm run audit:text` enforces it.
  if (reduced || !ready) {
    return (
      <Tag className={cn("display", className)}>
        {lines.map((line) => (
          <span className="block" key={line}>
            {line}
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <MotionTag
      className={cn("display", className)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      transition={{ staggerChildren: STAGGER, delayChildren: delay }}
    >
      {lines.map((line) => (
        <span className="line-mask" key={line}>
          <motion.span
            className="block"
            variants={{ hidden: { y: "110%" }, visible: { y: "0%" } }}
            transition={{ duration: DURATION.slow, ease: EASE_EXPO }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

export default DisplayHeading;
