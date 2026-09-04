/**
 * Checks every image on an article page for distortion, cropping and layout
 * shift. Stretching and cropping look similar; this tells them apart by
 * comparing the rendered box ratio to the image's intrinsic ratio.
 */
import puppeteer from "puppeteer-core";

const url = process.argv[2];
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

await p.evaluateOnNewDocument(() => {
  window.__cls = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
});

await p.goto(url, { waitUntil: "networkidle0", timeout: 90000 });
await new Promise((r) => setTimeout(r, 2500));

const rows = await p.evaluate(() =>
  [...document.querySelectorAll("article img, header img")]
    // The grayscale crossfade plate is decorative and correctly aria-hidden.
    .filter((im) => im.getAttribute("aria-hidden") !== "true")
    .map((im) => {
    const r = im.getBoundingClientRect();
    const cs = getComputedStyle(im);
    return {
      src: (im.currentSrc || im.src).slice(-60),
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      boxRatio: r.height ? +(r.width / r.height).toFixed(3) : 0,
      natRatio: im.naturalHeight ? +(im.naturalWidth / im.naturalHeight).toFixed(3) : 0,
      fit: cs.objectFit,
      pos: cs.objectPosition,
      alt: im.alt,
    };
  }),
);

const cls = await p.evaluate(() => window.__cls);

console.log(`\n${url}`);
console.log(`  CLS: ${cls.toFixed(4)} ${cls <= 0.001 ? "(none)" : cls < 0.1 ? "(passes)" : "FAIL"}`);
for (const r of rows) {
  const distorted = r.fit === "fill" || (r.fit === "none" && Math.abs(r.boxRatio - r.natRatio) > 0.02);
  const cropped = r.fit === "cover" && Math.abs(r.boxRatio - r.natRatio) > 0.02;
  const verdict = distorted
    ? "DISTORTED"
    : cropped
      ? `cropped, focal ${r.pos}`
      : "true ratio";
  console.log(`  ${verdict.padEnd(34)} box ${r.box} (${r.boxRatio}) vs source ${r.natRatio}  fit:${r.fit}`);
  console.log(`    alt: ${r.alt ? `"${r.alt}"` : "MISSING"}   ${r.src}`);
}
await b.close(); process.exit(0);
