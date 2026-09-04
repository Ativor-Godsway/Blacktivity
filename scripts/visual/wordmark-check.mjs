/**
 * The hero wordmark must read as "blacktivity" — descender included — at every
 * breakpoint.
 *
 * THIS CHECK ASSERTS CLEARANCE, NOT CONTAINMENT.
 *
 * Its first version asserted "zero pixels clipped" and passed the failing
 * state: the viewBox is tight to the glyph bounds, so a box ending exactly at
 * the viewport edge means the LETTERFORM touches the edge. The 'y' sat flush
 * against the right edge with its tail sliced by the fold, the mark read
 * "blacktivitu", and the check said ok. Containment was a proxy for legibility
 * and it did not hold.
 *
 * So: the rendered box must end a real margin inside each edge, and flush
 * fails. A check that encodes the wrong invariant is worse than no check.
 */
import puppeteer from "puppeteer-core";

const WIDTHS = [
  [360, 780], [390, 844], [430, 932],
  [1280, 800], [1440, 900], [1728, 1080], [2560, 1400], [3440, 1440],
];
const BASE = process.env.BASE ?? "http://localhost:3111";

/** Minimum breathing room, as a fraction of the viewport. */
const MIN_SIDE_CLEARANCE = 0.02; // of viewport width, each side
const MIN_BOTTOM_CLEARANCE = 0.02; // of viewport height, below the descender

let failed = 0;

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu"],
});

console.log("  viewport      mark box         clearance L/R/B      verdict");
for (const [w, h] of WIDTHS) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1400));

  const g = await p.evaluate(() => {
    const svg = document.querySelector("section[aria-label] svg[data-wordmark]");
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return { vw: innerWidth, vh: innerHeight, l: r.left, r: r.right, b: r.bottom, w: r.width, h: r.height };
  });
  await p.close();

  if (!g) { console.log(`  ${w}x${h}: no wordmark found`); failed++; continue; }

  const left = g.l;                 // gap between viewport edge and glyph
  const right = g.vw - g.r;
  const bottom = g.vh - g.b;        // gap between descender and the fold

  const needSide = g.vw * MIN_SIDE_CLEARANCE;
  const needBottom = g.vh * MIN_BOTTOM_CLEARANCE;

  const problems = [];
  if (left < needSide) problems.push(`left ${Math.round(left)}px < ${Math.round(needSide)}px`);
  if (right < needSide) problems.push(`right ${Math.round(right)}px < ${Math.round(needSide)}px`);
  if (bottom < needBottom) problems.push(`descender ${Math.round(bottom)}px < ${Math.round(needBottom)}px above the fold`);

  if (problems.length) failed++;
  console.log(
    `  ${String(w + "x" + h).padEnd(12)} ${String(Math.round(g.w) + "x" + Math.round(g.h)).padEnd(15)} ` +
    `${String(`${Math.round(left)}/${Math.round(right)}/${Math.round(bottom)}`).padEnd(20)} ` +
    (problems.length ? "FAIL — " + problems.join("; ") : "ok"),
  );
}

await b.close();
console.log(
  failed === 0
    ? `\n  clear of every edge by at least ${MIN_SIDE_CLEARANCE * 100}% at all ${WIDTHS.length} widths`
    : `\n  ${failed} width(s) failed`,
);
process.exit(failed === 0 ? 0 : 1);
