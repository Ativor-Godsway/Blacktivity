/**
 * READABLE-AT-REST AUDIT
 *
 * Two rules, both learned the hard way:
 *
 *   1. No text may be effectively invisible with JavaScript disabled. Animated
 *      text has hidden itself twice on this site — once at `opacity: 0.1` with
 *      a blur, once translated 110% outside an `overflow-hidden` mask — and
 *      both times it was selectable but not visible.
 *
 *   2. No string may render twice. A visually-hidden "accessible copy" beside
 *      an animated one means selecting the heading copies it twice.
 *
 * Checked with JS OFF (the resting state a bot or a failed script sees) and
 * with JS ON (what a reader gets).
 *
 *   AUDIT_BASE_URL=http://localhost:3111 node scripts/audit-text.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3111";
const PAGES = ["/", "/articles", "/rotation", "/about", "/events", "/submit"];
const MIN_OPACITY = 0.5;

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu"],
});

let failed = 0;

async function scan(path, js) {
  const p = await browser.newPage();
  await p.setJavaScriptEnabled(js);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, js ? 2200 : 700));

  const result = await p.evaluate((minOpacity) => {
    const faint = [];
    const clipped = [];

    for (const el of document.querySelectorAll("body *")) {
      // Only leaf elements that actually carry words.
      if (el.children.length > 0) continue;
      const text = el.textContent?.trim();
      if (!text || text.length < 2) continue;
      // Deliberately hidden from users (honeypots, decorative layers).
      if (el.closest("[aria-hidden='true']")) continue;

      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;

      // Effective opacity is the product of every ancestor's opacity.
      let eff = 1;
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        eff *= parseFloat(getComputedStyle(n).opacity || "1");
      }
      if (eff < minOpacity) {
        faint.push({ text: text.slice(0, 40), opacity: +eff.toFixed(2) });
        continue;
      }

      // Translated entirely outside an overflow-hidden ancestor is invisible
      // just as surely as opacity 0, and is easy to miss.
      const r = el.getBoundingClientRect();
      const clipper = el.parentElement;
      if (clipper && getComputedStyle(clipper).overflow === "hidden") {
        const cr = clipper.getBoundingClientRect();
        if (r.height > 0 && (r.top >= cr.bottom - 0.5 || r.bottom <= cr.top + 0.5)) {
          clipped.push({ text: text.slice(0, 40) });
        }
      }
    }
    return { faint, clipped };
  }, MIN_OPACITY);

  await p.close();
  return result;
}

async function duplicates(path) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2200));

  // Select each heading and see whether its own text comes back twice.
  const dupes = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("h1, h2, h3, p")) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const copied = sel.toString().replace(/\s+/g, " ").trim();
      sel.removeAllRanges();
      if (!copied || copied.length < 8) continue;

      // Compare against the element's own normalised text.
      const own = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      // A duplicate shows up as the copy being close to twice the length.
      if (copied.length > own.length * 1.6) {
        out.push({ tag: el.tagName, copied: copied.slice(0, 70) });
      }
    }
    return out;
  });
  await p.close();
  return dupes;
}

for (const path of PAGES) {
  const off = await scan(path, false);
  const on = await scan(path, true);
  const dupes = await duplicates(path);

  const problems = [];
  for (const f of off.faint) problems.push(`JS OFF: "${f.text}" at opacity ${f.opacity}`);
  for (const c of off.clipped) problems.push(`JS OFF: "${c.text}" translated outside its mask`);
  for (const c of on.clipped) problems.push(`JS ON:  "${c.text}" translated outside its mask`);
  for (const d of dupes) problems.push(`selection duplicates <${d.tag}>: "${d.copied}"`);

  if (problems.length) {
    failed = 1;
    console.error(`FAIL  ${path}`);
    for (const pr of problems.slice(0, 6)) console.error("        " + pr);
  } else {
    console.log(`  ok  ${path} — readable at rest, no duplicated text`);
  }
}

await browser.close();
process.exit(failed);
