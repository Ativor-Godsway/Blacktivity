/**
 * HERO CAROUSEL DIAGNOSIS — Revision 22 §1.
 *
 * The cover has been reported broken twice and twice been "fixed" by reasoning
 * about it. This measures the live DOM instead and prints what is actually
 * there, so the cause can be read off the output rather than argued about.
 *
 *   npm run diagnose:hero                      # against the dev server
 *   URL=http://localhost:3111 npm run diagnose:hero   # against a production build
 *
 * RUN IT AGAINST BOTH. A dev-only fix is not a fix.
 *
 * DRIVER NOTE: §1 is written with Playwright. This repo already drives Chrome
 * with puppeteer-core in some twenty scripts and has no Playwright dependency,
 * so this is the same procedure on the driver that is already here. Adding a
 * second browser automation stack to run one diagnostic would be a worse trade
 * than translating thirty lines.
 */
import puppeteer from "puppeteer-core";

const URL = process.env.URL ?? "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

for (const vp of [
  { width: 1440, height: 900 },
  { width: 402, height: 874, isMobile: true, hasTouch: true },
]) {
  const page = await browser.newPage();
  await page.setViewport({ ...vp, deviceScaleFactor: 1 });
  // A cold load every time: a warm cache is exactly the state that hides a
  // stylesheet that is not being delivered.
  await page.setCacheEnabled(false);

  const errors = [];
  const hydration = [];
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error") errors.push(t.slice(0, 300));
    if (/hydrat|did not match|server rendered HTML/i.test(t)) hydration.push(t.slice(0, 300));
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 300)));

  const failed = [];
  page.on("response", (r) => { if (r.status() >= 400) failed.push(r.status() + " " + r.url()); });

  const imageRequests = [];
  page.on("request", (r) => {
    if (r.resourceType() === "image") imageRequests.push(r.url().replace(URL, ""));
  });

  await page.goto(URL, { waitUntil: "load", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 2600));

  const report = await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: el.className?.toString().slice(0, 240),
        position: cs.position,
        inset: [cs.top, cs.right, cs.bottom, cs.left].join(" "),
        display: cs.display,
        flexDirection: cs.flexDirection,
        opacity: cs.opacity,
        zIndex: cs.zIndex,
        objectFit: cs.objectFit,
        w: Math.round(r.width), h: Math.round(r.height),
        top: Math.round(r.top), left: Math.round(r.left),
      };
    };

    // The permanent hooks, with the pre-Revision-22 names as fallbacks so this
    // can be run against a build that predates them.
    const hero =
      document.querySelector("[data-hero]") ??
      document.querySelector("[data-cover]") ??
      document.querySelector("main > section:first-child");
    const slides = [
      ...document.querySelectorAll('[data-slide], [data-cover-slide], [aria-roledescription="slide"]'),
    ];
    const ticks =
      document.querySelector("[data-ticks]") ?? document.querySelector("[data-cover-ticks]");
    const masthead =
      document.querySelector("[data-masthead]") ?? document.querySelector("[data-cover-masthead]");
    const headerBar = document.querySelector("[data-header-bar]");

    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), left: Math.round(r.left) };
    };
    const mb = box(masthead), hb = box(headerBar);
    const overlap =
      mb && hb
        ? !(mb.right <= hb.left || mb.left >= hb.right || mb.bottom <= hb.top || mb.top >= hb.bottom)
        : null;

    return {
      viewport: [innerWidth, innerHeight],
      groundColour: getComputedStyle(document.documentElement).backgroundColor,
      hero: pick(hero),
      heroParent: pick(hero?.parentElement),
      slideCount: slides.length,
      slides: slides.map(pick),
      slideImages: slides.map((s) => {
        const img = s.querySelector("img");
        return img
          ? { src: (img.currentSrc || "").slice(-46), natural: [img.naturalWidth, img.naturalHeight], ...pick(img) }
          : null;
      }),
      ticks: pick(ticks),
      tickChildren: ticks ? [...ticks.children].map(pick) : [],
      masthead: mb,
      headerBar: hb,
      mastheadOverlapsHeader: overlap,
      sheets: [...document.styleSheets].map((s) => {
        try { return { href: s.href ? s.href.split("/").pop() : "(inline)", rules: s.cssRules.length }; }
        catch { return { href: s.href ? s.href.split("/").pop() : "(inline)", rules: "CORS-blocked" }; }
      }),
    };
  });

  console.log(
    JSON.stringify(
      { url: URL, vp: [vp.width, vp.height], report, errors, hydration, failed, imageRequests },
      null,
      2,
    ),
  );
  await page.close();
}

await browser.close();
process.exit(0);
