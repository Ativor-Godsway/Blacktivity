/**
 * Is the wordmark's clipPath actually cutting the artwork?
 *
 * The source SVG carries a 592x280 clip rect while the real glyph bounds are
 * 1059x244. React silently dropped `clip-path` (kebab-case), so the clip was
 * inert; converting it to `clipPath` makes it live.
 *
 * Measured by PAINTED PIXELS, not getBBox — getBBox returns geometry bounds and
 * is unaffected by clipping, so it cannot answer this question at all.
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3111";
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({ width: 1400, height: 900 });
await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise((r) => setTimeout(r, 1800));

async function inkExtent() {
  return p.evaluate(async () => {
    const svg = document.querySelector("svg[data-wordmark]");
    const rect = svg.getBoundingClientRect();
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

    const c = document.createElement("canvas");
    c.width = Math.round(rect.width); c.height = Math.round(rect.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;

    let minX = c.width, maxX = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 20) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
      }
    }
    return { boxWidth: Math.round(rect.width), inkFrom: minX, inkTo: maxX, inkWidth: maxX - minX };
  });
}

const before = await inkExtent();

// Now neutralise the clip and measure again.
await p.evaluate(() => {
  document.querySelectorAll("svg[data-wordmark] [clip-path]").forEach((g) => g.removeAttribute("clip-path"));
});
const after = await inkExtent();

console.log(`  painted ink WITH clip:    ${before.inkFrom}..${before.inkTo} of ${before.boxWidth}px box`);
console.log(`  painted ink WITHOUT clip: ${after.inkFrom}..${after.inkTo} of ${after.boxWidth}px box`);
const cut = after.inkWidth - before.inkWidth;
console.log(cut > 2
  ? `  => THE CLIP IS CUTTING ${cut}px of artwork`
  : `  => the clip removes nothing (difference ${cut}px)`);
await b.close(); process.exit(0);
