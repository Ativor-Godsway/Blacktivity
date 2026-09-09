"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/constants";
import Wordmark from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/articles", label: "Articles" },
  { href: "/rotation", label: "Rotation" },
  { href: "/events", label: "Events" },
  { href: "/creatives", label: "Creatives" },
  { href: "/about", label: "About" },
  { href: "/submit", label: "Submit" },
];

/**
 * THE BAND THE OBSERVER WATCHES.
 *
 * A thin horizontal strip at the header's own vertical centre. Whichever
 * dark section is crossing that strip is the one currently underneath the
 * header, and therefore the one that decides whether it inverts.
 *
 * 48px is the overlay header's centre: py-5 gives 20px, and the stacked
 * wordmark (160px wide at a 4.349:1 ratio, so ~37px tall) plus its 6px gap and
 * the tagline put the middle of the block at roughly 48. It is a CONSTANT
 * rather than a measurement on purpose — audit:perf bans
 * getBoundingClientRect, and reading layout to configure a scroll-adjacent
 * observer is exactly the habit that ban exists to prevent.
 */
const BAND_CENTRE = 48;
/*
 * 1px, not 6. The band is what decides the flip, and its EDGES are where the
 * decision is made — with a 12px band the header inverted as soon as a dark
 * section reached the band's bottom lip, six pixels before that section was
 * actually under the header's centre. Measured: at one scroll position the
 * header was inverted while its centre still sat on sand.
 *
 * At 1px the flip happens within a pixel of the centre line, which is the
 * thing §1 actually asks the band to represent.
 */
const BAND_HALF = 1;

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // On the homepage the header IS the hero's top-left micro type — it overlays
  // the cover stack rather than sitting above it in a bordered bar, so the
  // brand line is never printed twice.
  const overlay = pathname === "/";

  /**
   * INVERT THE HEADER OVER DARK SECTIONS — Revision 17 §1.
   *
   * ONE IntersectionObserver, and deliberately not a scroll listener: the
   * observer is off the scroll path entirely, so this adds no per-frame work
   * and does not touch the single-rAF-loop rule. `audit:perf` bans
   * addEventListener("scroll") outright and this is the reason it can.
   *
   * The rootMargin collapses the viewport to the thin band described above:
   * negative top down to the band, negative bottom up to it. Anything marked
   * `data-surface="dark"` that intersects what is left is under the header.
   *
   * WHY IT RE-RUNS ON PATHNAME. The observed elements are page content, and on
   * a client-side navigation the old ones are gone. Re-registering per route is
   * what keeps this working on /rotation and everywhere else rather than only
   * on a hard load of the homepage.
   */
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    // Only the overlay header ever sits on top of page content. Every other
    // route's header is `relative`, scrolls away, and can never be over a dark
    // block — inverting it there would be wrong, not merely unnecessary.
    if (!overlay) {
      header.removeAttribute("data-inverted");
      return;
    }

    const targets = document.querySelectorAll('[data-surface="dark"]');
    if (targets.length === 0) {
      header.removeAttribute("data-inverted");
      return;
    }

    const dark = new Set<Element>();
    let observer: IntersectionObserver | null = null;

    const apply = () => {
      if (dark.size > 0) header.setAttribute("data-inverted", "");
      else header.removeAttribute("data-inverted");
    };

    const connect = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) dark.add(entry.target);
            else dark.delete(entry.target);
          }
          apply();
        },
        {
          rootMargin: `-${BAND_CENTRE - BAND_HALF}px 0px -${Math.max(
            window.innerHeight - BAND_CENTRE - BAND_HALF,
            0,
          )}px 0px`,
        },
      );
      for (const t of targets) observer.observe(t);
    };

    connect();

    // The bottom margin is derived from the viewport height, so the band drifts
    // off the header when the window resizes. resize, never scroll.
    const onResize = () => {
      dark.clear();
      connect();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
      header.removeAttribute("data-inverted");
    };
  }, [overlay, pathname]);

  return (
    <header
      ref={headerRef}
      /* The hook the hero's pin uses to make this header fixed and to hold its
         wordmark at opacity 0 while the giant one docks into it — Revision 15
         §2. An attribute rather than a class so the CSS reads as a statement
         about the overlay header specifically, not about a styling detail. */
      data-overlay={overlay ? "" : undefined}
      className={cn(
        "z-40",
        overlay
          ? "pointer-events-none absolute inset-x-0 top-0"
          : "relative border-b border-rule",
      )}
    >
      <div
        /* The inversion is scoped to THIS box, not to <header>. The mobile nav
           panel below is a sibling with its own --sand ground; re-pointing the
           tokens on the header itself would set that panel's links to --sand on
           --sand and hide the menu the moment it was opened over a dark
           section. */
        data-header-bar
        className={cn(
          "mx-auto flex max-w-[1600px] justify-between px-(--gutter) py-5",
          // NOT pointer-events-auto on this box. Under the hero pin the overlay
          // header is FIXED, so this 1600px-wide, ~90px-tall row sits over the
          // whole homepage for its entire length — and anything scrolling
          // beneath that band would be unclickable. Each interactive child
          // opts back in individually instead.
          overlay ? "items-start" : "items-center",
        )}
      >
        <Link
          href="/"
          className="pointer-events-auto flex w-fit flex-col gap-1.5 text-fg"
          onClick={() => setOpen(false)}
        >
          {/*
            The mark carries the accessible name. An aria-label of
            "Blacktivity — home" overrode the visible tagline text and failed
            label-content-name-mismatch: a speech-input user saying what they
            can see would not match the name.

            160px keeps the hairline "tivity" strokes above one device pixel on
            a standard-density display; below ~120px they break up.
          */}
          {/* `block`: an inline SVG picks up the line box's leading, which offset
              the dock target 5px from where the hero's arithmetic placed it.
              Both wordmarks are block so the two boxes agree exactly. */}
          <Wordmark className="block w-[140px] md:w-[160px]" title={SITE.name} />
          <span className="mono text-fg-muted">
            {SITE.tagline}
            {overlay ? ` — ${SITE.established}` : ""}
          </span>
        </Link>

        <nav
          className="pointer-events-auto hidden items-center gap-8 md:flex"
          aria-label="Primary"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mono transition-colors duration-300 ease-[var(--ease-expo)]",
                pathname.startsWith(item.href) ? "text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {overlay ? null : (
          <span className="mono hidden text-fg-muted md:block">{SITE.established}</span>
        )}

        <button
          type="button"
          className="mono pointer-events-auto text-fg md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="pointer-events-auto border-t border-rule bg-bg md:hidden"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="mono block border-b border-rule px-(--gutter) py-5 text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export default Header;
