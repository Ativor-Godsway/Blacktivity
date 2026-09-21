import RevealImage from "@/components/ui/RevealImage";
import TrackLinks from "./TrackLinks";
import {
  movementLabel,
  movementText,
  releaseDateSlot,
  type Movement,
  type TrackDTO,
} from "@/lib/rotation";
import { cn } from "@/lib/utils";

/**
 * ONE ROW, BOTH LISTS — Revision 17 §3.
 *
 * The Chart and New Releases differ in exactly two places, and both of them are
 * in this file: what the SLOT column carries (§4, §5), and what the METADATA
 * line carries. Everything else — the 72px artwork, the artist and title, the
 * two platform links, the hairline, the hover — is shared, because §3 asks for
 * one grid rendered twice rather than two grids that drift.
 *
 * WHAT MAKES A ROW RANKED is `position`. It is passed by the Chart and by
 * nothing else, and it is the only thing that puts a numeral on screen. New
 * Releases is not a ranking; numbering it would tell the reader something
 * untrue, which is the same call Revision 13 §4.1 and Revision 14 §2 made.
 *
 * MOVEMENT CARRIES NO COLOUR — no green up, no red down. Revision 13 §4.2, and
 * flagged in §4 as the likeliest thing to get quietly broken while rebuilding
 * this row, so: the glyph carries the direction, it always has, and it is
 * better for colour-blind readers than hue is. There is no hex in this file.
 */
export type RotationRowData = {
  track: TrackDTO;
  note: string;
  /** Chart only. Its presence is what makes the row ranked. */
  position?: number;
  movement?: Movement;
  peak?: number;
  weeks?: number;
};

export function RotationRow({
  row,
  /** First of its column at >=900px — the hairline is suppressed there. */
  columnFirst = false,
  eager = false,
}: {
  row: RotationRowData;
  columnFirst?: boolean;
  eager?: boolean;
}) {
  const { track, note, position, movement, peak, weeks } = row;
  const ranked = position !== undefined;

  /*
    ROW 01 TAKES THE TINT — §4 and Reference C's first row.

    `.on-raised` is the Revision 19 successor to `.on-sand-deep`, and it is
    SIMPLER than what it replaced: --muted was 4.04 on --sand-deep and failed
    AA, so that class had to re-point --color-fg-dim to --ink-2 for every mono
    label in the cell. On --black-raised --muted is 4.87 and passes, so the
    class sets a ground and nothing else.

    It still re-points --color-bg-raised to its own value, which is why the
    shared `.card-hover` ground change is silently a no-op on this row rather
    than something that has to be excluded.
  */
  const tinted = position === 1;

  return (
    <li
      data-col-first={columnFirst ? "" : undefined}
      className={cn("rotation-row card-hover", tinted && "on-raised")}
    >
      {ranked ? (
        <span
          aria-hidden="true"
          className="display [grid-area:slot] text-[1.75rem] leading-none tabular-nums text-fg md:text-[2.25rem]"
        >
          {String(position).padStart(2, "0")}
        </span>
      ) : (
        <span className="mono [grid-area:slot] whitespace-nowrap tabular-nums text-fg-dim">
          {releaseDateSlot(track.releaseDate)}
        </span>
      )}

      {/* 72px square in BOTH lists — §3. Two sizes in two adjacent grids reads
          as a mistake, so Revision 13's 64px for the release list is gone. Explicit
          dimensions and a blur placeholder: zero CLS across twenty images. */}
      <RevealImage
        src={track.artwork.url}
        alt=""
        width={72}
        height={72}
        blurDataURL={track.artwork.blurDataURL}
        sizes="72px"
        loading={eager ? "eager" : "lazy"}
        className="size-18 [grid-area:art]"
      />

      <div className="flex min-w-0 flex-col gap-1 [grid-area:text]">
        <p className="display truncate text-[1.125rem] leading-tight text-fg md:text-[1.25rem]">
          {track.artist}
          {track.featuring.length > 0 ? (
            <span className="mono ml-2 align-middle text-fg-dim">
              FT. {track.featuring.join(", ")}
            </span>
          ) : null}
        </p>
        {/* `.card-title` — this is the element the shared hover lifts from
            --bone-2 to --bone. */}
        <p className="card-title truncate text-fg-muted">{track.title}</p>

        {/*
          ONE LINE, ONE ELEMENT, AND THE SPOKEN COPY OUTSIDE IT.

          §4 and §5 both cap this at a single line, and the separators are part
          of the STRING rather than spans of their own — a flex-wrap row of six
          spans breaks after a "·" the moment the cell narrows, which puts a
          dangling separator at the end of line one and the numbers underneath.

          THE sr-only EQUIVALENT IS A SIBLING, NOT A CHILD. `truncate` is
          overflow-hidden plus white-space: nowrap, so the visible string
          overruns its box by design — and an absolutely-positioned sr-only
          span inside it lands at the END of that overrun, 13px past the
          viewport at 360. It contributed nothing visible and widened the
          document anyway. Outside the truncating box it cannot.

          The visible text is aria-hidden: "▲2 · PK 01 · 08 WKS" is meaningless
          read aloud.
        */}
        <p className="mono mt-0.5 truncate text-fg-dim tabular-nums" aria-hidden="true">
          {ranked && movement
            ? [
                movementText(movement),
                peak !== undefined ? `PK ${String(peak).padStart(2, "0")}` : null,
                weeks !== undefined ? `${String(weeks).padStart(2, "0")} WKS` : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : /* §5 — origin, then the editorial note where there is one. The
                 curator is gone from this page, so the note is the only
                 editorial voice left on a New Releases row. */
              [track.origin, note].filter(Boolean).join(" · ")}
        </p>
        {ranked && movement ? (
          <span className="sr-only">
            Position {position}. {movementLabel(movement)}.
            {peak !== undefined && weeks !== undefined
              ? ` Peak position ${peak}, ${weeks} weeks on chart.`
              : ""}
          </span>
        ) : (
          <span className="sr-only">{[track.origin, note].filter(Boolean).join(". ")}</span>
        )}
      </div>

      <TrackLinks
        links={track.links}
        trackSlug={track.slug}
        title={`${track.artist} — ${track.title}`}
        className="[grid-area:links] xl:justify-end"
      />
    </li>
  );
}

export default RotationRow;
