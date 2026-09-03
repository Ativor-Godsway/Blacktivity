/**
 * Scroll performance harness.
 *
 * Drives a real scroll with the CDP tracing categories DevTools uses, then
 * reports frame pacing plus how much time went to Layout / Paint / Composite.
 * A healthy scroll shows almost nothing but compositing.
 *
 *   node scripts/visual/scroll-perf.mjs <url> <label> [cpuThrottle]
 */
import puppeteer from "puppeteer-core";

const URL = process.argv[2] ?? "http://localhost:3111/";
const LABEL = process.argv[3] ?? "scroll";
const CPU = Number(process.argv[4] ?? 1);

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: process.env.HEADED ? false : "new",
  args: process.env.HEADED
    ? ["--no-sandbox", "--window-size=1500,1000", "--force-device-scale-factor=1"]
    : ["--disable-gpu", "--no-sandbox", "--enable-gpu-rasterization"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const cdp = await page.createCDPSession();
if (CPU > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });

await page.goto(URL, { waitUntil: "networkidle0", timeout: 90000 });
await new Promise((r) => setTimeout(r, 1500));

// Record rAF deltas on the page side — the honest measure of what a user feels.
await page.evaluate(() => {
  window.__frames = [];
  let last = performance.now();
  window.__stop = false;
  const tick = (t) => {
    window.__frames.push(t - last);
    last = t;
    if (!window.__stop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await cdp.send("Tracing.start", {
  categories: "devtools.timeline,disabled-by-default-devtools.timeline",
  transferMode: "ReturnAsStream",
});

// A steady scroll down the page, ~4s.
await page.evaluate(async () => {
  const step = () => new Promise((r) => requestAnimationFrame(r));
  const total = Math.min(document.body.scrollHeight - innerHeight, 9000);
  const frames = 240;
  for (let i = 0; i <= frames; i++) {
    window.scrollTo(0, (total * i) / frames);
    await step();
  }
});

await page.evaluate(() => { window.__stop = true; });

const stream = await new Promise((resolve) => {
  cdp.once("Tracing.tracingComplete", (e) => resolve(e.stream));
  cdp.send("Tracing.end");
});

let raw = "";
for (;;) {
  const { data, eof } = await cdp.send("IO.read", { handle: stream, size: 5_000_000 });
  raw += data;
  if (eof) break;
}
await cdp.send("IO.close", { handle: stream });

const events = JSON.parse(raw).traceEvents ?? [];
const buckets = { Layout: 0, UpdateLayoutTree: 0, Paint: 0, PaintImage: 0, Rasterize: 0, CompositeLayers: 0, DecodeImage: 0 };
for (const e of events) {
  if (e.ph !== "X" || !e.dur) continue;
  const n = e.name;
  if (n === "Layout") buckets.Layout += e.dur;
  else if (n === "UpdateLayoutTree" || n === "RecalculateStyles") buckets.UpdateLayoutTree += e.dur;
  else if (n === "Paint") buckets.Paint += e.dur;
  else if (n === "PaintImage") buckets.PaintImage += e.dur;
  else if (n === "RasterTask") buckets.Rasterize += e.dur;
  else if (n === "CompositeLayers") buckets.CompositeLayers += e.dur;
  else if (n === "ImageDecodeTask" || n === "Decode Image") buckets.DecodeImage += e.dur;
}

const frames = (await page.evaluate(() => window.__frames)).slice(2);
frames.sort((a, b) => a - b);
const pct = (p) => frames[Math.floor(frames.length * p)] ?? 0;
const over16 = frames.filter((f) => f > 16.7).length;
const over32 = frames.filter((f) => f > 32).length;

console.log(`\n=== ${LABEL} ${CPU > 1 ? `(CPU x${CPU})` : "(desktop)"} ===`);
console.log(`  frames: ${frames.length}`);
console.log(`  median ${pct(0.5).toFixed(1)}ms | p95 ${pct(0.95).toFixed(1)}ms | worst ${frames[frames.length-1]?.toFixed(1)}ms`);
console.log(`  janky:  ${over16} frames >16.7ms (${((over16/frames.length)*100).toFixed(1)}%), ${over32} >32ms`);
console.log("  main-thread work during scroll (ms):");
for (const [k, v] of Object.entries(buckets)) {
  if (v > 0) console.log(`     ${k.padEnd(18)} ${(v / 1000).toFixed(1)}`);
}

await browser.close();
process.exit(0);
