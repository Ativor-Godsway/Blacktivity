/**
 * ARTICLE CARDS
 *
 * Two properties, on the homepage featured row and the /articles grid, at every
 * breakpoint the grid changes at:
 *
 *   1. THE IMAGE FILLS THE CELL'S CONTENT WIDTH. Revision 06 cut it to 46% of
 *      the cell, which left dead space down the right of every card. "Full
 *      width" here means the cell's box minus its padding — measured, not
 *      inferred from a class name, because that is the number a reader sees.
 *
 *   2. IT IS SHARP AT THAT WIDTH. A `sizes` attribute describing a fraction of
 *      the cell would still lay out full width and simply serve too few pixels,
 *      which no layout assertion can see. So this compares the DECODED pixels
 *      against the rendered CSS width times the device pixel ratio — the actual
 *      definition of soft.
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3111";
// Either side of each grid breakpoint (1 / 2 / 3 columns), plus a wide screen
// where the 1600px container caps the cell and `sizes` must stop scaling.
const CASES = [
  { width: 390, dpr: 2, cols: 1 },
  { width: 700, dpr: 2, cols: 2 },
  { width: 1280, dpr: 1, cols: 3 },
  { width: 1440, dpr: 2, cols: 3 },
  { width: 2560, dpr: 1, cols: 3 },
];

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const p = await b.newPage();

let failures = 0;
const fail = (m) => { console.log("  FAIL " + m); failures++; };
const ok = (m) => console.log("  ok   " + m);

for (const { width, dpr, cols } of CASES) {
  console.log(`\n=== ${width}px @${dpr}x — expecting ${cols} column(s) ===`);
  await p.setViewport({ width, height: 1200, deviceScaleFactor: dpr });

  for (const path of ["/", "/articles"]) {
    await p.goto(BASE + path, { waitUntil: "load" });
    // Cards below the fold are lazy; scroll them in and let them decode.
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    /*
     * `complete && naturalWidth > 0` is NOT enough here, and reading through it
     * is how this check first reported every 2x case as soft. An <img> whose
     * srcset candidate changes stays `complete` — holding the pixels it decoded
     * for the previous candidate — while the new file is still in flight. The
     * measurement then compares the box against a stale decode.
     *
     * `decode()` resolves against the CURRENT source, so waiting on it means
     * naturalWidth describes the file the browser actually chose.
     */
    await p.evaluate(() =>
      Promise.all([...document.querySelectorAll("article a img")].map((i) => i.decode().catch(() => {}))),
    );

    const cards = await p.evaluate(() => {
      return [...document.querySelectorAll("article")]
        .filter((a) => a.querySelector('a[href^="/articles/"] img'))
        .map((a) => {
          const link = a.querySelector("a");
          const img = a.querySelector("img");
          const wrap = img.closest("a > *") ?? img.parentElement;
          const cs = getComputedStyle(link);
          const inner = link.getBoundingClientRect().width
            - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          const r = wrap.getBoundingClientRect();
          return {
            cellInner: inner,
            rendered: r.width,
            renderedH: r.height,
            // NOT `img.naturalWidth`. On an <img> with `w` descriptors in its
            // srcset the browser applies a density correction and naturalWidth
            // reports the CSS size the candidate was chosen for, not the file's
            // pixel width — a 750px file selected for a 322px slot reports 322.
            // Reading it made every 2x case look 43% soft when nothing was.
            // The `w` descriptor of the selected candidate is the real number.
            natural: (() => {
              const chosen = img.currentSrc;
              for (const part of img.srcset.split(",")) {
                const [u, d] = part.trim().split(/\s+/);
                if (u === chosen && d?.endsWith("w")) return parseInt(d, 10);
              }
              return img.naturalWidth;
            })(),
            currentSrc: img.currentSrc,
            cardWidth: a.getBoundingClientRect().width,
          };
        });
    });

    if (cards.length === 0) { fail(`${path}: no article cards found`); continue; }

    // The grid really is the column count this case expects.
    const distinctRows = new Set(cards.map((c) => Math.round(c.cardWidth)));
    const actualCols = Math.round(width / [...distinctRows][0]) >= 1
      ? Math.round((await p.evaluate(() => {
          const g = document.querySelector("article")?.parentElement;
          return g ? getComputedStyle(g).gridTemplateColumns.split(" ").length : 0;
        })))
      : 0;
    if (actualCols !== cols) fail(`${path}: grid has ${actualCols} columns, expected ${cols}`);

    let widthProblems = 0;
    let softest = null;
    for (const c of cards) {
      // 1. Full content width of the cell.
      if (Math.abs(c.rendered - c.cellInner) > 1.5) widthProblems++;

      // 2. Sharp: decoded pixels must cover the rendered box at this DPR.
      const needed = c.rendered * dpr;
      const ratio = c.natural / needed;
      if (softest === null || ratio < softest.ratio) softest = { ratio, ...c, needed };
    }

    if (widthProblems) {
      const worst = cards.find((c) => Math.abs(c.rendered - c.cellInner) > 1.5);
      fail(`${path}: ${widthProblems}/${cards.length} card images are ${worst.rendered.toFixed(0)}px wide inside a ${worst.cellInner.toFixed(0)}px cell`);
    } else {
      ok(`${path.padEnd(10)} ${cards.length} cards, image fills the ${cards[0].cellInner.toFixed(0)}px cell`);
    }

    // A little tolerance: the loader picks from a fixed width ladder, so the
    // served file is usually larger and occasionally a hair under.
    if (softest.ratio < 0.95) {
      fail(`${path}: softest card serves ${softest.natural}px for a ${softest.needed.toFixed(0)}px box (${(softest.ratio * 100).toFixed(0)}%) — ${softest.currentSrc.slice(-90)}`);
    } else {
      ok(`${path.padEnd(10)} sharpest-case check: ${softest.natural}px served for ${softest.needed.toFixed(0)}px needed (${(softest.ratio * 100).toFixed(0)}%)`);
    }
  }
}

await b.close();
console.log(failures === 0 ? "\n  cards render full-width and sharp at every breakpoint" : `\n  ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
