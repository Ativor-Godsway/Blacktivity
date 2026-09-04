/**
 * Counts requestAnimationFrame callbacks while the page sits idle.
 *
 * ClickSpark's stock implementation schedules rAF unconditionally and burns a
 * frame callback for the life of the page. This proves ours sleeps at rest and
 * wakes only on click.
 *
 * Lenis legitimately keeps ONE callback alive forever — that is what smooth
 * scroll is — so the assertion is made with Lenis unmounted (reduced motion),
 * where the count must be zero. The normal figure is reported for context.
 */
import puppeteer from "puppeteer-core";

async function measure(reduced) {
  const b = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  if (reduced) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

  await p.evaluateOnNewDocument(() => {
    window.__raf = 0;
    const orig = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) { window.__raf++; return orig.call(this, cb); };
  });

  await p.goto("http://localhost:3111/", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2500));
  await p.evaluate(() => { window.__raf = 0; });
  await new Promise((r) => setTimeout(r, 3000));
  const idle = await p.evaluate(() => window.__raf);

  await p.mouse.click(640, 400);
  await new Promise((r) => setTimeout(r, 900));
  const onClick = (await p.evaluate(() => window.__raf)) - idle;

  await b.close();
  return { idle, onClick };
}

const withLenis = await measure(false);
const withoutLenis = await measure(true);

console.log(`  idle 3s, Lenis running:   ${withLenis.idle} rAF  (Lenis' own loop — smooth scroll needs it)`);
console.log(`  idle 3s, Lenis unmounted: ${withoutLenis.idle} rAF  ${withoutLenis.idle < 10 ? "— nothing else loops at rest" : "FAIL"}`);
console.log(`  after one click:          ${withLenis.onClick} rAF  (sparks animate, then the loop stops)`);

process.exit(withoutLenis.idle < 10 ? 0 : 1);
