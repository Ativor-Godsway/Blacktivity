import MonoLabel from "@/components/ui/MonoLabel";
import TrackCard from "./TrackCard";
import type { ListEntryDTO } from "@/lib/rotation";

/**
 * NEW MUSIC — a release calendar, not a ranking.
 *
 * Still grouped under mono date headers, which is what distinguishes this
 * section; the ROWS are now the shared TrackCard (Revision 17 §3.4) rather
 * than a treatment of their own. No position numbers — this list is unranked
 * and numbering it would tell readers it was a second chart.
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

export function NewMusicList({ entries }: { entries: ListEntryDTO[] }) {
  if (entries.length === 0) return null;

  // Already sorted newest-first by the query; grouping preserves that order.
  const groups: { key: string; label: string; entries: ListEntryDTO[] }[] = [];
  for (const entry of entries) {
    const key = dayKey(entry.track.releaseDate);
    const last = groups.at(-1);
    if (last && last.key === key) last.entries.push(entry);
    else groups.push({ key, label: dateHeader(entry.track.releaseDate), entries: [entry] });
  }

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="border-b border-rule pb-3">
            <MonoLabel dim>{group.label}</MonoLabel>
          </h3>
          <ul className="mt-5 flex flex-col gap-4">
            {group.entries.map((entry) => (
              <TrackCard key={entry.track.id} track={entry.track} note={entry.note} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default NewMusicList;
