"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_EXPO } from "./motion-config";

/**
 * Word-by-word reveal for SHORT DISPLAY TEXT ONLY — section headings, the
 * About lead line, the submission CTA. Never article body copy.
 *
 * BUILT ON MOTION, NOT GSAP + ScrollTrigger. Motion is already in the bundle
 * and already shares the site's single frame loop with Lenis, which removes
 * three of the four defects in the proposed component outright:
 *
 *  - No `filter: blur()` anywhere. Animated filters are not
 *    compositor-accelerated and `audit:perf` forbids them; the audit does not
 *    get relaxed for a component. This animates transform and opacity only.
 *  - No global teardown. The proposed cleanup called
 *    `ScrollTrigger.getAll().forEach(t => t.kill())`, which destroys every
 *    other component's triggers too. There is no shared registry here.
 *  - No second rAF and no Lenis desync, because there is no second library.
 *
 * The fourth defect is fixed twice over. `baseOpacity: 0.1` leaves text
 * unreadable if the trigger never fires — a JS failure, a scroll-container
 * mismatch, a bot — and Lighthouse scores the resting state, so a faded start
 * is a real contrast failure, not a theoretical one. So: OPACITY IS NEVER
 * ANIMATED HERE. Each word is masked by an overflow-hidden box and translated
 * into place at full opacity, which is the same vocabulary the display
 * headings already use. On top of that the animated spans mount only after
 * hydration, so the server sends the finished sentence.
 *
 * Takes a string, deliberately: rendered rich content is not valid input.
 */
export function ScrollReveal({
  text,
  as: Tag = "span",
  className,
  stagger = 0.045,
}: {
  text: string;
  as?: "span" | "h2" | "p";
  className?: string;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const words = text.split(" ");

  useEffect(() => setReady(true), []);

  // The server — and any client without JS — gets the finished sentence.
  if (reduced || !ready) return <Tag className={className}>{text}</Tag>;

  return (
    <Tag className={className}>
      {/* One accessible copy of the whole line; the animated words are hidden
          from assistive technology so it is not read one word at a time. */}
      <span className="sr-only">{text}</span>

      <span aria-hidden="true">
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: "110%" }}
              whileInView={{ y: "0%" }}
              viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
              transition={{ duration: 0.55, ease: EASE_EXPO, delay: i * stagger }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}

export default ScrollReveal;
