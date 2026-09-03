/**
 * Grain is `multiply` at 3% on a light ground, which is easy to get wrong and
 * end up invisible. A noisy region compresses far worse than a flat one, so
 * comparing PNG sizes of the same clip with grain on and off is a cheap,
 * objective proof that it is actually painting.
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

const style = await page.evaluate(() => {
  const g = document.querySelector(".grain");
  if (!g) return null;
  const cs = getComputedStyle(g);
  const r = g.getBoundingClientRect();
  return { blend: cs.mixBlendMode, opacity: cs.opacity, w: Math.round(r.width), h: Math.round(r.height) };
});
console.log("grain element:", JSON.stringify(style));

const clip = { x: 900, y: 180, width: 260, height: 260 };
const withGrain = await page.screenshot({ clip });

await page.evaluate(() => { document.querySelector(".grain").style.display = "none"; });
await new Promise((r) => setTimeout(r, 300));
const withoutGrain = await page.screenshot({ clip });

const ratio = withGrain.length / withoutGrain.length;
console.log(`flat-region PNG bytes: grain=${withGrain.length} none=${withoutGrain.length} ratio=${ratio.toFixed(2)}x`);
console.log(ratio > 1.5 ? "GRAIN IS VISIBLE" : "GRAIN TOO FAINT / NOT PAINTING");

await browser.close();
process.exit(0);
