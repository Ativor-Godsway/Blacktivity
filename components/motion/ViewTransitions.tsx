"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Article reveal, built on the View Transitions API.
 *
 * The browser captures the outgoing and incoming pages itself and animates
 * between them on the compositor, so there is no per-frame measurement and no
 * hand-built shared-element system. Where the API is missing, navigation is
 * simply instant — the fallback is "no transition", not a worse transition.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO — the previous PageTransition
 * server-rendered a full-viewport black panel and wrapped the site in
 * `opacity: 0`, so every visitor stared at black until React hydrated and the
 * page was permanently black with JS off. Nothing here is server-rendered:
 * this component renders null and only intercepts clicks after mount. With
 * JavaScript disabled every link is an ordinary link to a fully rendered page.
 *
 * Back and forward are untouched — the API tears its own snapshot down, so no
 * overlay can be stranded, and popstate is never intercepted.
 */
export function ViewTransitions() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> };
    };
    if (typeof doc.startViewTransition !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function onClick(e: MouseEvent) {
      // Never hijack a modified click, a new tab, or a non-primary button.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return;

      // Only the article reveal — every other route keeps the default.
      const intoArticle = /^\/articles\/[^/]+$/.test(url.pathname);
      const outOfArticle = /^\/articles\/[^/]+$/.test(location.pathname);
      if (!intoArticle && !outOfArticle) return;

      e.preventDefault();
      doc.startViewTransition!(() => {
        router.push(url.pathname + url.search);
        // Resolve on the next frame so the browser captures the new state.
        return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      });
    }

    /**
     * CAPTURE PHASE, deliberately. Next's <Link> attaches its own handler to
     * the anchor, which in the bubble phase runs before a document-level
     * listener — the router had already navigated by the time preventDefault
     * was called, so the transition never started.
     */
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, pathname]);

  return null;
}

export default ViewTransitions;
