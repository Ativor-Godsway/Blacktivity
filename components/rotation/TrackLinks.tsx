import { visibleLinks, trackEventLabel, type TrackLinks as Links } from "@/lib/rotation";

/**
 * LINKS ONLY. There is no player anywhere in this section, and there never will
 * be — thirty Spotify iframes would destroy the LCP won across twelve
 * revisions and drag Spotify green, YouTube red and Audiomack orange into a
 * sand-and-espresso page.
 *
 * Mono, uppercase, dim, right-aligned, capped at three so the column stays
 * straight. No "more" disclosure: it is a link list, not a menu.
 */
export function TrackLinks({
  links,
  trackSlug,
  title,
  className = "",
}: {
  links: Links;
  trackSlug: string;
  /** Distinguishes otherwise identical "Spotify" links for a screen reader. */
  title: string;
  className?: string;
}) {
  const shown = visibleLinks(links);
  if (shown.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
      {shown.map((link) => (
        <li key={link.key}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            data-track={trackEventLabel(trackSlug, link.key)}
            className="mono text-fg-dim transition-colors duration-300 ease-[var(--ease-expo)] hover:text-fg focus-visible:text-fg"
          >
            {link.label}
            <span aria-hidden="true"> ↗</span>
            <span className="sr-only"> — {title} (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default TrackLinks;
