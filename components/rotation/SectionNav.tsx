"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * THE STICKY SECTION NAV — Revision 17 §3.2.
 *
 * The same three anchors the homepage poster links to (Revision 14 §3), so a
 * deep link lands on a page that then shows the reader where they are.
 *
 * THE URL HASH IS NEVER REWRITTEN. Revision 14 §3 forbids scroll-spy that
 * pushes history, and the reason has not changed: it turns the back button
 * into a scroll-position undo, which is the most annoying thing a long page
 * can do. The active state is component state and nothing else — no
 * `history.replaceState`, no `location.hash =`.
 *
 * ONE IntersectionObserver, no scroll listener, exactly as §1's header
 * inversion does it — so this adds no per-frame work and the single-rAF-loop
 * rule is untouched.
 *
 * The nav renders its links from the server with no active item, so with
 * JavaScript off it is still three working anchors; only the underline is
 * enhancement.
 */
const SECTIONS = [
  { id: "new-music", label: "New Music" },
  { id: "chart", label: "The Chart" },
  { id: "curation", label: "Creators Curation" },
] as const;

export function SectionNav({ present }: { present: string[] }) {
  const items = SECTIONS.filter((s) => present.includes(s.id));
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const targets = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    /*
     * The band sits just under the sticky nav itself. A section counts as
     * "current" once its heading has passed beneath the nav, which is what a
     * reader means by being in a section — not when its top edge first appears
     * at the bottom of the screen.
     */
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Document order wins when two sections straddle the band, so the nav
        // never flickers between them.
        const current = items.find((i) => visible.has(i.id));
        if (current) setActive(current.id);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );

    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
    // `present` is derived from the volume, so this re-registers per volume.
  }, [present.join(",")]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Rotation sections"
      /* Solid --bg, not a translucent one. `backdrop-blur` is banned outright
         by audit:perf (Revision 06 §5) and a semi-transparent bar with no blur
         just makes the cards smear through it as they pass underneath. */
      className="sticky top-0 z-30 border-b border-rule bg-bg"
    >
      <ul className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-8 gap-y-2 px-(--gutter) py-4">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "true" : undefined}
              className={cn(
                "mono inline-block border-b py-1 transition-colors duration-300 ease-[var(--ease-expo)]",
                active === item.id
                  ? "border-fg text-fg"
                  : "border-transparent text-fg-dim hover:text-fg",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default SectionNav;
