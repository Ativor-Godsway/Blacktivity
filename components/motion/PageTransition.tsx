"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EASE_EXPO } from "./motion-config";

/**
 * A black wipe on route change, ~450ms.
 *
 * The overlay is mounted ONLY after a navigation actually happens, and the
 * children are never wrapped in an animated opacity.
 *
 * The previous version did both of those things — the panel rendered at
 * `scaleY: 1` and the content at `opacity: 0` — which meant the server-rendered
 * HTML was a full-viewport black rectangle over invisible content until React
 * hydrated. First paint was a black screen, and the LCP element could not
 * register until hydration finished: FCP 0.9s, LCP 2.85s on a throttled phone,
 * with the image bytes on disk the whole time.
 *
 * Anything that covers or hides the document must therefore be mounted by an
 * effect, never rendered on the server.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  const previousPath = useRef(pathname);
  const [wipeFor, setWipeFor] = useState<string | null>(null);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    setWipeFor(pathname);
  }, [pathname]);

  if (reduced) return <>{children}</>;

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {wipeFor === pathname ? (
          <motion.div
            key={pathname}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50 bg-espresso"
            initial={{ scaleY: 1, originY: 0 }}
            animate={{ scaleY: 0, originY: 0 }}
            exit={{ scaleY: 0 }}
            transition={{ duration: 0.45, ease: EASE_EXPO }}
          />
        ) : null}
      </AnimatePresence>

      {children}
    </>
  );
}

export default PageTransition;
