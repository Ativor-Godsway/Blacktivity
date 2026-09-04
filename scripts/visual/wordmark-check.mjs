/**
 * The hero wordmark must read as "blacktivity" — descender included — at every
 * breakpoint. It has regressed to "blacktivitu" twice, so this is a check, not
 * a one-off screenshot.
 *
 * Measures the SVG's rendered box against the viewport and reports how much is
 * clipped on each edge. The 'y' tail occupies roughly the bottom 12% of the
 * glyph bounds, so a bottom clip beyond ~10% eats it.
 */
import puppeteer from "puppeteer-core";

const WIDTHS = [
  [360, 780], [390, 844], [430, 932],
  [1280, 800], [1440, 900], [1728, 1080], [2560, 1400], [3440, 1440],
];
const BASE = process.env.BASE ?? "http://localhost:3111";
const MAX_BOTTOM_CLIP = 0.12; // the descender lives here
let failed = 0;

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu"],
});

console.log("  viewport      mark box        clip L/R/B        verdict");
for (const [w, h] of WIDTHS) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));

  const g = await p.evaluate(() => {
    const svg = document.querySelector('section[aria-label] svg[data-wordmark]');
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return {
      vw: innerWidth, vh: innerHeight,
      l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height,
    };
  });
  await p.close();

  if (!g) { console.log(`  ${w}x${h}: no wordmark found`); failed++; continue; }

  const clipL = Math.max(0, -g.l);
  const clipR = Math.max(0, g.r - g.vw);
  const clipB = Math.max(0, g.b - g.vh);
  const bottomPct = g.h ? clipB / g.h : 0;

  const problems = [];
  if (clipL > 1) problems.push("left cut");
  if (clipR > 1) problems.push("right cut");
  if (bottomPct > MAX_BOTTOM_CLIP) problems.push(`descender cut (${(bottomPct * 100).toFixed(0)}%)`);

  if (problems.length) failed++;
  console.log(
    `  ${String(w + "x" + h).padEnd(12)} ${String(Math.round(g.w) + "x" + Math.round(g.h)).padEnd(14)} ` +
    `${String(Math.round(clipL) + "/" + Math.round(clipR) + "/" + Math.round(clipB)).padEnd(16)} ` +
    (problems.length ? "FAIL — " + problems.join(", ") : `ok (bottom ${(bottomPct * 100).toFixed(0)}%)`),
  );
}

await b.close();
console.log(failed === 0 ? "\n  wordmark legible at every width" : `\n  ${failed} width(s) failed`);
process.exit(failed === 0 ? 0 : 1);
