import { config } from "dotenv";

// Next.js reads .env.local automatically; standalone scripts do not.
config({ path: ".env.local" });
config();
import mongoose from "mongoose";
import Track from "../models/Track";
import ChartVolume from "../models/ChartVolume";
import { seedRotation } from "./seed-rotation";

/**
 * ROTATION-ONLY SEED — additive, idempotent, and safe on a live database.
 *
 * `npm run seed` is a full reset: seven deleteMany({}) calls that would take
 * the articles, events, submissions and ninety days of analytics with them.
 * That is the right behaviour for a local scratch database and the wrong tool
 * for adding four volumes to a database with real content in it, which is why
 * this exists as a separate entry point rather than a flag on that one.
 *
 * It writes ONLY tracks and chart volumes. Tracks are matched on `slug` and
 * volumes on `number`, so running it twice updates in place — the second run
 * inserts nothing. That reuse is not a convenience: a duplicate Track document
 * breaks movement, because the previous volume still references the first _id.
 *
 *   npm run seed:rotation
 */
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");

  const host = uri
    .replace(/^mongodb(\+srv)?:\/\//, "")
    .replace(/^[^@/]*@/, "")
    .split(/[/?]/)[0]!;

  await mongoose.connect(uri);
  console.log(`Seeding Rotation into ${host}…\n`);

  const before = {
    tracks: await Track.countDocuments(),
    volumes: await ChartVolume.countDocuments(),
  };

  const r = await seedRotation(Track, ChartVolume);

  const after = {
    tracks: await Track.countDocuments(),
    volumes: await ChartVolume.countDocuments(),
  };

  console.log(`  tracks        ${r.tracksInserted} inserted, ${r.tracksUpdated} updated  (${before.tracks} → ${after.tracks})`);
  console.log(`  volumes       ${r.volumesInserted} inserted, ${r.volumesUpdated} updated  (${before.volumes} → ${after.volumes})`);
  console.log(`  curations     ${r.curations}`);

  await mongoose.disconnect();
  console.log("\nDone. Nothing else in the database was touched.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
