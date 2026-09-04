/**
 * Sparks must land under the pointer. The classic failure is computing
 * coordinates from getBoundingClientRect() while the backing store is not
 * transformed — any transformed ancestor then introduces offset and scale.
 *
 * This clicks known points and measures where ink actually appears on the
 * canvas, so the answer is pixels, not reasoning.
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3111";
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu"],
});

async function run(zoom, scrollY) {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800, deviceScaleFactor: zoom });
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2200));
  if (scrollY) { await p.evaluate((y) => window.scrollTo(0, y), scrollY); await new Promise((r) => setTimeout(r, 600)); }

  const ancestors = await p.evaluate(() => {
    const c = document.querySelector("canvas[aria-hidden]");
    if (!c) return { found: false };
    const chain = [];
    for (let n = c.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const t = getComputedStyle(n).transform;
      if (t && t !== "none") chain.push(`${n.tagName}.${String(n.className).slice(0, 30)} => ${t}`);
    }
    return { found: true, transformed: chain, position: getComputedStyle(c).position };
  });
  if (!ancestors.found) { console.log("  no spark canvas found"); await p.close(); return; }

  const points = [[80, 80], [1200, 80], [640, 400], [80, 720], [1200, 720]];
  const errs = [];
  for (const [x, y] of points) {
    await p.mouse.click(x, y);
    await new Promise((r) => setTimeout(r, 90)); // mid-animation, sparks are near the origin
    const centre = await p.evaluate(() => {
      const c = document.querySelector("canvas[aria-hidden]");
      const ctx = c.getContext("2d");
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sx = 0, sy = 0, n = 0;
      for (let i = 3; i < d.length; i += 4) {
        if (d[i] > 12) { const px = ((i - 3) / 4) % c.width, py = Math.floor(((i - 3) / 4) / c.width); sx += px; sy += py; n++; }
      }
      if (!n) return null;
      const dpr = c.width / c.clientWidth;
      return { x: sx / n / dpr, y: sy / n / dpr };
    });
    if (!centre) { errs.push(`(${x},${y}) no ink`); continue; }
    const dx = Math.round(centre.x - x), dy = Math.round(centre.y - y);
    errs.push(`(${x},${y}) off by ${dx},${dy}`);
    await new Promise((r) => setTimeout(r, 450)); // let sparks clear
  }

  console.log(`  dpr ${zoom}, scrollY ${scrollY}: position:${ancestors.position}, transformed ancestors: ${ancestors.transformed.length ? ancestors.transformed.join(" | ") : "none"}`);
  console.log(`     ${errs.join("   ")}`);
  await p.close();
}

await run(1, 0);
await run(1, 900);
await run(1.25, 0);
await b.close();
process.exit(0);
