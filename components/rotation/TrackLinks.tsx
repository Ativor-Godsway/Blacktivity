import { visibleLinks, trackEventLabel, type TrackLinks as Links } from "@/lib/rotation";
import { cn } from "@/lib/utils";

/**
 * LINKS ONLY. There is no player anywhere in this section, and there never will
 * be — twenty Spotify iframes would destroy the LCP won across seventeen
 * revisions and drag Spotify green, YouTube red and Audiomack orange into a
 * sand-and-espresso page.
 *
 * Mono, uppercase, dim. CAPPED AT TWO from Revision 17 §3 — see
 * MAX_TRACK_LINKS for why the third had to go, and why the priority order is
 * what keeps the surviving two aligned down each grid column.
 *
 * RENDERED ONCE PER ROW, NEVER TWICE. §8 wants these beneath the metadata line
 * on narrow screens and beside it at 1280 — which is the shape of bug that
 * gets "solved" with a hidden/xl:flex pair. That duplicates the copy for
 * anything that reads or copies the page, and `audit:text` fails a page whose
 * text comes back twice. The row is a grid and this element changes GRID AREA
 * instead; see `.rotation-row` in globals.css.
 */
export function TrackLinks({
  links,
  trackSlug,
  title,
  className,
}: {
  links: Links;
  trackSlug: string;
  /** Distinguishes otherwise identical "Audiomack" links for a screen reader. */
  title: string;
  className?: string;
}) {
  const shown = visibleLinks(links);
  if (shown.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-1.5", className)}>
      {shown.map((link) => (
        <li key={link.key}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            data-track={trackEventLabel(trackSlug, link.key)}
            className="mono whitespace-nowrap text-fg-dim transition-colors duration-300 ease-[var(--ease-expo)] hover:text-fg focus-visible:text-fg"
          >
            {link.label}
            {/* `.card-arrow` is the site's one travelling arrow — Revision 12
                §3. The row carries `.card-hover`, so this moves 4px with the
                rest of the hover and stops moving under reduced motion,
                without a rule of its own. */}
            <span aria-hidden="true" className="card-arrow ml-1.5 inline-block">
              ↗
            </span>
            <span className="sr-only"> — {title} (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default TrackLinks;
