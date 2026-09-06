"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // On the homepage the header IS the hero's top-left micro type — it overlays
  // the cover stack rather than sitting above it in a bordered bar, so the
  // brand line is never printed twice.
  const overlay = pathname === "/";

  return (
    <header
      className={cn(
        "z-40",
        overlay
          ? "pointer-events-none absolute inset-x-0 top-0"
          : "relative border-b border-rule",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1600px] justify-between px-(--gutter) py-5",
          overlay ? "pointer-events-auto items-start" : "items-center",
        )}
      >
        <Link
          href="/"
          className="flex flex-col gap-1.5 text-fg"
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
          <Wordmark className="w-[140px] md:w-[160px]" title={SITE.name} />
          <span className="mono text-fg-muted">
            {SITE.tagline}
            {overlay ? ` — ${SITE.established}` : ""}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
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
