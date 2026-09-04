/**
 * POST-NAVIGATION CONTENT CHECK
 *
 * Three separate regressions have now hidden real content behind a decorative
 * layer, with different causes and an identical shape:
 *
 *   1. PageTransition server-rendered a black panel over the whole site until
 *      hydration.
 *   2. ScrollReveal parked headings outside their masks waiting for a trigger
 *      that never fired.
 *   3. The View Transitions reveal left pages blank after navigation.
 *
 * Every one of those pages was structurally correct, fast, and passed every
 * other audit. What none of them had was VISIBLE TEXT ON THE FIRST SCREEN.
 *
 * So this asserts exactly that, on every public route, reached two ways —
 * loaded directly, and clicked through from another page, because the third
 * regression only appeared on client-side navigation. It also checks the page
 * starts at the top on a forward navigation and restores position on back.
 *
 *   AUDIT_BASE_URL=http://localhost:3111 node scripts/audit-navigation.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3111";
const ROUTES = ["/", "/articles", "/events", "/creatives", "/about", "/submit"];
const MIN_VISIBLE_CHARS = 40;

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu"],
});

let failed = 0;

/** Characters of text actually painted inside the first screen. */
const VISIBLE_TEXT = () => {
  let chars = 0;
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length > 0) continue;
    const text = el.textContent?.trim();
    if (!text) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (el.closest("[aria-hidden='true']")) continue;

    // Effective opacity through every ancestor.
    let eff = 1;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      eff *= parseFloat(getComputedStyle(n).opacity || "1");
    }
    if (eff < 0.5) continue;

    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.bottom <= 0 || r.top >= innerHeight) continue; // below the fold
    if (r.right <= 0 || r.left >= innerWidth) continue;

    // A full-viewport opaque element painted above it hides it anyway.
    const mid = document.elementFromPoint(
      Math.min(innerWidth - 1, Math.max(1, r.left + r.width / 2)),
      Math.min(innerHeight - 1, Math.max(1, r.top + r.height / 2)),
    );
    if (mid && !el.contains(mid) && !mid.contains(el)) continue;

    if (seen.has(text)) continue;
    seen.add(text);
    chars += text.length;
  }
  return chars;
};

async function directLoad(route) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2200));
  const chars = await p.evaluate(VISIBLE_TEXT);
  const top = await p.evaluate(() => window.scrollY);
  await p.close();
  return { chars, top };
}

async function clickThrough() {
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto(BASE + "/articles", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2200));

  // Scroll down so the "starts at top" assertion means something.
  await p.evaluate(() => window.scrollTo(0, 1400));
  await new Promise((r) => setTimeout(r, 900));
  const fromY = await p.evaluate(() => window.scrollY);

  const results = [];
  const hrefs = await p.$$eval('article a[href^="/articles/"]', (as) =>
    [...new Set(as.map((a) => a.getAttribute("href")))].slice(0, 5),
  );

  for (const href of hrefs) {
    await p.evaluate((h) => {
      const a = [...document.querySelectorAll("a")].find((x) => x.getAttribute("href") === h);
      a?.click();
    }, href);
    await new Promise((r) => setTimeout(r, 2200));

    const chars = await p.evaluate(VISIBLE_TEXT);
    const scrollY = await p.evaluate(() => window.scrollY);
    const url = await p.evaluate(() => location.pathname);

    await p.goBack({ waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1800));
    const backY = await p.evaluate(() => window.scrollY);
    const backChars = await p.evaluate(VISIBLE_TEXT);

    results.push({ href, url, chars, scrollY, backY, backChars });

    // Re-establish the scroll offset for the next iteration.
    await p.evaluate(() => window.scrollTo(0, 1400));
    await new Promise((r) => setTimeout(r, 700));
  }

  await p.close();
  return { fromY, results };
}

console.log("Direct loads — visible text on the first screen:");
for (const route of ROUTES) {
  const { chars, top } = await directLoad(route);
  const ok = chars >= MIN_VISIBLE_CHARS;
  if (!ok) failed = 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${route.padEnd(12)} ${chars} chars visible, scrollY ${top}`);
}

console.log("\nClick-through from /articles (scrolled to 1400):");
const { fromY, results } = await clickThrough();
for (const r of results) {
  const contentOk = r.chars >= MIN_VISIBLE_CHARS;
  const topOk = r.scrollY <= 4;
  const backOk = Math.abs(r.backY - fromY) <= 120 && r.backChars >= MIN_VISIBLE_CHARS;
  if (!contentOk || !topOk || !backOk) failed = 1;
  console.log(
    `  ${contentOk && topOk && backOk ? "ok  " : "FAIL"} ${r.url.padEnd(42)} ` +
    `${r.chars} chars, lands at ${r.scrollY}${topOk ? "" : " (NOT TOP)"}, ` +
    `back to ${r.backY} of ${fromY}${backOk ? "" : " (NOT RESTORED)"}`,
  );
}

await browser.close();
console.log(failed ? "\n  FAILED" : `\n  every route renders visible content and lands correctly`);
process.exit(failed);
