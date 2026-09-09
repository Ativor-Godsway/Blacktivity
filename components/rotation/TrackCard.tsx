import RevealImage from "@/components/ui/RevealImage";
import TrackLinks from "./TrackLinks";
import { movementLabel, movementText, type Movement, type TrackDTO } from "@/lib/rotation";
import { cn } from "@/lib/utils";

/**
 * THE TRACK CARD — Revision 17 §3.4, the Rotation page's one repeating unit.
 *
 * New Music, The Chart and Creators Curation all render this. The three
 * sections keep what makes them genuinely different — New Music groups under
 * mono date headers, The Chart numbers and carries movement, Curation opens
 * with the curator's portrait and statement — but the row itself is one
 * component in three contexts rather than three near-identical treatments.
 *
 * NUMBERS ONLY WHERE THERE IS A RANKING. `position` is passed by the chart and
 * by nothing else; New Music and the Curation are unranked, and numbering them
 * would tell the reader something untrue. Revision 14 §2's rule, unchanged.
 *
 * THE NOTE IS RENDERED ONCE. Reference E puts its quotes beside the row, and
 * §3.4 asks for the note outside the card on desktop and inside it on mobile —
 * which is the shape of bug that gets "solved" with two copies and a
 * hidden/lg:block pair. That would duplicate the text for anything that reads
 * or copies the page, and `audit:text` fails a page whose copy comes back
 * twice. So there is ONE note element, and the CARD GROUND MOVES INSTEAD:
 *
 *   below lg — the <li> itself carries the ground, border and radius, so the
 *              note sits inside the card beneath the title.
 *   lg and up — the ground moves to the inner row, the <li> goes transparent,
 *              and the note becomes the grid's second column, outside it.
 *
 * One element, two layouts, nothing duplicated.
 */
export function TrackCard({
  track,
  position,
  movement,
  peak,
  weeks,
  note,
  artworkPriority = false,
}: {
  track: TrackDTO;
  /** Chart only — its presence is what makes this a ranked row. */
  position?: number;
  movement?: Movement;
  peak?: number;
  weeks?: number;
  note?: string;
  artworkPriority?: boolean;
}) {
  const ranked = position !== undefined;

  return (
    <li
      className={cn(
        "track-card grid items-start",
        // Below lg the <li> IS the card — see the note above.
        "rounded-(--radius-card) border border-rule bg-bg-raised",
        // From lg the ground moves inward and this becomes a bare two-column grid.
        "lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-8 lg:rounded-none lg:border-0 lg:bg-transparent",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-4 p-4 md:gap-5",
          "lg:rounded-(--radius-card) lg:border lg:border-rule lg:bg-bg-raised",
        )}
      >
        {ranked ? (
          <span
            aria-hidden="true"
            className="rotation-word flex-none text-[2.25rem] tabular-nums text-fg md:text-[2.75rem]"
          >
            {String(position).padStart(2, "0")}
          </span>
        ) : null}

        {/* 72px square, 4px radius — §3.4. Every one of the ~30 on this page is
            lazy (RevealImage's default); only the first may opt out. */}
        <RevealImage
          src={track.artwork.url}
          alt=""
          width={72}
          height={72}
          blurDataURL={track.artwork.blurDataURL}
          sizes="72px"
          priority={artworkPriority}
          className="size-18 flex-none rounded-[4px]"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Satoshi 500 for the artist, 400 for the title — §3.4. The display
              serif deliberately does not appear on this row: the page's display
              voice is the masthead, and setting thirty artist names in it would
              spend that voice on the least distinctive thing here. */}
          <p className="truncate font-medium text-fg">
            {track.artist}
            {track.featuring.length > 0 ? (
              <span className="mono ml-2 align-middle text-fg-dim">
                FT. {track.featuring.join(", ")}
              </span>
            ) : null}
          </p>
          <p className="truncate text-fg-muted">{track.title}</p>

          {ranked && movement ? (
            <p className="mono mt-0.5 flex flex-wrap items-center gap-x-3 text-fg-dim">
              <span aria-hidden="true">{movementText(movement)}</span>
              <span className="sr-only">
                Position {position}. {movementLabel(movement)}.
              </span>
              {peak !== undefined && weeks !== undefined ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span aria-hidden="true" className="tabular-nums">
                    PK {String(peak).padStart(2, "0")} · {String(weeks).padStart(2, "0")} WKS
                  </span>
                  <span className="sr-only">
                    Peak position {peak}, {weeks} weeks on chart.
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <TrackLinks
          links={track.links}
          trackSlug={track.slug}
          title={`${track.artist} — ${track.title}`}
          className="hidden flex-none flex-col items-end gap-y-1.5 md:flex"
        />
      </div>

      {/* Links move below the row on narrow screens rather than squeezing the
          artist name to nothing. Rendered once, hidden from md up. */}
      <div className="px-4 pb-4 md:hidden">
        <TrackLinks
          links={track.links}
          trackSlug={track.slug}
          title={`${track.artist} — ${track.title}`}
        />
      </div>

      {note ? (
        <p className="mono px-4 pb-4 text-fg-dim lg:px-0 lg:pt-5 lg:pb-0">{note}</p>
      ) : null}
    </li>
  );
}

export default TrackCard;
