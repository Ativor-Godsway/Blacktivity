/**
 * Enforces the scroll-performance rules that are easy to reintroduce by
 * accident. Comments are stripped first, so the notes explaining *why* these
 * properties are banned do not trip their own check.
 *
 *   node scripts/audit-perf.mjs
 */
import { readFileSync, globSync } from "node:fs";

const RULES = [
  ["mix-blend-mode", /mix-blend-mode|mixBlendMode|\bmix-blend-\w/],
  ["backdrop-filter", /backdrop-filter|backdropFilter|\bbackdrop-blur\b/],
  ["animated filter", /transition-\[filter\]|transition:[^;]*\bfilter\b|will-change:[^;]*filter/],
  ["filter: drop-shadow()", /filter:[^;]*drop-shadow|\bdrop-shadow-/],
  ["scroll listener", /addEventListener\(\s*["']scroll["']/],
  ["layout read in code", /getBoundingClientRect|\.offsetTop\b|\.scrollHeight\b/],
  ["will-change", /will-change|willChange/],

  /**
   * Never distort an image. `object-fit: fill` stretches; setting both width
   * and height in CSS without an aspect-ratio does the same thing more subtly.
   * Cropping (`cover`) and stretching look superficially similar and this is
   * the one that is always a bug.
   */
  ["object-fit: fill", /object-fit:\s*fill|\bobject-fill\b/],
];

/**
 * Blanks out comments while PRESERVING line count, so reported line numbers
 * match the file. Deleting block comments outright shifted every subsequent
 * line number and made the exemption pragma below line up with the wrong line.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^(\s*)\/\/.*$/gm, (_m, indent) => indent);
}

const PRAGMA = /\/\/\s*layout-read-ok:\s*\S+/;

function exemptLines(src) {
  const out = new Set();
  src.split("\n").forEach((line, i) => {
    if (PRAGMA.test(line)) {
      out.add(i + 1); // the pragma line itself
      out.add(i + 2); // and the line it annotates
    }
  });
  return out;
}

const files = globSync("{app,components}/**/*.{ts,tsx,css}");
let failed = 0;

for (const [label, re] of RULES) {
  const hits = [];
  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const exempt = exemptLines(raw);
    const lines = stripComments(raw).split("\n");
    lines.forEach((line, i) => {
      if (exempt.has(i + 1)) return;
      if (re.test(line)) hits.push(`${file}:${i + 1}  ${line.trim().slice(0, 90)}`);
    });
  }
  if (hits.length) {
    failed = 1;
    console.error(`FAIL  no ${label}`);
    for (const h of hits) console.error("        " + h);
  } else {
    console.log(`  ok  no ${label}`);
  }
}

/**
 * PHASE 2 — the rendered page, not the source.
 *
 * Everything above greps source text, which is a proxy: it cannot see a
 * property injected at runtime by a library, an inline style written by
 * Motion, or a rule from a dependency's own stylesheet. The property actually
 * wanted is "no element on the page uses these", so when a base URL is given
 * the same rules are checked against computed styles.
 *
 *   AUDIT_BASE_URL=http://localhost:3111 node scripts/audit-perf.mjs
 */
const base = process.env.AUDIT_BASE_URL;
if (!base) {
  console.log("  --  set AUDIT_BASE_URL to also check computed styles on the rendered pages");
} else {
  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
  });

  const PAGES = ["/", "/articles", "/articles/tailors-of-makola", "/events"];
  const runtimeHits = [];

  for (const path of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
    // Scroll so anything mounted on scroll has run.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await new Promise((r) => setTimeout(r, 900));

    const found = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        const id = el.tagName.toLowerCase() + "." + String(el.className || "").slice(0, 34);

        if (cs.mixBlendMode && cs.mixBlendMode !== "normal") bad.push(`mix-blend-mode: ${cs.mixBlendMode} on ${id}`);
        if (cs.backdropFilter && cs.backdropFilter !== "none") bad.push(`backdrop-filter on ${id}`);
        if (cs.willChange && cs.willChange !== "auto") bad.push(`will-change: ${cs.willChange} on ${id}`);
        if (/filter/.test(cs.transitionProperty)) bad.push(`transitions filter on ${id}`);
        /**
         * `fill` is the CSS initial value and computes on EVERY element, so
         * checking it broadly flags every div, and then every canvas and svg,
         * none of which are being distorted. Only a raster <img>/<video> is
         * actually stretched by it.
         *
         * scripts/visual/image-audit.mjs is the DIRECT measurement — it
         * compares each image's rendered box ratio against its intrinsic ratio
         * — and this is only the cheap guard.
         */
        if (cs.objectFit === "fill" && /^(img|video)$/.test(el.tagName.toLowerCase())) {
          bad.push(`object-fit: fill on ${id}`);
        }
      }
      return bad;
    });

    for (const f of found) runtimeHits.push(`${path}: ${f}`);
    await page.close();
  }

  await browser.close();

  if (runtimeHits.length) {
    failed = 1;
    console.error("FAIL  banned property found on a rendered page");
    for (const h of [...new Set(runtimeHits)].slice(0, 10)) console.error("        " + h);
  } else {
    console.log(`  ok  computed styles clean across ${PAGES.length} rendered pages`);
  }
}

process.exit(failed);
