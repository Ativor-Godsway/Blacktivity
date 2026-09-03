/**
 * A/B scroll cost. Runs the same scroll twice in one browser session, applying
 * a CSS override on the second pass, so the two numbers are directly
 * comparable. Frame pacing is unreliable in an automated window, so this
 * reports main-thread work, which is not.
 */
import puppeteer from "puppeteer-core";

const URL = process.argv[2];
const VARIANTS = JSON.parse(process.argv[3]); // [{name, css}]
const RUNS = Number(process.argv[4] ?? 2);

// A fresh browser per measurement — reusing one across many traced runs is
// unstable and skews raster numbers as caches warm.
async function measure(css) {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: false,
    args: ["--no-sandbox", "--window-size=1500,1000", "--force-device-scale-factor=1"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 90000 });
  if (css) await page.addStyleTag({ content: css });
  await new Promise((r) => setTimeout(r, 1200));

  const cdp = await page.createCDPSession();
  await cdp.send("Tracing.start", {
    categories: "devtools.timeline,disabled-by-default-devtools.timeline",
    transferMode: "ReturnAsStream",
  });

  await page.evaluate(async () => {
    const step = () => new Promise((r) => requestAnimationFrame(r));
    const total = Math.min(document.body.scrollHeight - innerHeight, 9000);
    for (let i = 0; i <= 200; i++) { window.scrollTo(0, (total * i) / 200); await step(); }
  });

  const stream = await new Promise((res) => {
    cdp.once("Tracing.tracingComplete", (e) => res(e.stream));
    cdp.send("Tracing.end");
  });
  let raw = "";
  for (;;) {
    const { data, eof } = await cdp.send("IO.read", { handle: stream, size: 5_000_000 });
    raw += data; if (eof) break;
  }
  await cdp.send("IO.close", { handle: stream });
  await browser.close();

  const b = { Layout: 0, Styles: 0, Paint: 0, Raster: 0, Decode: 0 };
  for (const e of JSON.parse(raw).traceEvents ?? []) {
    if (e.ph !== "X" || !e.dur) continue;
    if (e.name === "Layout") b.Layout += e.dur;
    else if (e.name === "UpdateLayoutTree") b.Styles += e.dur;
    else if (e.name === "Paint" || e.name === "PaintImage") b.Paint += e.dur;
    else if (e.name === "RasterTask") b.Raster += e.dur;
    else if (e.name === "ImageDecodeTask") b.Decode += e.dur;
  }
  return b;
}

const results = {};
for (const v of VARIANTS) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await measure(v.css));
  const avg = {};
  for (const k of Object.keys(runs[0])) avg[k] = runs.reduce((a, r) => a + r[k], 0) / runs.length / 1000;
  results[v.name] = avg;
}

const keys = Object.keys(Object.values(results)[0]);
console.log("\nmain-thread ms during scroll (avg of " + RUNS + " runs)");
console.log("  " + "variant".padEnd(22) + keys.map(k => k.padStart(9)).join("") + "     TOTAL");
for (const [name, v] of Object.entries(results)) {
  const total = keys.reduce((a, k) => a + v[k], 0);
  console.log("  " + name.padEnd(22) + keys.map(k => v[k].toFixed(1).padStart(9)).join("") + total.toFixed(1).padStart(10));
}

process.exit(0);
