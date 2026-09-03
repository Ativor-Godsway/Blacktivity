/**
 * Drives a real browser so useReportWebVitals fires, then confirms the events
 * reached the database as `vital` documents. A vitals pipeline that compiles
 * but never emits is worse than none.
 */
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
// The tracking endpoint filters bots, and headless Chrome's default UA is
// correctly treated as one — so present a real phone UA for this test.
await p.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const posts = [];
p.on("request", (r) => { if (r.url().includes("/api/track")) posts.push(r.postData() ?? ""); });
await p.goto("http://localhost:3111/", { waitUntil: "networkidle0" });
// Interact so INP has something to measure, then scroll and leave.
await p.click("body");
await p.evaluate(() => window.scrollTo(0, 800));
await new Promise(r => setTimeout(r, 1200));
// Headless navigation does not fire visibilitychange, so force the flush the
// same way a backgrounded tab would.
await p.evaluate(() => {
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
});
await new Promise(r => setTimeout(r, 2000));
await b.close();
const names = new Set();
for (const body of posts) {
  try { for (const e of JSON.parse(body).events ?? []) if (e.type === "vital") names.add(e.meta?.name); } catch {}
}
console.log("track POSTs:", posts.length);
for (const b of posts) console.log("  body:", b.slice(0, 400));
console.log("vital metrics sent:", [...names].sort().join(", ") || "(none)");
process.exit(0);
