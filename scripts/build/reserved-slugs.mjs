/**
 * Reserved web addresses, read from app/ — Revision 27 §2.3.
 *
 * Every STATIC segment directly under /articles, /events and /rotation is a
 * real route, so a title that slugifies to one of them must not take it
 * ("Archive" → archive-2, never archive, which would shadow /rotation/archive).
 * Writes lib/reserved-slugs.json, which lib/slug.ts merges into its list.
 *
 *   node scripts/build/reserved-slugs.mjs          write (prebuild, predev)
 *   node scripts/build/reserved-slugs.mjs --check  fail if the file is stale
 */
import { globSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const SECTIONS = ["articles", "events", "rotation"];
const segments = new Set();

for (const dir of globSync("app/**/{articles,events,rotation}/*/", { withFileTypes: false })) {
  const parts = dir.replace(/\/$/, "").split("/").filter((p) => !/^\(.*\)$/.test(p));
  const [section, segment] = parts.slice(-2);
  if (!SECTIONS.includes(section)) continue;
  if (parts.includes("admin") || parts.includes("api")) continue; // public URL space only
  if (/^\[.*\]$/.test(segment) || segment.startsWith("_") || segment.startsWith("@")) continue;
  segments.add(segment);
}

const out = JSON.stringify({ generatedFrom: "app/{articles,events,rotation}/*", segments: [...segments].sort() }, null, 2) + "\n";
const file = "lib/reserved-slugs.json";

if (process.argv.includes("--check")) {
  if (!existsSync(file) || readFileSync(file, "utf8") !== out) {
    console.error(`FAIL  ${file} is stale — run node scripts/build/reserved-slugs.mjs`);
    process.exit(1);
  }
  console.log(`  ok  reserved slugs current: ${[...segments].sort().join(", ") || "(none)"}`);
} else {
  writeFileSync(file, out);
  console.log(`reserved slugs from app/: ${[...segments].sort().join(", ") || "(none)"}`);
}
