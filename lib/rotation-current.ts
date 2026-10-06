import "server-only";
import ChartVolume from "@/models/ChartVolume";
import { volumeSlug, CHART_SIZE } from "@/lib/rotation";

/**
 * ROTATION WITHOUT VOLUMES, IN THE ADMIN — Revision 27 §1.
 *
 * The owner edits "the Top 10" and "New Releases". Underneath, those are the
 * lists of the CURRENT volume: the latest published one. Volumes still exist —
 * the public archive, movement arrows, OG cards and JSON-LD all depend on
 * them — but the admin never asks anyone to pick one.
 *
 * Three operations, and these are the only writes Rotation has:
 *   currentVolume()       what /admin/rotation edits
 *   saveCurrentRotation() the one Save button — it publishes
 *   startNewRotation()    archive the current lists, open the next number
 */

export const NEW_RELEASES_MIN = 1;
export const NEW_RELEASES_MAX = 12;

/** The latest published volume, or null on a fresh database. */
export async function currentVolume() {
  return ChartVolume.findOne({ status: "published" }).sort({ number: -1 });
}

async function nextNumber(): Promise<number> {
  // Across ALL volumes, drafts included, so a leftover draft can never clash.
  const latest = await ChartVolume.findOne().sort({ number: -1 }).select("number").lean();
  return (latest?.number ?? 0) + 1;
}

type Entry = { track: string; note: string };
type PlaylistSet = { spotify: string; audiomack: string; youtube: string };

export type CurrentRotationInput = {
  intro: string;
  chart: Entry[];
  newMusic: Entry[];
  playlists: { chart: PlaylistSet; newMusic: PlaylistSet };
  /** Only present when the flagged curation editor is on. */
  curation?: unknown;
};

/** Plain-words checks, the same ones the button shows. Returns null when fine. */
export function rotationProblem(input: Pick<CurrentRotationInput, "chart" | "newMusic">): string | null {
  if (input.chart.length !== CHART_SIZE) {
    return `Top 10 needs 10 tracks (${input.chart.length} added).`;
  }
  if (input.newMusic.length < NEW_RELEASES_MIN) return "New Releases needs at least one track.";
  if (input.newMusic.length > NEW_RELEASES_MAX) {
    return `New Releases holds up to ${NEW_RELEASES_MAX} tracks (${input.newMusic.length} added).`;
  }
  const dupes = (rows: Entry[]) => new Set(rows.map((r) => r.track)).size !== rows.length;
  if (dupes(input.chart)) return "A track appears twice in the Top 10.";
  if (dupes(input.newMusic)) return "A track appears twice in New Releases.";
  return null;
}

/**
 * Save = publish. Writes ONLY the current volume. A fresh database gets
 * Volume 1 on its first save. The curation is left alone unless the flagged
 * curation editor sent one (Revision 27 §1.2) — saving must never wipe it.
 */
export async function saveCurrentRotation(input: CurrentRotationInput) {
  let doc = await currentVolume();
  let created = false;

  if (!doc) {
    const number = await nextNumber();
    doc = new ChartVolume({
      number,
      slug: volumeSlug(number),
      status: "published",
      publishedAt: new Date(),
    });
    created = true;
  }

  doc.intro = input.intro;
  // Position is the row's index — never typed, so it cannot collide.
  doc.set("chart", input.chart.map((e, i) => ({ track: e.track, note: e.note, position: i + 1 })));
  doc.set("newMusic", input.newMusic.map((e) => ({ track: e.track, note: e.note })));
  doc.set("playlists.chart", input.playlists.chart);
  doc.set("playlists.newMusic", input.playlists.newMusic);
  doc.markModified("chart");
  doc.markModified("newMusic");
  if (input.curation !== undefined) {
    doc.set("curation", input.curation);
    doc.markModified("curation");
  }

  await doc.save();
  return { id: String(doc._id), number: doc.number, slug: doc.slug, created };
}

/**
 * "Start a new rotation". The current volume stays exactly as it is and
 * becomes the archive's newest entry; the next number opens today with the
 * same lists, so the owner edits rather than retypes (Revision 13's "start
 * from last volume", applied to both lists).
 *
 * The public date range is DERIVED from publishedAt (FORTNIGHT_DAYS in
 * lib/rotation.ts) — there is no stored end date to close, so the previous
 * volume is not written to at all.
 */
export async function startNewRotation() {
  const previous = await currentVolume();
  const number = await nextNumber();

  const created = await ChartVolume.create({
    number,
    slug: volumeSlug(number),
    status: "published",
    publishedAt: startOfToday(),
    intro: previous?.intro ?? "",
    chart: (previous?.chart ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((e, i) => ({ track: e.track, note: e.note ?? "", position: i + 1 })),
    newMusic: (previous?.newMusic ?? []).map((e) => ({ track: e.track, note: e.note ?? "" })),
    playlists: {
      chart: previous?.playlists?.chart ?? {},
      newMusic: previous?.playlists?.newMusic ?? {},
      curation: {},
    },
    curation: null,
  });

  return { id: String(created._id), number, slug: created.slug, previousNumber: previous?.number ?? null };
}

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
