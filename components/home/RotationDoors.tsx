import Link from "next/link";
import RevealImage from "@/components/ui/RevealImage";
import Reveal from "@/components/motion/Reveal";
import {
  movementLabel,
  movementText,
  staggerDelay,
  volumeDateRange,
  volumeLabel,
  volumeEventLabel,
  type HomeDoorData,
} from "@/lib/rotation";
import { formatDateMono, cn } from "@/lib/utils";

/**
 * THE THREE DOORS — Revision 14 §2, corrected by Revision 15 §5.
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
 *
 * WHAT REVISION 15 §5 CHANGED, AND WHY EACH ONE IS LOAD-BEARING.
 *
 * 1. THE GHOST HEADINGS ARE GONE. Revision 14 §2 put an oversized aria-hidden
 *    title behind each group at 8% of --sand, in a reserved band of its own so
 *    it could never cross running text. The band worked exactly as specified —
 *    and that was the problem. At 8% on a gradient that runs from --cocoa to
 *    --espresso-deep the type is not legible as type, so what it actually
 *    produced was a ~5rem empty stripe across the top of every column. A device
 *    that has to be explained is not working. Do not reintroduce it; if the
 *    section ever wants oversized type again it has to be REAL type at a real
 *    contrast, which is what the masthead row below now is.
 *
 * 2. THE MASTHEAD ROW replaces it — full section width, above the columns.
 *    It closes the void the ghosts left, gives the section a header instead of
 *    a floating sr-only title, and lifts EXPLORE THE CHARTS from the bottom of
 *    the section to the top, where it is visible without scrolling past
 *    everything else first.
 *
 * 3. ALL THREE DOOR LINKS SIT ON ONE BASELINE. Each door is a flex column and
 *    its footer is `mt-auto`, so the three door links land on a single line no
 *    matter how much content is above them. The columns previously ended at
 *    three different heights, which is most of what made the row read as
 *    unbalanced.
 */

/**
 * The door link. `mt-auto` inside a flex column is the whole mechanism behind
 * the shared baseline — see the Door wrapper. It must NOT be given a fixed
 * top margin instead: that aligns the three only while their content happens
 * to be the same height, which is exactly the bug it is here to fix.
 */
function DoorFooter({ label, track }: { label: string; track: string }) {
  return (
    <p className="mono mt-auto flex items-center gap-2 pt-10 text-fg-dim transition-colors duration-300 ease-[var(--ease-expo)] group-hover:text-fg group-focus-visible:text-fg">
      {label}
      <span aria-hidden="true" className="card-arrow inline-block">→</span>
      <span className="sr-only"> — {track}</span>
    </p>
  );
}

/**
 * The chart's rank badge — Revision 15 §5.3.
 *
 * FILLED, not outlined: --sand ground with --espresso numerals, which is 8.57
 * and the badge's only permitted pairing on a tan-family fill. The outlined
 * circle it replaces read as a placeholder rather than as a rank.
 *
 * 40px, up from 32. `flex-none` matters — inside a flex row with a truncating
 * text sibling the badge is otherwise the thing that gets squeezed, and a
 * squeezed circle reads as a rendering fault.
 */
function RankBadge({ position }: { position: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 flex-none place-items-center rounded-full bg-sand text-espresso"
    >
      <span className="mono tabular-nums">{String(position).padStart(2, "0")}</span>
    </span>
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
 *
 * `h-full` on the Reveal wrapper AND on the link, then `flex flex-col` on the
 * link: the grid stretches the wrapper, the wrapper stretches the link, and
 * only then does the footer's `mt-auto` have a full-height box to push against.
 * Dropping any one of the three silently returns the links to three different
 * baselines, which is the regression Revision 15 §5.2 was written about.
 */
function Door({
  href,
  heading,
  delay,
  children,
  footer,
}: {
  href: string;
  heading: string;
  delay: number;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Reveal delay={delay} className="h-full min-w-0">
      <Link
        href={href}
        data-track={`rotation:door:${heading.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "group relative flex h-full min-w-0 flex-col overflow-hidden px-5 py-8 md:px-6",
          "transition-colors duration-300 ease-[var(--ease-expo)]",
          "hover:bg-[rgba(237,231,219,0.04)] focus-visible:bg-[rgba(237,231,219,0.04)]",
        )}
      >
        <h3 className="mono text-fg-dim">{heading}</h3>
        <div className="mt-6">{children}</div>
        {footer}
      </Link>
    </Reveal>
  );
}

/**
 * Artist over title — the shared two-line body of a New Music and a Chart row.
 *
 * Revision 15 §5.3 takes the artist name up one step, to 1.5rem. It was 1.25
 * and read small for a full-bleed section carrying only nine rows.
 */
function RowText({
  artist,
  title,
  meta,
}: {
  artist: string;
  title: string;
  meta: React.ReactNode;
}) {
  return (
    <span className="min-w-0 flex-1">
      {/*
        `pb-[0.14em]`, and it is not decorative spacing.

        `truncate` is overflow:hidden, and `.display` sets line-height 0.92 —
        tighter than the glyph box — so the descenders of j, y and g are clipped
        off inside a truncating display-serif line. "Naa Adjeley" lost both of
        hers at 390px. The padding gives the hidden overflow somewhere to put
        them.

        It has to be padding rather than a `leading-*` utility: `.display` lives
        in globals.css, which is emitted after the utilities layer, so it wins
        the font/line-height fight. Same reason `.mono-lg` exists.
      */}
      <span className="display block truncate pb-[0.14em] text-[1.5rem] text-fg">{artist}</span>
      <span className="mt-1 flex flex-wrap items-baseline gap-x-3">
        <span className="truncate text-fg-muted">{title}</span>
        {meta}
      </span>
    </span>
  );
}

export function RotationDoors({ rotation }: { rotation: HomeDoorData | null }) {
  // No published volume: the whole section is absent, never an empty state.
  if (!rotation) return null;

  const { newMusic, chart, curation } = rotation;
  const doors = [newMusic.length > 0, chart.length > 0, Boolean(curation)].filter(Boolean).length;
  if (doors === 0) return null;

  const range = volumeDateRange(rotation.publishedAt, formatDateMono);

  return (
    <section
      className={cn(
        "on-gradient mt-(--spacing-section-lg) py-20 md:py-28",
        // Grain continues across it as normal — nothing is disabled here.
      )}
      aria-labelledby="rotation-doors-heading"
    >
      <div className="mx-auto max-w-[1600px] px-(--gutter)">
        {/*
          THE MASTHEAD ROW — Revision 15 §5.1.

          Mono throughout, but the section title is at a HEADING scale rather
          than the 11/12px label scale. That is the whole point of the fix — a
          floating sr-only title and a 5rem band of invisible ghost type gave
          the section no visible header at all.

          `.mono-lg` rather than a `text-[1.5rem]` utility: globals.css is
          emitted after the utilities layer, so `.mono`'s own font-size wins
          against the utility and the heading renders at 12px. See the note on
          `.mono-lg` in globals.css.

          --tan on the gradient is reached through --color-fg-dim, which
          .on-gradient already re-points to it (6.70 against --cocoa, the
          gradient's lightest point and the only place the measurement counts).
          No component here names a literal colour.

          It wraps to three stacked lines below md rather than compressing —
          the date range and the link are both unbreakable strings.
        */}
        <div className="flex flex-col gap-3 border-b border-rule pb-5 md:flex-row md:items-baseline md:justify-between md:gap-8">
          <h2
            id="rotation-doors-heading"
            className="mono mono-lg text-fg"
          >
            In Rotation
          </h2>

          <p className="mono text-fg-dim">
            {volumeLabel(rotation.number)}
            {range ? ` · ${range}` : ""}
          </p>

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

        <div
          className={cn(
            "mt-10 grid grid-cols-1 items-stretch gap-y-4 divide-y divide-rule md:divide-x md:divide-y-0",
            doors === 3 ? "md:grid-cols-3" : doors === 2 ? "md:grid-cols-2" : "md:grid-cols-1",
          )}
        >
          {newMusic.length > 0 ? (
            <Door
              href="/rotation#new-music"
              heading="New Music"
              delay={staggerDelay(0)}
              footer={<DoorFooter label="What dropped" track="new music" />}
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
                    <RowText
                      artist={entry.track.artist}
                      title={entry.track.title}
                      meta={
                        <span className="mono text-fg-dim">
                          {formatDateMono(entry.track.releaseDate).slice(0, 6)}
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul>
            </Door>
          ) : null}

          {chart.length > 0 ? (
            <Door
              href="/rotation#chart"
              heading="The Chart"
              delay={staggerDelay(1)}
              footer={<DoorFooter label="The full chart" track="the chart" />}
            >
              {/*
                Ordered, and numbered, because this one IS a ranking.

                THE ARTWORK IS NEW — Revision 15 §5.2, and it is the same 56px
                square New Music uses. This column was pure type beside two
                columns carrying images, which is what made it read thin rather
                than austere. (Revision 13 §4.2 argued the opposite and 14 §0
                corrected it; the correction had simply never been applied
                here.)
              */}
              <ol className="flex flex-col gap-6">
                {chart.map((row) => (
                  <li key={row.track.id} className="flex items-center gap-3">
                    <RankBadge position={row.position} />
                    <RevealImage
                      src={row.track.artwork.url}
                      alt=""
                      width={56}
                      height={56}
                      blurDataURL={row.track.artwork.blurDataURL}
                      sizes="56px"
                      className="size-14 flex-none"
                    />
                    <RowText
                      artist={row.track.artist}
                      title={row.track.title}
                      meta={
                        <span className="mono text-fg-dim">
                          <span aria-hidden="true">{movementText(row.movement)}</span>
                          <span className="sr-only">
                            Position {row.position}. {movementLabel(row.movement)}.
                          </span>
                        </span>
                      }
                    />
                  </li>
                ))}
              </ol>
            </Door>
          ) : null}

          {curation ? (
            <Door
              href="/rotation#curation"
              heading="Creators Curation"
              delay={staggerDelay(2)}
              footer={<DoorFooter label="The curation" track="the curation" />}
            >
              {/*
                THE PORTRAIT IS NOW A 140px CIRCLE — Revision 15 §5.2, after
                Reference A's top-artist portraits.

                It was a 220px 4:5 panel, and as the section's only large image
                it put the whole row's visual weight on the right-hand column.
                At 140px round it anchors its own column instead of towering
                over the section.

                The negative top margin it used to carry is gone with the ghost
                band it was reaching into. Nothing here overlaps anything now.
              */}
              {curation.curator.photo ? (
                <RevealImage
                  src={curation.curator.photo.url}
                  alt=""
                  width={140}
                  height={140}
                  blurDataURL={curation.curator.photo.blurDataURL}
                  sizes="140px"
                  className="size-[140px] flex-none rounded-full"
                />
              ) : null}

              <p className="display mt-5 text-[1.75rem] text-fg">{curation.curator.name}</p>
              <p className="mono mt-2 text-fg-dim">
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
      </div>
    </section>
  );
}

export default RotationDoors;
