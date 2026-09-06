import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import Reveal from "@/components/motion/Reveal";
import TrackLinks from "./TrackLinks";
import { staggerDelay, type ListEntryDTO } from "@/lib/rotation";

/**
 * NEW MUSIC — a release calendar, not a ranking.
 *
 * There are deliberately NO position numbers here. This list is unranked, and
 * numbering it would tell readers it was a second chart.
 *
 * The artwork is 64px SQUARE against the 4:5 portrait used everywhere else on
 * the site. Album art is square; the change in rhythm is the point, and it
 * reads as intentional rather than as a broken crop.
 */
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function dateHeader(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function NewMusicList({
  entries,
  size = 64,
}: {
  entries: ListEntryDTO[];
  /** 48px inside the curation tracklist, 64px as its own section. */
  size?: 48 | 64;
}) {
  if (entries.length === 0) return null;

  // Already sorted newest-first by the query; grouping preserves that order.
  const groups: { key: string; label: string; entries: ListEntryDTO[] }[] = [];
  for (const entry of entries) {
    const key = dayKey(entry.track.releaseDate);
    const last = groups.at(-1);
    if (last && last.key === key) last.entries.push(entry);
    else groups.push({ key, label: dateHeader(entry.track.releaseDate), entries: [entry] });
  }

  let index = 0;

  return (
    <div className="flex flex-col gap-12">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="border-b border-rule pb-3">
            <MonoLabel dim>{group.label}</MonoLabel>
          </h3>

          <ul>
            {group.entries.map((entry) => {
              const delay = staggerDelay(index++);
              const { track } = entry;

              return (
                <Reveal
                  as="li"
                  key={track.id}
                  delay={delay}
                  className="border-b border-rule py-5"
                >
                  <div className="flex items-start gap-5">
                    <RevealImage
                      src={track.artwork.url}
                      alt={track.artwork.alt || `${track.artist} — ${track.title}`}
                      width={size}
                      height={size}
                      blurDataURL={track.artwork.blurDataURL}
                      sizes={`${size}px`}
                      // Explicit square box: the source is square, so the slot
                      // and the intrinsic ratio agree and CLS stays at zero.
                      className="flex-none"
                    />

                    <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-8">
                      <div className="min-w-0">
                        <p className="display text-[clamp(1.5rem,3vw,1.75rem)] text-fg">
                          {track.artist}
                          {track.featuring.length > 0 ? (
                            <span className="mono ml-3 align-middle text-fg-dim">
                              FT. {track.featuring.join(", ")}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-fg-muted">
                          {track.title}
                          {track.origin ? (
                            <span className="mono ml-3 text-fg-dim">· {track.origin}</span>
                          ) : null}
                        </p>
                        {entry.note ? (
                          <p className="mt-2 max-w-[52ch] text-fg-muted">{entry.note}</p>
                        ) : null}
                      </div>

                      <TrackLinks
                        links={track.links}
                        trackSlug={track.slug}
                        title={`${track.artist} — ${track.title}`}
                        className="md:justify-end"
                      />
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default NewMusicList;
