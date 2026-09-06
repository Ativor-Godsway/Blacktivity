import RevealImage from "@/components/ui/RevealImage";
import Reveal from "@/components/motion/Reveal";
import TrackLinks from "./TrackLinks";
import { movementLabel, movementText, staggerDelay, type ChartRowDTO } from "@/lib/rotation";
import { cn } from "@/lib/utils";

/**
 * THE BLACKTIVITY CHART — Revision 14 §4, the poster grid.
 *
 * WHAT CHANGED, AND WHY THE OLD REASONING NO LONGER APPLIES.
 *
 * Revision 13 set this section in pure type and banned artwork outright. The
 * argument was that thirty covers scattered down a sand page is noise — and
 * that still holds for ONE long column, which is why New Music keeps its small
 * artwork and its calendar layout. It does not hold here: ten rows at one fixed
 * 72px size in a two-column grid make the artwork a regular column of its own,
 * which reads as structure rather than scatter. Reference B is the proof.
 *
 * WHAT DID NOT CHANGE. Movement carries NO COLOUR. No green up, no red down —
 * that would put two hexes outside the token list on the most-viewed page in
 * the section, and the glyph is better for colour-blind readers than hue is.
 *
 * Row 01 takes a --sand-deep tint across its full cell. The tint is EMPHASIS
 * ONLY: the numeral already carries the rank, so nothing is conveyed by it
 * alone. Its mono labels resolve through .on-sand-deep to --ink-2, because
 * --muted is 4.04 on that ground and mono labels here are 11-12px.
 */
export function ChartGrid({ rows }: { rows: ChartRowDTO[] }) {
  if (rows.length === 0) return null;

  // Balance the two columns rather than always breaking at five.
  const perColumn = Math.ceil(rows.length / 2);

  return (
    <ol
      className="chart-grid border-t border-rule"
      style={{ "--chart-rows": perColumn } as React.CSSProperties}
    >
      {rows.map((row, i) => {
        const isFirst = row.position === 1;
        return (
          <Reveal
            as="li"
            key={row.track.id}
            delay={staggerDelay(i)}
            className={cn(
              "border-b border-rule",
              i >= perColumn && "chart-col-2",
              isFirst && "on-sand-deep",
            )}
          >
            <div className="flex items-center gap-4 px-4 py-5 md:gap-5 md:px-5">
              <span
                className="display flex-none tabular-nums text-fg text-[clamp(1.75rem,3.5vw,2.75rem)]"
                aria-hidden="true"
              >
                {String(row.position).padStart(2, "0")}
              </span>

              {/* Fixed 72px, never fluid — the column only reads as a column
                  because every thumbnail is the same size. */}
              <RevealImage
                src={row.track.artwork.url}
                alt=""
                width={72}
                height={72}
                blurDataURL={row.track.artwork.blurDataURL}
                sizes="72px"
                className="size-18 flex-none"
              />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="display truncate text-[clamp(1.125rem,2vw,1.5rem)] text-fg">
                  {row.track.artist}
                  {row.track.featuring.length > 0 ? (
                    <span className="mono ml-2 align-middle text-fg-dim">
                      FT. {row.track.featuring.join(", ")}
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-fg-muted">{row.track.title}</p>

                <p className="mono flex flex-wrap items-center gap-x-3 text-fg-dim">
                  <span aria-hidden="true">{movementText(row.movement)}</span>
                  <span className="sr-only">
                    Position {row.position}. {movementLabel(row.movement)}.
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    PK {String(row.peak).padStart(2, "0")} · {String(row.weeks).padStart(2, "0")} WKS
                  </span>
                  <span className="sr-only">
                    Peak position {row.peak}, {row.weeks} weeks on chart.
                  </span>
                </p>

                {row.note ? (
                  <p className="mt-1 max-w-[48ch] text-fg-muted">{row.note}</p>
                ) : null}
              </div>

              <TrackLinks
                links={row.track.links}
                trackSlug={row.track.slug}
                title={`${row.track.artist} — ${row.track.title}`}
                className="hidden flex-none flex-col items-end gap-y-1.5 lg:flex"
              />
            </div>

            {/* Below the grid's own breakpoint the links move under the row
                rather than squeezing the artist name to nothing. */}
            <div className="px-4 pb-4 lg:hidden">
              <TrackLinks
                links={row.track.links}
                trackSlug={row.track.slug}
                title={`${row.track.artist} — ${row.track.title}`}
              />
            </div>
          </Reveal>
        );
      })}
    </ol>
  );
}

export default ChartGrid;
