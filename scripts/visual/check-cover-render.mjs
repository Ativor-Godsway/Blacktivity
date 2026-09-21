/**
 * THE COVER'S RENDER GUARD — Revision 20 §1.
 *
 * Revision 19's cover shipped correct and then rendered like this on the
 * owner's machine: every slide stacked down the page in document order, two
 * photographs visible at once at different sizes, the progress ticks as a
 * vertical list, the ground still sand, and a slide's placeholder ALT TEXT
 * painted at the top left where its broken image should have been.
 *
 * Every one of those symptoms is a layout the page can reach when the markup
 * arrives without its stylesheet — and the markup and the stylesheet are
 * delivered separately. So this asserts the handful of facts that are true when
 * the cover is assembled and false when it is not, at both the widths that
 * matter, with no tolerance for a console error on the way.
 *
 * IT ASSERTS THE LAYOUT, NOT THE CSS. Checking that a rule exists in the built
 * stylesheet proves the rule was authored; checking that exactly one slide
 * occupies exactly one viewport proves it arrived, applied, and won.
 *
 *   BASE=http://localhost:3111 node scripts/visual/check-cover-render.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3111";
const CASES = [
  { w: 1440, h: 900, label: "desktop" },
  { w: 390, h: 844, label: "phone", mobile: true },
];

let failed = 0;
const fail = (m) => { console.error("  FAIL " + m); failed++; };
const ok = (m) => console.log("  ok   " + m);

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

for (const c of CASES) {
  const p = await browser.newPage();
  await p.setViewport({ width: c.w, height: c.h, deviceScaleFactor: 1, isMobile: !!c.mobile, hasTouch: !!c.mobile });
  // A cold load every time: the break was a cached stylesheet from a previous
  // build, and a warm cache is precisely the state that hides it.
  await p.setCacheEnabled(false);

  const errors = [];
  const hydration = [];
  p.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error") errors.push(t.slice(0, 200));
    // React phrases it several ways across versions; all of them say "hydrat".
    if (/hydrat|did not match|server rendered HTML/i.test(t)) hydration.push(t.slice(0, 200));
  });
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));

  const notFound = [];
  p.on("response", (r) => { if (r.status() >= 400) notFound.push(`${r.status()} ${r.url()}`); });

  await p.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 2600));

  const s = await p.evaluate(() => {
    const isVisible = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        if (parseFloat(cs.opacity) < 0.01) return false;
      }
      return true;
    };
    const slides = [...document.querySelectorAll('[aria-roledescription="slide"]')];
    const active = document.querySelector("[data-cover-slide][data-active]");
    const img = active?.querySelector("img");
    const ticks = [...document.querySelectorAll("[data-cover-tick]")];
    const brokenAlt = [...document.querySelectorAll("img")].filter(
      (i) => i.complete && i.naturalWidth === 0,
    ).map((i) => i.getAttribute("alt")?.slice(0, 60));

    return {
      total: slides.length,
      visible: slides.filter(isVisible).length,
      naturalWidth: img?.naturalWidth ?? 0,
      boxWidth: img ? img.getBoundingClientRect().width : 0,
      slidePosition: slides[0] ? getComputedStyle(slides[0]).position : "none",
      tickTops: [...new Set(ticks.map((t) => Math.round(t.getBoundingClientRect().top)))],
      tickCount: ticks.length,
      ground: getComputedStyle(document.documentElement).backgroundColor,
      vw: window.innerWidth,
      brokenAlt,
    };
  });

  const tag = `${c.label} ${c.w}x${c.h}`;

  // 1 — exactly one slide on screen. Five is the no-CSS layout.
  if (s.visible !== 1) fail(`${tag}: ${s.visible} of ${s.total} slides visible; exactly one may be`);
  else ok(`${tag}  one slide visible of ${s.total}`);

  // 2 — the slides are taken out of flow. `static` IS the broken layout.
  if (s.slidePosition !== "absolute") fail(`${tag}: slides are position:${s.slidePosition}, not absolute — the carousel CSS did not arrive`);
  else ok(`${tag}  slides positioned absolute`);

  // 3 — the active photograph actually decoded.
  if (s.naturalWidth <= 0) fail(`${tag}: the active slide's image has naturalWidth 0 — it did not load`);
  else ok(`${tag}  active image decoded (${s.naturalWidth}px natural)`);

  /*
   * 4 — FULL BLEED. Asserted as ">= viewport", not "== viewport", and the
   * difference is deliberate: the Ken Burns drift holds the photograph between
   * scale 1.06 and 1.0 for the whole slide, so its box is legitimately wider
   * than the viewport for six seconds out of every six. What must never happen
   * is the box being NARROWER — that is symptom (b), a photograph sitting in
   * the middle of the hero with bare ground beside it.
   */
  if (s.boxWidth < s.vw - 0.5) fail(`${tag}: image box is ${Math.round(s.boxWidth)}px against a ${s.vw}px viewport — not full bleed`);
  else ok(`${tag}  image is full bleed (${Math.round(s.boxWidth)}px >= ${s.vw})`);

  // 5 — the ticks are a row. A vertical list is the no-CSS layout.
  if (s.tickCount > 0 && s.tickTops.length !== 1) fail(`${tag}: ticks sit on ${s.tickTops.length} rows (${s.tickTops.join(", ")}) — they must share one`);
  else ok(`${tag}  ${s.tickCount} ticks on one row`);

  // 6 — no broken image is painting its alt text where a photograph belongs.
  if (s.brokenAlt.length) fail(`${tag}: ${s.brokenAlt.length} image(s) failed and are painting alt text: ${JSON.stringify(s.brokenAlt)}`);
  else ok(`${tag}  no broken images`);

  // 7 — the ground is the palette's, not the retired one.
  if (s.ground !== "rgb(14, 12, 11)") fail(`${tag}: page ground is ${s.ground}, expected rgb(14, 12, 11) — the palette did not arrive`);
  else ok(`${tag}  ground is --black`);

  if (errors.length) fail(`${tag}: ${errors.length} console error(s): ${JSON.stringify(errors.slice(0, 3))}`);
  else ok(`${tag}  no console errors`);

  if (hydration.length) fail(`${tag}: hydration warning(s): ${JSON.stringify(hydration.slice(0, 2))}`);
  else ok(`${tag}  no hydration warnings`);

  if (notFound.length) fail(`${tag}: ${notFound.length} request(s) >= 400: ${JSON.stringify(notFound.slice(0, 3))}`);
  else ok(`${tag}  no failed requests`);

  await p.close();
}

await browser.close();
console.log(failed === 0 ? "\n  the cover renders assembled at both widths" : `\n  ${failed} problem(s)`);
process.exit(failed === 0 ? 0 : 1);
