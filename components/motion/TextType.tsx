"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Typewriter, for one short line. Deliberately constrained:
 *
 *  - NEVER on an h1 or anything that matters for SEO. It renders client-side
 *    from empty, so the crawled HTML would contain no heading at all. `as`
 *    only accepts inline/paragraph tags for that reason.
 *  - The space is RESERVED. A line that grows character by character reflows
 *    the page on every keystroke and destroys CLS, so a hidden full-width copy
 *    holds the box open and the animated text is absolutely positioned over it.
 *  - Screen readers get the finished string once, not one character at a time.
 *  - `loop` defaults to false. A looping typewriter runs timers and re-renders
 *    for as long as the tab is open and never lets the page settle.
 *  - Under reduced motion, and with JavaScript disabled, the full text is
 *    simply present.
 */
export function TextType({
  text,
  as: Tag = "span",
  className,
  speed = 45,
  startDelay = 300,
  loop = false,
}: {
  text: string;
  as?: "span" | "p";
  className?: string;
  speed?: number;
  startDelay?: number;
  loop?: boolean;
}) {
  const reduced = useReducedMotion();
  // Starts FULL so the server markup contains the whole line; the effect winds
  // it back to zero before typing. Rendering from empty would mean no text at
  // all without JavaScript.
  const [shown, setShown] = useState(text.length);
  // The caret only exists once typing is actually running: without JS it would
  // otherwise render as a stray pipe after the line, and once the line is
  // finished a forever-pulsing caret never lets the page settle.
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduced || !text) return;

    let i = 0;
    let cancelled = false;
    setShown(0);
    setTyping(true);

    const tick = () => {
      if (cancelled) return;
      i += 1;
      setShown(i);
      if (i < text.length) {
        timer.current = setTimeout(tick, speed);
      } else if (!loop) {
        setTyping(false);
      } else if (loop) {
        timer.current = setTimeout(() => {
          if (cancelled) return;
          i = 0;
          setShown(0);
          timer.current = setTimeout(tick, speed);
        }, 2400);
      }
    };

    timer.current = setTimeout(tick, startDelay);
    return () => {
      cancelled = true;
      setTyping(false);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, speed, startDelay, loop, reduced]);

  if (reduced) return <Tag className={className}>{text}</Tag>;

  return (
    <Tag className={cn("relative inline-block", className)}>
      {/* Reserves the exact final box — no reflow as characters arrive. */}
      <span aria-hidden="true" className="invisible">
        {text}
      </span>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="absolute inset-0">
        {text.slice(0, shown)}
        {typing ? <span className="animate-pulse">|</span> : null}
      </span>
    </Tag>
  );
}

export default TextType;
