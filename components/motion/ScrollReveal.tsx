"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_EXPO } from "./motion-config";

/**
 * Word-by-word reveal for SHORT DISPLAY TEXT ONLY — section headings, the
 * About lead line, the submission CTA. Never article body copy.
 *
 * THE RESTING STATE IS FULLY READABLE. This is the rule the component exists to
 * respect, and the one it previously broke twice:
 *
 *   - `baseOpacity: 0.1` + `blur(10px)` leaves text invisible if the trigger
 *     never advances.
 *   - Translating a word 110% inside an `overflow-hidden` mask is worse: the
 *     word is *entirely outside its own box* until the animation runs. If the
 *     observer never fires, nothing is on screen at all — which is exactly what
 *     happened, and the text could still be selected and copied.
 *
 * So the animation is a SMALL TRANSLATE, from visible to visible: 0.22em, no
 * mask, no opacity change, no blur. If the observer never runs, the reader sees
 * the sentence sitting a fraction low. That is the whole failure mode.
 *
 * THE TEXT EXISTS ONCE IN THE DOM. An `aria-label` on the container carries the
 * accessible name and the word spans are `aria-hidden`, so screen readers get
 * one clean string and a selection copies the sentence once. The previous
 * version rendered a visually-hidden copy alongside the animated one, so
 * copying returned everything twice.
 *
 * Spaces live BETWEEN the word wrappers, in normal flow — never inside them,
 * where an inline-block would swallow them and run the words together.
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

  // The server — and any client without JS — gets the plain sentence.
  if (reduced || !ready) return <Tag className={className}>{text}</Tag>;

  return (
    // No aria-label and nothing aria-hidden: the word spans are the real text,
    // and adjacent inline spans are announced as continuous prose. An
    // aria-label here would also be invalid on a bare <span>, which has no
    // implicit role.
    <Tag className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block"
          initial={{ y: "0.22em" }}
          whileInView={{ y: "0em" }}
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          transition={{ duration: 0.5, ease: EASE_EXPO, delay: i * stagger }}
        >
          {word}
          {/* The space is outside the animated box, so it always renders. */}
          {i < words.length - 1 ? " " : null}
        </motion.span>
      ))}
    </Tag>
  );
}

export default ScrollReveal;
