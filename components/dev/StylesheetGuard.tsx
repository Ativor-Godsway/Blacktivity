"use client";

import { useEffect, useState } from "react";
import { STYLESHEET_BUILD } from "@/lib/stylesheet-build";

/**
 * SAYS SO WHEN THE STYLESHEET IS STALE — Revision 23 §2.
 *
 * The cover was reported broken three times. Each time the page was rendering
 * fresh HTML against a stylesheet from an older build: `next dev` serves its
 * CSS from a stable, non-hashed URL, so a browser could hold on to one. §1
 * makes that impossible by sending `no-store`. This is the second line — if it
 * ever happens again, for a reason nobody has thought of yet, the page
 * announces why rather than being reported as a mystery.
 *
 * HOW IT KNOWS. `scripts/build/stamp-stylesheet.mjs` writes a content hash of
 * globals.css into two places: the stylesheet itself, as `--stylesheet-build`,
 * and a constant the server renders into the HTML. A browser using the right
 * stylesheet computes the same value from both. A browser using an old one
 * computes the old hash — or none at all, if its stylesheet predates the stamp.
 *
 * DEVELOPMENT ONLY, AND IT MUST STAY THAT WAY. The whole body is behind
 * `process.env.NODE_ENV !== "production"`, which bundlers fold to `false` and
 * eliminate, so neither the banner nor its message reaches a production bundle.
 * `npm run check:devonly` greps the built output and fails if one does.
 *
 * It waits a moment before looking: a stylesheet can still be arriving when the
 * first effect runs, and crying stale over a merely late one would make this
 * the warning nobody trusts.
 */
export function StylesheetGuard() {
  const [stale, setStale] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      const served = getComputedStyle(document.documentElement)
        .getPropertyValue("--stylesheet-build")
        .trim()
        .replace(/^"|"$/g, "");

      if (!served) {
        setStale("missing");
        console.error(
          "STALE STYLESHEET: reload with cache disabled — the page has no " +
            "--stylesheet-build at all, so its stylesheet predates Revision 23 " +
            "or never loaded.",
        );
        return;
      }
      if (served !== STYLESHEET_BUILD) {
        setStale(served);
        console.error(
          "STALE STYLESHEET: reload with cache disabled — the page expects " +
            STYLESHEET_BUILD +
            " and the stylesheet says " +
            served +
            ".",
        );
        return;
      }
      setStale(null);
    };

    const raf = requestAnimationFrame(() => setTimeout(check, 250));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  if (process.env.NODE_ENV === "production") return null;
  if (!stale) return null;

  return (
    <div
      role="alert"
      /* Inline styles throughout: a banner about the stylesheet not arriving
         cannot itself depend on the stylesheet arriving. */
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 2147483647,
        background: "#7f1d1d",
        color: "#ffffff",
        font: "500 13px/1.5 ui-monospace, SFMono-Regular, monospace",
        padding: "10px 14px",
        textAlign: "center",
        letterSpacing: "0.04em",
      }}
    >
      STALE STYLESHEET — reload with cache disabled.{" "}
      {stale === "missing"
        ? "The page has no --stylesheet-build."
        : "HTML expects " + STYLESHEET_BUILD + ", stylesheet says " + stale + "."}
    </div>
  );
}

export default StylesheetGuard;
