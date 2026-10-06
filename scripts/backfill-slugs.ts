/**
 * BACKFILL WEB ADDRESSES — Revision 27 §2.6. A dry run unless --write.
 *
 *   MONGODB_URI=… npm run backfill:slugs            print what would change
 *   MONGODB_URI=… npm run backfill:slugs -- --write apply it
 *
 * Only documents whose slug is empty, missing or not a valid address are
 * touched. A valid slug is never regenerated: published links are already out
 * in the world. Rotation's own keys are checked too, but by their own rules —
 * a volume's address is `vol-NN` from its number, and a track's is the
 * `artist--title` dedupe key — and only empty ones are filled.
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import Article from "../models/Article";
import EventModel from "../models/Event";
import ChartVolume from "../models/ChartVolume";
import Track from "../models/Track";
import { baseSlug, isValidSlug } from "../lib/slug";
import { uniqueSlug } from "../lib/slug-server";
import { trackSlug, volumeSlug } from "../lib/rotation";

config({ path: ".env.local" });
config();

const WRITE = process.argv.includes("--write");

type Row = { collection: string; id: string; title: string; before: string; after: string };

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI.");
  // autoIndex off: a dry run must not even build an index.
  await mongoose.connect(uri, { autoIndex: false });

  const rows: Row[] = [];
  const counts: Record<string, { total: number; ok: number }> = {};

  for (const [name, Model, type] of [
    ["articles", Article, "article"],
    ["events", EventModel, "event"],
  ] as const) {
    const docs = await (Model as typeof Article).find().select("title slug createdAt").lean();
    counts[name] = { total: docs.length, ok: 0 };
    for (const d of docs) {
      if (d.slug && isValidSlug(d.slug)) {
        counts[name]!.ok++;
        continue;
      }
      const created = (d as { createdAt?: Date }).createdAt ?? new Date();
      const after = await uniqueSlug(Model as typeof Article, baseSlug(type, d.title ?? "", created), { excludeId: d._id });
      rows.push({ collection: name, id: String(d._id), title: d.title ?? "", before: d.slug ?? "(missing)", after });
      if (WRITE) await (Model as typeof Article).updateOne({ _id: d._id }, { $set: { slug: after } });
    }
  }

  const volumes = await ChartVolume.find().select("number slug").lean();
  counts.chartvolumes = { total: volumes.length, ok: 0 };
  for (const v of volumes) {
    if (v.slug) {
      counts.chartvolumes.ok++;
      continue;
    }
    const after = volumeSlug(v.number);
    rows.push({ collection: "chartvolumes", id: String(v._id), title: `#${v.number}`, before: "(missing)", after });
    if (WRITE) await ChartVolume.updateOne({ _id: v._id }, { $set: { slug: after } });
  }

  const tracks = await Track.find().select("artist title slug").lean();
  counts.tracks = { total: tracks.length, ok: 0 };
  for (const t of tracks) {
    if (t.slug) {
      counts.tracks.ok++;
      continue;
    }
    const after = trackSlug(t.artist, t.title);
    rows.push({ collection: "tracks", id: String(t._id), title: `${t.artist} — ${t.title}`, before: "(missing)", after });
    if (WRITE) await Track.updateOne({ _id: t._id }, { $set: { slug: after } });
  }

  console.log(WRITE ? "BACKFILL — WRITTEN\n" : "BACKFILL — DRY RUN (nothing written; pass --write to apply)\n");
  for (const [name, c] of Object.entries(counts)) {
    console.log(`  ${name.padEnd(13)} ${String(c.total).padStart(4)} documents · ${String(c.ok).padStart(4)} already valid · ${c.total - c.ok} to change`);
  }
  console.log("");
  if (rows.length === 0) {
    console.log("  Nothing to change: every document already has a valid web address.");
  } else {
    console.table(rows.map((r) => ({ collection: r.collection, title: r.title.slice(0, 48), before: r.before, after: r.after })));
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect();
  process.exit(1);
});
