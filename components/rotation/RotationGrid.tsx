import RotationRow, { type RotationRowData } from "./RotationRow";
import { leftColumnCount } from "@/lib/rotation";

/**
 * THE NUMBERED TWO-COLUMN GRID — Revision 17 §3.
 *
 * ONE COMPONENT, TWO INSTANCES. The Chart and New Releases are the same device
 * at the same scale, differing only in what each row's slot column carries
 * (RotationRow) and in what the section head's right-hand meta says. Two
 * near-copies of this file would drift within one revision, and §10 checks for
 * exactly that.
 *
 * COLUMN-MAJOR, AND IT MATTERS. Positions 1-5 read DOWN the left column and
 * 6-10 down the right, as the reference does and as a ranked list must:
 * row-major would put 01 and 02 side by side, which reads as a tie.
 *
 * The DOM stays in ONE list in rank order — `grid-auto-flow: column` with an
 * explicit row count does the placing (see `.rotation-grid`). That is what
 * keeps the reading order, the tab order and the copied text all in rank order
 * while the eye reads down each column, and it is why this is not two
 * side-by-side <ol>s.
 *
 * THE SECTION HEAD is the title block's structure at a subordinate scale —
 * deliberately, so the page reads as one device repeated and neither head
 * competes with the <h1>.
 */
export function RotationGrid({
  id,
  title,
  meta,
  rows,
  slotWidth,
  eagerRows = 0,
}: {
  id: string;
  title: string;
  /** Right of the head — "10 TRACKS", or the volume's date range. */
  meta: string;
  rows: RotationRowData[];
  /**
   * Width of the slot column, e.g. "3rem". Fixed within a grid — that is what
   * makes the artwork form an unbroken vertical line — but not shared BETWEEN
   * the grids, because a numeral and a date are not the same width and padding
   * the narrower one to match spends the artist name's room on nothing.
   */
  slotWidth?: string;
  /**
   * How many of THIS grid's rows load eagerly — §9's budget, and it belongs to
   * the PAGE, not to the component. Only the Chart is above the fold, so only
   * the Chart is ever given a non-zero count; New Releases defaults to none.
   */
  eagerRows?: number;
}) {
  if (rows.length === 0) return null;

  /*
    An odd count leaves the LAST RIGHT-HAND CELL EMPTY, and `grid-auto-flow:
    column` against this row count produces that on its own — nothing here has
    to draw a placeholder. See leftColumnCount for why the columns are not
    balanced.
  */
  const left = leftColumnCount(rows.length);

  return (
    <section aria-labelledby={`${id}-heading`}>
      {/*
        THE ANCHOR IS ON A REAL ELEMENT WITH A REAL id — Revision 14 §3, which
        this revision leaves entirely alone. scroll-margin-top keeps the heading
        clear of the top of the viewport whether the reader arrives by the
        native fragment jump with JavaScript off or through Lenis.

        There is no sticky section nav above it any more, so the margin is back
        to breathing room rather than nav clearance.
      */}
      <div
        id={id}
        className="flex scroll-mt-[5rem] flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-rule pb-4"
      >
        <h2
          id={`${id}-heading`}
          className="display text-[clamp(2rem,4.5vw,3.25rem)] leading-none text-fg"
        >
          {title}
        </h2>
        <p className="mono text-fg-dim tabular-nums">{meta}</p>
      </div>

      <ol
        className="rotation-grid mt-2"
        /* The left column's length, handed to CSS. `grid-auto-flow: column`
           needs an explicit row count or it makes one column per row. */
        style={
          { "--rotation-rows": left, "--rotation-slot": slotWidth } as React.CSSProperties
        }
      >
        {rows.map((row, i) => (
          <RotationRow
            key={row.track.id}
            row={row}
            /* The hairline sits BETWEEN rows within a column, so the first of
               each column suppresses it — but only once there are two columns.
               Below 900px the list is one column and only row 0 qualifies,
               which is why this is a data attribute the media query reads
               rather than a class applied here. */
            columnFirst={i === left}
            /* §9 — the page's first four rows only. Twenty eager decodes
               above the fold is how this page ends up slower than the one it
               replaces. */
            eager={i < eagerRows}
          />
        ))}
      </ol>
    </section>
  );
}

export default RotationGrid;
