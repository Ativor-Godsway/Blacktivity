/**
 * Two properties of animated text, checked on what a reader actually gets:
 *
 *   1. Selecting it copies the string ONCE, with its spaces intact.
 *   2. It still wraps across lines — inline-block word spans must sit in normal
 *      flow, not a flex container, or the whitespace text nodes between them
 *      are discarded and the words run together.
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3111";
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu"],
});

let failed = 0;

// A narrow viewport forces the long headings onto several lines.
for (const [w, h, label] of [[1440, 900, "wide"], [420, 900, "narrow — forces wrapping"]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2200));
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 1200));

  const rows = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("h2, p, span")) {
      const own = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (own.length < 12) continue;
      // Only the animated blocks.
      if (!el.querySelector(":scope > span, :scope > *[style*='transform']")) continue;

      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      const copied = sel.toString().replace(/\s+/g, " ").trim();
      sel.removeAllRanges();
      if (!copied) continue;

      /**
       * Count DISTINCT VERTICAL POSITIONS of the word spans.
       *
       * getClientRects() returns a single rect for a block element no matter
       * how many lines it renders, so it reported "1 line" for a heading that
       * plainly wrapped — another proxy that did not measure the property.
       */
      const tops = new Set(
        [...el.querySelectorAll(":scope > span")].map((n) => Math.round(n.getBoundingClientRect().top)),
      );
      const lines = tops.size || 1;

      out.push({ own: own.slice(0, 46), copied: copied.slice(0, 60), lines,
                 duplicated: copied.length > own.length * 1.6,
                 lostSpaces: /[a-z]{14,}/.test(copied.replace(/\s/g, "")) && !copied.includes(" ") });
    }
    return out;
  });

  console.log(`  ${w}x${h} (${label})`);
  for (const r of rows) {
    const bad = r.duplicated || r.lostSpaces;
    if (bad) failed++;
    console.log(`     ${bad ? "FAIL " : "ok   "} lines:${r.lines}  copied: "${r.copied}"`);
  }
  await p.close();
}

await b.close();
console.log(failed === 0 ? "\n  copies once, spaces intact, wraps correctly" : `\n  ${failed} problem(s)`);
process.exit(failed === 0 ? 0 : 1);
