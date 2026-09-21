/**
 * Grain is light speckle at 5% on a near-black ground — easy to get wrong and
 * end up invisible either way. A noisy region compresses far worse than a flat
 * one, so comparing PNG sizes of the same clip with grain on and off is a
 * cheap, objective proof that it is actually painting.
 *
 * IT HAS TO SAMPLE A FLAT REGION, AND REVISION 19 MOVED THE ONLY ONE.
 *
 * The clip used to sit at (900, 180) on the homepage, which was flat sand. That
 * is now the middle of a full-bleed photograph — and a photograph is already
 * noise, so the grain's contribution to the compressed size disappears into it.
 * The measurement drops to ~1.3x and the check reports "too faint" about a
 * grain that is painting perfectly well.
 *
 */
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--hide-scrollbars", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto("http://localhost:3111/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1500));

/*
 * NO SCROLLING. `page.screenshot({ clip })` takes DOCUMENT coordinates, so on a
 * scrolled page the clip lands wherever those coordinates are in the document
 * rather than on screen — and the grain is `position: fixed`, so it is not
 * there. That combination measured a patch of the cover photograph with no
 * grain over it and reported 1.00x both ways.
 *
 * The injected panel below is fixed to the viewport at the top of the page, so
 * document and viewport coordinates agree and there is nothing to scroll to.
 */

const style = await page.evaluate(() => {
  const g = document.querySelector(".grain");
  if (!g) return null;
  const cs = getComputedStyle(g);
  const r = g.getBoundingClientRect();
  return { blend: cs.mixBlendMode, opacity: cs.opacity, w: Math.round(r.width), h: Math.round(r.height) };
});
console.log("grain element:", JSON.stringify(style));

/*
 * A FLAT TEST PANEL, INJECTED UNDER THE GRAIN.
 *
 * The check used to clip a region of the page and hope it was flat. On the
 * Revision 19 homepage nothing above the fold is — it is a full-bleed
 * photograph — and every candidate further down is a card, a hairline or a
 * heading. A photograph is already noise, so the grain's contribution to the
 * compressed size vanishes into it and the check reports "too faint" about a
 * grain that is painting correctly.
 *
 * So the flat region is MADE rather than found: one --black panel at a known
 * position at the top of the page, z-index below the grain's 40, covering the
 * clip exactly. What is
 * then measured is the one thing the check is actually about — whether the
 * grain tile is visibly painting on the page ground.
 */
const clip = { x: 400, y: 300, width: 256, height: 256 };

await page.evaluate((c) => {
  const panel = document.createElement("div");
  panel.id = "grain-probe";
  Object.assign(panel.style, {
    position: "fixed",
    left: c.x + "px",
    top: c.y + "px",
    width: c.width + "px",
    height: c.height + "px",
    // --black, read from the stylesheet rather than from body's computed
    // background: body may resolve to a transparent value that inherits the
    // html ground, and a transparent probe measures nothing.
    background: getComputedStyle(document.documentElement).getPropertyValue("--color-black").trim() || "#0E0C0B",
    zIndex: "39",
  });
  document.body.appendChild(panel);
}, clip);
await new Promise((r) => setTimeout(r, 300));

const withGrain = await page.screenshot({ clip });

await page.evaluate(() => { document.querySelector(".grain").style.display = "none"; });
await new Promise((r) => setTimeout(r, 300));
const withoutGrain = await page.screenshot({ clip });

const ratio = withGrain.length / withoutGrain.length;
console.log(`flat-panel PNG bytes: grain=${withGrain.length} none=${withoutGrain.length} ratio=${ratio.toFixed(2)}x`);
console.log(ratio > 1.5 ? "GRAIN IS VISIBLE" : "GRAIN TOO FAINT / NOT PAINTING");

await browser.close();
process.exit(0);
