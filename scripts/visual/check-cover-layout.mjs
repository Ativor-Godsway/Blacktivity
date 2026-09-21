/**
 * THE COVER'S LAYOUT INVARIANTS — Revision 19 §3, §4, §10.
 *
 * Four things that have each broken at least once during this revision and
 * would break silently again, because all four look fine at the width they were
 * last checked at:
 *
 *   1. THE SECTION HEADLINE CLEARS THE HEADER (§3). The homepage header is an
 *      overlay and goes `fixed` under the pin, so it has no layout relationship
 *      with anything below the cover. "Selected writing" arrived with the
 *      header block sitting on it. Asserted at 1280, 1440 and 1728, at the
 *      scroll position where the section actually arrives.
 *
 *   2. NO DOUBLE WORDMARK (§10). The header's own wordmark and the cover's
 *      masthead are both in the DOM. Exactly one may be visible at the top of
 *      the page, and the other has to be the one held at opacity 0.
 *
 *   3. THE MASTHEAD IS IN THE EDITORIAL GRID. Its left edge and the header
 *      wordmark's left edge must agree, because the dock is a pure scale about
 *      `left top` with no X correction at all — if they disagree the mark lands
 *      sideways of its slot and nothing in the arithmetic will say so.
 *
 *   4. THE COVER LINE IS IN THE GUTTER. It is absolutely positioned, and
 *      absolute offsets resolve against the padding box — so `left: 0` walked
 *      straight through the gutter while everything around it looked correct.
 *
 *   node scripts/visual/check-cover-layout.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3111";
const WIDTHS = [1280, 1440, 1728];
/** `--gutter` at md and up. One gutter is the clearance §3 asks for. */
const GUTTER = 32;

let failed = 0;
const fail = (m) => { console.error("  FAIL " + m); failed++; };
const ok = (m) => console.log("  ok   " + m);

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

for (const w of WIDTHS) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
  await p.goto(BASE + "/", { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2200));

  /* --- 2, 3, 4: measured at the top of the page --------------------------- */
  const top = await p.evaluate(() => {
    const masthead = document.querySelector("[data-cover-masthead] svg[data-wordmark]");
    const headerMark = document.querySelector("header[data-overlay] [data-wordmark]");
    const line = document.querySelector("[data-cover-line][data-active]");
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const opacity = (el) => (el ? Number(getComputedStyle(el).opacity) : null);
    return {
      mastheadLeft: r(masthead)?.left ?? null,
      mastheadOpacity: opacity(masthead?.closest("[data-cover-masthead]")),
      headerLeft: r(headerMark)?.left ?? null,
      headerOpacity: opacity(headerMark),
      lineLeft: r(line)?.left ?? null,
    };
  });

  if (top.mastheadLeft === null || top.headerLeft === null) {
    fail(`${w}: a wordmark is missing from the page`);
  } else {
    // 2 — one visible, one held at zero.
    const visible = [top.mastheadOpacity, top.headerOpacity].filter((o) => o > 0.01).length;
    if (visible !== 1) fail(`${w}: ${visible} wordmarks visible at the top of the page; exactly one may be`);
    else ok(`${w}  one wordmark visible (masthead ${top.mastheadOpacity}, header ${top.headerOpacity})`);

    // 3 — the dock has no X correction, so the left edges must already agree.
    const dx = Math.abs(top.mastheadLeft - top.headerLeft);
    if (dx > 1) fail(`${w}: masthead left ${top.mastheadLeft.toFixed(1)} vs header ${top.headerLeft.toFixed(1)} — the dock corrects no X`);
    else ok(`${w}  masthead and header slot share a left edge (${top.mastheadLeft.toFixed(0)}px)`);
  }

  // 4 — the cover line sits in the grid, not against the viewport.
  if (top.lineLeft === null) fail(`${w}: no active cover line`);
  else if (top.lineLeft < GUTTER - 1) fail(`${w}: cover line at x=${top.lineLeft.toFixed(0)}, inside the ${GUTTER}px gutter`);
  else ok(`${w}  cover line ranged at x=${top.lineLeft.toFixed(0)}`);

  /* --- 1: the section headline's clearance -------------------------------- */
  const gap = await p.evaluate(async () => {
    const h = [...document.querySelectorAll("h2")].find((e) =>
      e.textContent.replace(/\s/g, "").includes("Selectedwriting"),
    );
    if (!h) return null;
    // Scroll so the headline is just on screen — where the section arrives and
    // where the collision was reported.
    const y = h.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, y - 140);
    await new Promise((r) => setTimeout(r, 900));
    const bar = document.querySelector("header[data-overlay] [data-header-bar]");
    if (!bar) return null;
    return h.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
  });

  if (gap === null) fail(`${w}: could not find the Selected writing headline or the header bar`);
  else if (gap < GUTTER) fail(`${w}: "Selected writing" is ${gap.toFixed(0)}px below the header block; §3 asks for at least ${GUTTER}`);
  else ok(`${w}  "Selected writing" clears the header block by ${gap.toFixed(0)}px`);

  await p.close();
}

await b.close();
console.log(failed === 0 ? `\n  the cover's layout invariants hold at ${WIDTHS.length} widths` : `\n  ${failed} problem(s)`);
process.exit(failed === 0 ? 0 : 1);
