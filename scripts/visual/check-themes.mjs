/**
 * THE ALTERNATION, AND ITS CONTRAST — Revision 20 §2 and §3.
 *
 * `audit:contrast` proves the TOKENS are measured correctly. It cannot prove
 * that the right token reached the right element: a theme scope that forgets to
 * re-point one variable leaves that variable at the other ground's value, and
 * the result is a real pairing the token table says nothing about.
 *
 * That is not hypothetical. The header bar re-pointed four tokens and the
 * active nav item used a fifth, so "ABOUT" rendered in --tan on the white
 * /about page at 1.78:1 — while every entry in the contrast table passed.
 *
 * So this walks the RENDERED page, samples what each theme's text actually
 * computes to against what its ground actually computes to, and does the
 * arithmetic. It also asserts the structural rules §2.3 sets out: no two
 * adjacent sections share a theme, and the named pages are the theme the owner
 * asked for.
 *
 *   BASE=http://localhost:3111 node scripts/visual/check-themes.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3111";
const AA = 4.5;
const AA_LARGE = 3;

/** Pages whose theme the owner named, and what they must be. */
const EXPECTED = [
  { path: "/", first: "dark", alternates: true, label: "home" },
  { path: "/about", first: "light", allLight: true, label: "about (What we are)" },
  { path: "/articles/accra-at-four-am", first: "light", lastDark: true, label: "an article" },
  { path: "/articles", first: "dark", label: "articles index" },
  { path: "/events", first: "dark", label: "events" },
  { path: "/rotation", first: "dark", label: "rotation" },
  { path: "/submit", first: "dark", label: "submit" },
];

let failed = 0;
const fail = (m) => { console.error("  FAIL " + m); failed++; };
const ok = (m) => console.log("  ok   " + m);

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

for (const page of EXPECTED) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(BASE + page.path, { waitUntil: "load", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));

  const data = await p.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    const ratio = (a, b) => {
      const [hi, lo] = [lum(parse(a)), lum(parse(b))].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    /*
     * THE GROUND IS THE NEAREST PAINTED ANCESTOR, not the section.
     *
     * A button paints its own background — the Submit CTA is --fg ground with
     * --bg text — so measuring its label against the SECTION's ground reports
     * paper on paper at 1.00 and calls a perfectly readable button invisible.
     * The first version of this script did exactly that.
     *
     * Walking up to the first non-transparent background is what a browser
     * actually composites against, short of alpha blending, which nothing on
     * this site uses for a text ground.
     */
    const groundOf = (el, fallback) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && bg !== "transparent" && !/rgba\(0, 0, 0, 0\)/.test(bg)) return bg;
      }
      return fallback;
    };

    const sections = [...document.querySelectorAll("[data-theme]")];
    const samples = [];

    for (const s of sections) {
      const ground = getComputedStyle(s).backgroundColor;
      // Every text-bearing leaf inside the section, plus the header if it is
      // over this one. Capped so a long page does not take a minute.
      const leaves = [...s.querySelectorAll("a, p, span, h1, h2, h3, li, button, dt, dd")]
        .filter((el) => el.children.length === 0 && (el.textContent ?? "").trim().length > 1)
        .slice(0, 120);
      for (const el of leaves) {
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        if (el.getClientRects().length === 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 1 && r.height <= 1) continue;
        // Text over a photograph is protected by a scrim, not by the ground;
        // §5 measures those separately against sampled pixels.
        if (el.closest("[data-cover], [data-rotation]")) continue;
        const size = parseFloat(cs.fontSize);
        const bold = Number(cs.fontWeight) >= 700;
        const large = size >= 24 || (size >= 18.66 && bold);
        const bg = groundOf(el, ground);
        samples.push({
          theme: s.dataset.theme,
          text: (el.textContent ?? "").trim().slice(0, 34),
          colour: cs.color,
          ground: bg,
          ratio: ratio(cs.color, bg),
          bar: large ? 3 : 4.5,
        });
      }
    }

    const header = document.querySelector("header");
    const bar = document.querySelector("[data-header-bar]");
    const headerSamples = [];
    if (header && bar) {
      const hTheme = header.getAttribute("data-header-theme");
      const hGround = hTheme === "light" ? "rgb(246, 244, 240)" : "rgb(14, 12, 11)";
      for (const el of bar.querySelectorAll("a, span, button")) {
        if (el.children.length > 0) continue;
        const t = (el.textContent ?? "").trim();
        if (t.length < 2) continue;
        const cs = getComputedStyle(el);
        headerSamples.push({
          text: t.slice(0, 24), colour: cs.color, ground: hGround,
          ratio: ratio(cs.color, hGround), theme: hTheme,
        });
      }
    }

    return {
      themes: sections.map((s) => s.dataset.theme),
      samples,
      headerSamples,
      headerTheme: header?.getAttribute("data-header-theme") ?? null,
    };
  });

  const tag = page.label;

  if (data.themes.length === 0) { fail(`${tag}: no [data-theme] sections on the page`); await p.close(); await ctx.close(); continue; }

  // --- structure ---------------------------------------------------------
  if (data.themes[0] !== page.first) fail(`${tag}: opens on "${data.themes[0]}", expected "${page.first}"`);
  else ok(`${tag.padEnd(22)} opens ${page.first}  [${data.themes.join(" → ")}]`);

  if (page.alternates) {
    const clashes = data.themes.filter((t, i) => i > 0 && t === data.themes[i - 1]).length;
    if (clashes) fail(`${tag}: ${clashes} adjacent section pair(s) share a theme`);
    else ok(`${tag.padEnd(22)} no two adjacent sections share a theme`);
  }
  if (page.allLight) {
    const dark = data.themes.slice(0, -1).filter((t) => t === "dark").length;
    if (dark) fail(`${tag}: ${dark} dark section(s) above the footer; §2.3 says light throughout`);
    else ok(`${tag.padEnd(22)} light throughout, footer aside`);
  }
  if (page.lastDark) {
    if (data.themes[data.themes.length - 2] !== "dark")
      fail(`${tag}: the band before the footer is "${data.themes[data.themes.length - 2]}"; §3 wants it dark`);
    else ok(`${tag.padEnd(22)} ends on a dark band before the footer`);
  }

  // --- contrast, as rendered ---------------------------------------------
  const bad = data.samples.filter((s) => s.ratio < s.bar - 0.01);
  if (bad.length) {
    fail(`${tag}: ${bad.length} text element(s) under the bar on their own ground:`);
    for (const b of bad.slice(0, 5)) console.error(`         "${b.text}" ${b.ratio.toFixed(2)} (needs ${b.bar}) — ${b.colour} on ${b.ground} [${b.theme}]`);
  } else ok(`${tag.padEnd(22)} ${data.samples.length} text elements all clear their bar`);

  const badHeader = data.headerSamples.filter((s) => s.ratio < AA - 0.01);
  if (badHeader.length) {
    fail(`${tag}: header text under AA on a ${data.headerTheme} ground:`);
    for (const b of badHeader) console.error(`         "${b.text}" ${b.ratio.toFixed(2)} — ${b.colour} on ${b.ground}`);
  } else ok(`${tag.padEnd(22)} header (${data.headerTheme}) ${data.headerSamples.length} items clear AA`);

  await p.close();
  await ctx.close();
}

await browser.close();
void AA_LARGE;
console.log(failed === 0 ? "\n  the alternation holds and every ground carries readable type" : `\n  ${failed} problem(s)`);
process.exit(failed === 0 ? 0 : 1);
