"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/constants";
import Wordmark from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";
import { VISIBLE_NAV } from "@/data/nav";

/**
 * THE BAND THE OBSERVER WATCHES — Revision 20 §2.4.
 *
 * A thin horizontal strip a little below the top of the viewport. Whichever
 * themed section is crossing that strip is the one currently under the header,
 * and therefore the one that decides the header's colours.
 *
 * 40px puts it inside the header's own box at every width: the bar is `py-5`
 * around a wordmark or a single mono line, so its vertical middle falls between
 * 34 and 48. It is a CONSTANT rather than a measurement on purpose —
 * `audit:perf` bans getBoundingClientRect, and reading layout to configure a
 * scroll-adjacent observer is exactly the habit that ban exists to prevent.
 *
 * 1px tall, not 12: the band's EDGES are where the decision is made, so a thick
 * band flips the header as soon as a section reaches its lower lip, several
 * pixels before that section is actually underneath. Revision 17 measured that
 * and settled on 1px; the same reasoning holds.
 */
const BAND_TOP = 40;
const BAND_HEIGHT = 1;

/**
 * THE HEADER FOLLOWS THE GROUND — Revision 20 §2.4.
 *
 * Revision 17 had an observer like this one, watching for `data-surface="dark"`
 * and setting a boolean. Revision 19 deleted it, correctly: with one ground
 * there was no flip to compute, and it said in this file "do not reintroduce
 * this". Revision 20 alternates black and white, so there is a flip again —
 * and it is not the same one. This reads the section's DECLARED THEME rather
 * than inferring a ground, so the header cannot disagree with what is actually
 * under it.
 *
 * ONE IntersectionObserver, and deliberately not a scroll listener: the
 * observer is off the scroll path entirely, so this adds no per-frame work and
 * does not touch the single-rAF-loop rule. `audit:perf` bans
 * addEventListener("scroll") outright, and this is why it can.
 *
 * THE COVER'S PHOTOGRAPH IS STILL NOT MEASURED. The cover declares
 * `data-theme="dark"` like any other section, and the type over it is protected
 * by its own gradient scrims and its per-slide `tone` flag — a decision made
 * per image at author time. Nothing here samples a pixel.
 *
 * WHY IT RE-RUNS ON PATHNAME: the observed elements are page content, and on a
 * client-side navigation the old ones are gone.
 */
function useHeaderTheme(ref: React.RefObject<HTMLElement | null>, pathname: string) {
  useEffect(() => {
    const header = ref.current;
    if (!header) return;

    const sections = document.querySelectorAll<HTMLElement>("[data-theme]");
    if (sections.length === 0) return;

    /*
     * Ordered by document position, so that when two sections straddle the band
     * — which happens for one frame at every boundary — the LAST one wins. That
     * is the one whose top edge has just crossed, i.e. the one now under the
     * header. Picking the first would hold the outgoing section's theme for the
     * length of the overlap and produce a visible late flip.
     */
    const crossing = new Set<HTMLElement>();
    let observer: IntersectionObserver | null = null;

    const apply = () => {
      let chosen: HTMLElement | null = null;
      for (const el of sections) if (crossing.has(el)) chosen = el;

      /*
       * NOTHING CROSSING MEANS WE ARE ABOVE THE FIRST SECTION — fall back to it.
       *
       * At scroll 0 on a section page the band sits INSIDE the header itself,
       * above where the first themed block begins, so nothing intersects. With
       * no fallback the header kept its default dark tokens and painted a black
       * bar across the top of a white article page: §3 asks for light "from the
       * header to the end of the body", and the header was the one part that
       * was not.
       *
       * The first section is the right answer rather than a guess — it is the
       * ground the reader is looking at, and it is the ground the header will
       * be over the moment they scroll a pixel.
       */
      const theme = (chosen ?? sections[0])?.dataset.theme;
      if (theme) header.setAttribute("data-header-theme", theme);
      else header.removeAttribute("data-header-theme");
    };

    const connect = () => {
      observer?.disconnect();
      crossing.clear();
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) crossing.add(entry.target as HTMLElement);
            else crossing.delete(entry.target as HTMLElement);
          }
          apply();
        },
        {
          // Collapse the viewport to a 1px band at BAND_TOP.
          rootMargin: `-${BAND_TOP}px 0px -${Math.max(
            window.innerHeight - BAND_TOP - BAND_HEIGHT,
            0,
          )}px 0px`,
        },
      );
      for (const el of sections) observer.observe(el);
    };

    connect();

    // The bottom margin is derived from the viewport height, so the band drifts
    // off the header when the window resizes. resize, never scroll.
    const onResize = () => connect();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
      header.removeAttribute("data-header-theme");
    };
  }, [ref, pathname]);
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useHeaderTheme(headerRef, pathname);

  // On the homepage the header IS the hero's top-left micro type — it overlays
  // the cover stack rather than sitting above it in a bordered bar, so the
  // brand line is never printed twice.
  const overlay = pathname === "/";

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
        /* The hook for the cover's colour transition. It is scoped to THIS box
           rather than to <header> because the mobile nav panel below is a
           sibling with a solid ground of its own. */
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
          {/*
            THE NAME IS ON A SEPARATE sr-only SPAN ON THE HOMEPAGE, not on the
            mark's <title>.

            On the homepage this wordmark is held at opacity 0 — the cover's
            masthead is the visible one — and an SVG <title> is a text node, so
            `audit:text` correctly reported "Blacktivity" as text rendering at
            opacity 0 with JavaScript disabled. Moving the name out of the mark
            and into sr-only text keeps the link named without putting a string
            on screen that nobody can read.

            Everywhere else the mark IS visible, so it keeps its <title> and
            there is no second copy of the word in the DOM.
          */}
          <Wordmark
            className="block w-[140px] md:w-[160px]"
            title={overlay ? undefined : SITE.name}
          />
          {overlay ? <span className="sr-only">{SITE.name}</span> : null}
          {/*
            NO TAGLINE ON THE HOMEPAGE — Revision 19 §4.

            THE BUG IT FIXES: the cover's masthead starts at
            --cover-masthead-top, which is the nav row's height plus a gutter.
            The nav is one mono line, but this header block is a COLUMN —
            wordmark, gap, tagline — roughly 97px tall at md, and the tagline's
            baseline landed inside the masthead's cap height. "CREATIVE STUDIO
            — EST 2025" printed across the top of the word "black".

            Raising the masthead's offset to clear the column was the wrong fix:
            it pushes the masthead a third of the way down the cover to make
            room for a line the cover already says better. §4's composition is
            nav across the top and then the masthead — no tagline — and the
            marquee along the foot carries EST 2025 and ACCRA, GH anyway.

            The wordmark stays, hidden at opacity 0, because it is the dock's
            target and it carries the home link's accessible name. It is the
            only thing in this column on the homepage, so the block is as tall
            as the nav row beside it and --hero-nav-h stays true.
          */}
          {overlay ? null : <span className="mono text-fg-muted">{SITE.tagline}</span>}
        </Link>

        <nav
          className="pointer-events-auto hidden items-center gap-8 md:flex"
          aria-label="Primary"
        >
          {VISIBLE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mono transition-colors duration-300 ease-[var(--ease-expo)]",
                /* --tan marks the active route — Revision 19 §1 lists active
                   nav among the accent's jobs, and it is 9.98 on black. On the
                   old sand ground tan was 1.59 and could not carry type at all,
                   which is why the active state used to be plain --fg and read
                   as barely distinguishable from the rest. */
                /* `text-accent`, not `text-tan`: the header travels over both
                   grounds now, and --tan is 1.78 on --paper. The theme picks
                   --tan on dark and --ink on light. */
                pathname.startsWith(item.href) ? "text-accent" : "text-fg-muted hover:text-fg",
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
          {VISIBLE_NAV.map((item) => (
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
