import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--disable-gpu", "--no-sandbox"],
});
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
// Emulate a mid-range Android on 4G, like the Accra audience.
const cdp = await p.createCDPSession();
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Network.emulateNetworkConditions", {
  offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8,
});
await p.evaluateOnNewDocument(() => {
  window.__lcp = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries())
      window.__lcp.push({ t: Math.round(e.startTime), tag: e.element?.tagName, cls: (e.element?.className||"").toString().slice(0,60), size: e.size });
  }).observe({ type: "largest-contentful-paint", buffered: true });
});
await p.goto("http://localhost:3111/", { waitUntil: "load", timeout: 90000 });
await new Promise(r => setTimeout(r, 4000));
const out = await p.evaluate(() => ({
  lcp: window.__lcp,
  fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0),
}));
console.log("FCP:", out.fcp, "ms");
console.log("LCP candidates (last wins):");
for (const c of out.lcp) console.log(`  ${String(c.t).padStart(5)}ms  ${c.tag}  size=${c.size}  ${c.cls}`);
await b.close(); process.exit(0);
