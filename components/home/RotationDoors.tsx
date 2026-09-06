import Link from "next/link";
import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import Reveal from "@/components/motion/Reveal";
import {
  movementLabel,
  movementText,
  staggerDelay,
  volumeLabel,
  volumeEventLabel,
  type HomeDoorData,
} from "@/lib/rotation";
import { formatDateMono, cn } from "@/lib/utils";

/**
 * THE THREE DOORS — Revision 14 §2. Replaces Revision 13's top-five-as-type
 * block entirely.
 *
 * A full-bleed gradient section: three category groups, each its own door into
 * the Rotation page at the matching section anchor. The gradient is what gives
 * this weight against the sand page, and it is the only one on the site.
 *
 * NUMBERING FOLLOWS RANKING, AND ONLY RANKING. The Chart's three carry badges;
 * New Music and the Curation carry none, because they are not ranked and
 * numbering them would tell the reader something untrue. The reference does
 * exactly this — it numbers its top artists and leaves its on-repeat row bare.
 *
 * Ten small images, all below the fold: every one is lazy (RevealImage's
 * default), carries explicit dimensions and a blur placeholder, and none of
 * them may become the homepage's LCP element.
 */

/**
 * The oversized title behind each group — the device from Reference A.
 *
 * HOW THE "NEVER OVERLAPS RUNNING TEXT" RULE IS ACTUALLY KEPT.
 *
 * Reference A can let its ghost sit behind everything because its rows are
 * image-ABOVE-text: the covers meet the ghost and the titles sit safely below.
 * These doors are image-BESIDE-text, so a ghost anchored over the content would
 * cross a track title at some breakpoint no matter how it is tuned — and it did
 * at 390px on the first pass.
 *
 * So the ghost gets its OWN BAND, reserved by a spacer of exactly its height,
 * between the real heading and the list. Nothing textual can enter that band at
 * any width, because the band is empty by construction rather than by
 * measurement. The partial overlap the reference is built on comes from the one
 * element that is allowed into it: the curator's portrait, which is an image.
 *
 * The other three non-negotiables: aria-hidden, a real readable heading
 * rendered separately, and alpha capped at 8% of --sand.
 */
function GhostBand({ children }: { children: string }) {
  return (
    <div className="relative mt-3">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 left-0 -z-10 block w-[130%] select-none",
          "display truncate text-[clamp(2.75rem,7vw,5rem)] leading-none",
          "text-[rgba(237,231,219,0.08)]",
        )}
      >
        {children}
      </span>
      {/* Reserves the band. Same clamp as the ghost, so they cannot drift. */}
      <div aria-hidden="true" className="h-[clamp(2.75rem,7vw,5rem)]" />
    </div>
  );
}

function DoorFooter({ label, href, track }: { label: string; href: string; track: string }) {
  return (
    <p className="mono mt-8 flex items-center gap-2 text-fg-dim transition-colors duration-300 ease-[var(--ease-expo)] group-hover:text-fg group-focus-visible:text-fg">
      {label}
      <span aria-hidden="true" className="card-arrow inline-block">→</span>
      <span className="sr-only"> — {track}</span>
    </p>
  );
}

/**
 * One door. The whole group is a single link, so the ground lift is honest
 * about what is clickable.
 *
 * Hover lifts the ground with a 4% sand overlay and travels the arrow 4px.
 * NO card scale and NO image movement — Revision 12's rule holds on dark
 * grounds too, and the three doors sit in a bordered row whose hairlines would
 * visibly break for the duration of a scale.
 */
function Door({
  href,
  heading,
  ghost,
  delay,
  children,
  footer,
}: {
  href: string;
  heading: string;
  ghost: string;
  delay: number;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Reveal delay={delay} className="min-w-0">
      <Link
        href={href}
        data-track={`rotation:door:${heading.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "group relative block h-full min-w-0 overflow-hidden px-5 py-8 md:px-6",
          "transition-colors duration-300 ease-[var(--ease-expo)]",
          "hover:bg-[rgba(237,231,219,0.04)] focus-visible:bg-[rgba(237,231,219,0.04)]",
        )}
      >
        {/* The real heading — present, readable, and what a screen reader gets. */}
        <h3 className="mono relative text-fg-dim">{heading}</h3>
        <GhostBand>{ghost}</GhostBand>
        <div className="relative mt-2">{children}</div>
        {footer}
      </Link>
    </Reveal>
  );
}

export function RotationDoors({ rotation }: { rotation: HomeDoorData | null }) {
  // No published volume: the whole section is absent, never an empty state.
  if (!rotation) return null;

  const { newMusic, chart, curation } = rotation;
  const doors = [newMusic.length > 0, chart.length > 0, Boolean(curation)].filter(Boolean).length;
  if (doors === 0) return null;

  return (
    <section
      className={cn(
        "on-gradient mt-(--spacing-section-lg) py-20 md:py-28",
        // Grain continues across it as normal — nothing is disabled here.
      )}
      aria-labelledby="rotation-doors-heading"
    >
      <div className="mx-auto max-w-[1600px] px-(--gutter)">
        <h2 id="rotation-doors-heading" className="sr-only">
          In Rotation — {volumeLabel(rotation.number)}
        </h2>

        <div
          className={cn(
            "grid grid-cols-1 gap-y-4 divide-y divide-rule md:divide-x md:divide-y-0",
            doors === 3 ? "md:grid-cols-3" : doors === 2 ? "md:grid-cols-2" : "md:grid-cols-1",
          )}
        >
          {newMusic.length > 0 ? (
            <Door
              href="/rotation#new-music"
              heading="New Music"
              ghost="new music"
              delay={staggerDelay(0)}
              footer={<DoorFooter label="What dropped" href="/rotation#new-music" track="new music" />}
            >
              <ul className="flex flex-col gap-6">
                {newMusic.map((entry) => (
                  <li key={entry.track.id} className="flex items-center gap-4">
                    <RevealImage
                      src={entry.track.artwork.url}
                      alt=""
                      width={56}
                      height={56}
                      blurDataURL={entry.track.artwork.blurDataURL}
                      sizes="56px"
                      className="size-14 flex-none"
                    />
                    <span className="min-w-0">
                      <span className="display block truncate text-[1.25rem] text-fg">
                        {entry.track.artist}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-baseline gap-x-3">
                        <span className="truncate text-fg-muted">{entry.track.title}</span>
                        <span className="mono text-fg-dim">
                          {formatDateMono(entry.track.releaseDate).slice(0, 6)}
                        </span>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Door>
          ) : null}

          {chart.length > 0 ? (
            <Door
              href="/rotation#chart"
              heading="The Chart"
              ghost="the chart"
              delay={staggerDelay(1)}
              footer={<DoorFooter label="The full chart" href="/rotation#chart" track="the chart" />}
            >
              {/* Ordered, and numbered, because this one IS a ranking. */}
              <ol className="flex flex-col gap-6">
                {chart.map((row) => (
                  <li key={row.track.id} className="flex items-center gap-4">
                    {/* Filled sand circle, espresso numeral — 8.57, the badge's
                        only permitted pairing on a tan-family fill. */}
                    <span
                      aria-hidden="true"
                      className="grid size-8 flex-none place-items-center rounded-full bg-sand text-espresso"
                    >
                      <span className="mono tabular-nums">{String(row.position).padStart(2, "0")}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="display block truncate text-[1.25rem] text-fg">
                        {row.track.artist}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-baseline gap-x-3">
                        <span className="truncate text-fg-muted">{row.track.title}</span>
                        <span className="mono text-fg-dim">
                          <span aria-hidden="true">{movementText(row.movement)}</span>
                          <span className="sr-only">
                            Position {row.position}. {movementLabel(row.movement)}.
                          </span>
                        </span>
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Door>
          ) : null}

          {curation ? (
            <Door
              href="/rotation#curation"
              heading="Creators Curation"
              ghost="curation"
              delay={staggerDelay(2)}
              footer={<DoorFooter label="The curation" href="/rotation#curation" track="the curation" />}
            >
              {curation.curator.photo ? (
                <RevealImage
                  src={curation.curator.photo.url}
                  alt=""
                  width={curation.curator.photo.width}
                  height={curation.curator.photo.height}
                  blurDataURL={curation.curator.photo.blurDataURL}
                  sizes="(max-width: 768px) 90vw, 22vw"
                  /*
                   * The only element that enters the ghost band — an IMAGE,
                   * which is what the reference overlaps its ghost with. No
                   * text is pulled up with it: the name and handle sit below.
                   */
                  className="-mt-[clamp(1.5rem,4vw,2.75rem)] aspect-4/5 w-full max-w-[220px]"
                />
              ) : null}

              <p className="display mt-5 text-[1.5rem] text-fg">{curation.curator.name}</p>
              <p className="mono mt-1.5 text-fg-dim">
                {curation.curator.igHandle ? `@${curation.curator.igHandle.replace(/^@/, "")}` : ""}
                {curation.curator.igHandle && curation.curator.discipline ? " · " : ""}
                {curation.curator.discipline}
              </p>

              {/* No numbers: the curator's own order is not a ranking. */}
              <ul className="mt-6 flex flex-col gap-3">
                {curation.tracks.map((entry) => (
                  <li key={entry.track.id} className="flex items-center gap-3">
                    <RevealImage
                      src={entry.track.artwork.url}
                      alt=""
                      width={32}
                      height={32}
                      blurDataURL={entry.track.artwork.blurDataURL}
                      sizes="32px"
                      className="size-8 flex-none"
                    />
                    <span className="min-w-0 truncate text-fg-muted">{entry.track.title}</span>
                  </li>
                ))}
              </ul>
            </Door>
          ) : null}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
          <MonoLabel dim>
            In Rotation — {volumeLabel(rotation.number)}
          </MonoLabel>
          <Link
            href="/rotation"
            data-track={volumeEventLabel(rotation.slug)}
            className="group mono flex items-center gap-3 text-fg transition-colors duration-300 ease-[var(--ease-expo)]"
          >
            Explore the charts
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 ease-[var(--ease-expo)] group-hover:translate-x-1 group-focus-visible:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default RotationDoors;
