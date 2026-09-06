import { PLAYLIST_PLATFORMS, playlistEventLabel, type ListType, type PlaylistSet } from "@/lib/rotation";

const LABELS: Record<string, string> = {
  spotify: "Spotify",
  audiomack: "Audiomack",
  youtube: "YouTube",
};

/**
 * One bordered block closing each list. If there is no playlist for a list the
 * block simply does not render — no disabled state, no placeholder.
 *
 * The hover is the site's standard lift (ground → sand-raised), not a new
 * gesture, so it reads as part of the same system as every card.
 */
export function PlaylistBlock({
  playlists,
  list,
  volumeSlug,
  label,
}: {
  playlists: PlaylistSet;
  list: ListType;
  volumeSlug: string;
  /** "Listen — the full chart". */
  label: string;
}) {
  const available = PLAYLIST_PLATFORMS.filter((p) => Boolean(playlists[p]));
  if (available.length === 0) return null;

  return (
    <div className="mt-12 border border-rule">
      {available.map((platform, i) => (
        <a
          key={platform}
          href={playlists[platform]!}
          target="_blank"
          rel="noopener noreferrer"
          data-track={playlistEventLabel(volumeSlug, list, platform)}
          className={`group flex min-h-14 items-center justify-between gap-6 px-5 py-4 transition-colors duration-300 ease-[var(--ease-expo)] hover:bg-bg-raised focus-visible:bg-bg-raised ${
            i > 0 ? "border-t border-rule" : ""
          }`}
        >
          <span className="mono text-fg">{label}</span>
          <span className="mono flex items-center gap-3 text-fg-dim">
            {LABELS[platform]}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 ease-[var(--ease-expo)] group-hover:translate-x-1 group-focus-visible:translate-x-1"
            >
              ↗
            </span>
            <span className="sr-only">(opens in a new tab)</span>
          </span>
        </a>
      ))}
    </div>
  );
}

export default PlaylistBlock;
