import TrackCard from "./TrackCard";
import type { ChartRowDTO } from "@/lib/rotation";

/**
 * THE BLACKTIVITY CHART — Revision 17 §3, on the shared card.
 *
 * REVISION 14 §4's TWO-COLUMN POSTER GRID IS WITHDRAWN. It was borrowed from a
 * different reference, it fought the note field for horizontal room, and §3
 * replaces it outright with Reference E's single column of cards. The
 * `.chart-grid` CSS that drove it is gone from globals.css with it.
 *
 * This is the ONLY section that passes `position`, and that is what makes its
 * rows numbered — see TrackCard. Movement carries NO COLOUR: no green up, no
 * red down. That would put two hexes outside the token list on the
 * most-viewed page in the section, and the glyph is better for colour-blind
 * readers than hue is.
 */
export function ChartGrid({ rows }: { rows: ChartRowDTO[] }) {
  if (rows.length === 0) return null;

  return (
    <ol className="flex flex-col gap-4">
      {rows.map((row) => (
        <TrackCard
          key={row.track.id}
          track={row.track}
          position={row.position}
          movement={row.movement}
          peak={row.peak}
          weeks={row.weeks}
          note={row.note}
        />
      ))}
    </ol>
  );
}

export default ChartGrid;
