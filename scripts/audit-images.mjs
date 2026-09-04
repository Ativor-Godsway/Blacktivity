/**
 * Every placeholder image URL must actually resolve. One dead Unsplash id ships
 * a broken image straight to the client, and it is invisible in code review.
 *
 *   node scripts/audit-images.mjs
 */
import { readFileSync } from "node:fs";

const SOURCES = ["data/seed-content.ts", "data/team.ts"];

const urls = new Set();
for (const file of SOURCES) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/https:\/\/[^"'\s]+/g)) urls.add(m[0]);
}

const list = [...urls];
console.log(`Checking ${list.length} image URLs...`);

/**
 * Checked a few at a time with retries. Firing all of them at once gets the
 * connections throttled and reports healthy URLs as broken, which is worse
 * than not checking at all.
 */
const CONCURRENCY = 4;
const ATTEMPTS = 3;

async function check(url) {
  let last = "no attempt";
  for (let i = 1; i <= ATTEMPTS; i++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-64" },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status < 400) return { url, status: res.status, ok: true };
      // 4xx is a real answer; no point retrying.
      if (res.status < 500) return { url, status: res.status, ok: false };
      last = String(res.status);
    } catch (err) {
      last = String(err?.message ?? err);
    }
    await new Promise((r) => setTimeout(r, 400 * i));
  }
  return { url, status: last, ok: false };
}

const results = [];
for (let i = 0; i < list.length; i += CONCURRENCY) {
  results.push(...(await Promise.all(list.slice(i, i + CONCURRENCY).map(check))));
}

const broken = results.filter((r) => !r.ok);
if (broken.length) {
  console.error(`\n${broken.length} BROKEN image URL(s):`);
  for (const b of broken) console.error(`  ${b.status}  ${b.url}`);
  process.exit(1);
}
console.log("All image URLs resolve.");
