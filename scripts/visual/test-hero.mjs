/**
 * THE HERO RENDER TEST — Revision 22 §5.
 *
 * Nine assertions, at 1440x900 and 402x874, AGAINST A PRODUCTION BUILD. Every
 * one of them was false in the state the owner reported twice, and none of the
 * existing audits caught it, because they all measured things that were fine.
 *
 * It runs with the cache disabled, because a warm cache is exactly the state
 * that hides a stylesheet which is not being delivered.
 *
 *   npm run build && npm start
 *   BASE=http://localhost:3111 npm run test:hero
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3111";
const CASES = [
  { w: 1440, h: 900, label: "desktop" },
  { w: 402, h: 874, label: "phone", mobile: true },
];

let failed = 0;
const fail = (m) => { console.error("  FAIL " + m); failed++; };
const ok = (m) => console.log("  ok   " + m);

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

for (const c of CASES) {
  const page = await browser.newPage();
  await page.setViewport({ width: c.w, height: c.h, deviceScaleFactor: 1, isMobile: !!c.mobile, hasTouch: !!c.mobile });
  await page.setCacheEnabled(false);

  const errors = [];
  const hydration = [];
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error") errors.push(t.slice(0, 200));
    if (/hydrat|did not match|server rendered HTML/i.test(t)) hydration.push(t.slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));

  /*
   * Only cover photographs are counted, and only UNTIL THE LOAD EVENT.
   *
   * Both halves of that matter. The page legitimately fetches the grain tiles
   * and a Cloudinary card image; what §5.9 is about is not putting two
   * full-viewport hero photographs on the wire at once.
   *
   * And "on first load" is the load event, not "ever". The carousel warms
   * slide 02 one step ahead so that the change at six seconds is not the first
   * time its image is asked for — that is Revision 19 §8 and it is wanted.
   * What is not wanted is that request competing with the LCP, so it waits for
   * `load` and then for an idle callback. Counting past the load event would
   * be asserting that the preload does not exist.
   */
  const coverImages = [];
  let loaded = false;
  page.on("request", (r) => {
    if (loaded || r.resourceType() !== "image") return;
    const u = r.url();
    if (u.includes("/cover/")) coverImages.push(u.split("/cover/")[1]);
  });

  await page.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
  loaded = true;
  await new Promise((r) => setTimeout(r, 2200));

  const m = await page.evaluate(() => {
    const hero = document.querySelector("[data-hero]");
    const slides = [...document.querySelectorAll("[data-slide]")];
    const ticks = document.querySelector("[data-ticks]");
    const masthead = document.querySelector("[data-masthead]");
    const headerBar = document.querySelector("[data-header-bar]");
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const active = slides.find((s) => Number(getComputedStyle(s).opacity) > 0.5);
    const img = active?.querySelector("img");
    return {
      hasHero: !!hero,
      heroRect: hero ? rect(hero) : null,
      // 100svh in px, asked of the browser rather than assumed.
      svh: (() => {
        const p = document.createElement("div");
        p.style.cssText = "position:fixed;height:100svh;width:0;visibility:hidden";
        document.body.appendChild(p);
        const h = p.getBoundingClientRect().height;
        p.remove();
        return h;
      })(),
      slideCount: slides.length,
      opacities: slides.map((s) => Number(getComputedStyle(s).opacity)),
      positions: slides.map((s) => getComputedStyle(s).position),
      tops: slides.map((s) => Math.round(s.getBoundingClientRect().top)),
      lefts: slides.map((s) => Math.round(s.getBoundingClientRect().left)),
      naturalWidth: img?.naturalWidth ?? 0,
      ticksDirection: ticks ? getComputedStyle(ticks).flexDirection : null,
      ticksDisplay: ticks ? getComputedStyle(ticks).display : null,
      tickTops: ticks ? [...ticks.children].map((k) => Math.round(k.getBoundingClientRect().top)) : [],
      masthead: masthead ? rect(masthead) : null,
      headerBar: headerBar ? rect(headerBar) : null,
    };
  });

  const t = `${c.label} ${c.w}x${c.h}`;

  if (!m.hasHero) { fail(`${t}: no [data-hero] element`); await page.close(); continue; }

  // 1 — exactly one slide showing.
  const visible = m.opacities.filter((o) => o > 0.5).length;
  const hidden = m.opacities.filter((o) => o < 0.1).length;
  if (visible !== 1 || hidden !== m.slideCount - 1) {
    fail(`${t}: opacities ${JSON.stringify(m.opacities)} — exactly one slide may be over 0.5 and the rest under 0.1`);
  } else ok(`${t}  one slide visible of ${m.slideCount}`);

  // 2 — every slide out of flow.
  if (m.positions.some((p) => p !== "absolute")) {
    fail(`${t}: slide positions ${JSON.stringify(m.positions)} — all must be absolute`);
  } else ok(`${t}  all slides position:absolute`);

  // 3 — stacked, not listed. This is the assertion that fails loudest.
  const stacked = new Set(m.tops).size === 1 && new Set(m.lefts).size === 1;
  if (!stacked) {
    fail(`${t}: slide tops ${JSON.stringify(m.tops)} lefts ${JSON.stringify(m.lefts)} — they must share one origin`);
  } else ok(`${t}  slides stacked at one origin (${m.tops[0]}, ${m.lefts[0]})`);

  // 4 — the track fills the viewport and is one svh tall.
  if (m.heroRect.w !== c.w) fail(`${t}: track is ${m.heroRect.w}px wide against a ${c.w}px viewport`);
  else if (Math.abs(m.heroRect.h - m.svh) > 2) fail(`${t}: track is ${m.heroRect.h}px tall, 100svh is ${Math.round(m.svh)}px`);
  else ok(`${t}  track is ${m.heroRect.w}x${m.heroRect.h} (100svh = ${Math.round(m.svh)})`);

  // 5 — the visible photograph actually decoded.
  if (m.naturalWidth <= 0) fail(`${t}: the active slide's image has naturalWidth 0`);
  else ok(`${t}  active image decoded (${m.naturalWidth}px natural)`);

  // 6 — the tick row is a row.
  if (m.ticksDisplay === "none") {
    fail(`${t}: the tick row is display:none with scripting on`);
  } else if (m.ticksDirection !== "row" || new Set(m.tickTops).size > 1) {
    fail(`${t}: ticks are ${m.ticksDisplay}/${m.ticksDirection} on ${new Set(m.tickTops).size} rows`);
  } else ok(`${t}  ${m.tickTops.length} ticks on one row`);

  // 7 — the masthead and the header do not touch.
  const a = m.masthead, b = m.headerBar;
  if (!a || !b) fail(`${t}: masthead or header bar missing`);
  else {
    const overlap = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    if (overlap) fail(`${t}: the masthead ${JSON.stringify(a)} intersects the header ${JSON.stringify(b)}`);
    else ok(`${t}  masthead clears the header by ${a.top - b.bottom}px`);
  }

  // 8 — a clean console.
  if (errors.length) fail(`${t}: ${errors.length} console error(s): ${JSON.stringify(errors.slice(0, 2))}`);
  else ok(`${t}  no console errors`);
  if (hydration.length) fail(`${t}: hydration warning(s): ${JSON.stringify(hydration.slice(0, 2))}`);
  else ok(`${t}  no hydration warnings`);

  // 9 — one hero photograph on the wire, not two.
  if (coverImages.length > 1) fail(`${t}: ${coverImages.length} cover images requested before the load event: ${JSON.stringify(coverImages)}`);
  else ok(`${t}  one cover image before load (${coverImages[0] ?? "none"}); slide 02 warms after it`);

  await page.close();
}

await browser.close();
console.log(failed === 0 ? "\n  the hero renders as a carousel at both viewports" : `\n  ${failed} failure(s)`);
process.exit(failed === 0 ? 0 : 1);
