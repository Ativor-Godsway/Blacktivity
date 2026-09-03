/** Exercises the admin: chart tooltip, row selection + bulk bar, detail panel. */
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
const token = readFileSync("/tmp/bt-token.txt","utf8").trim();
const OUT = process.argv[2];
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await p.setCookie({ name:"blacktivity_session", value:token, domain:"localhost", path:"/" });

// --- chart tooltip -------------------------------------------------------
await p.goto("http://localhost:3111/admin", { waitUntil:"domcontentloaded" });
await new Promise(r=>setTimeout(r,2200));
const rects = await p.$$('svg rect[fill="transparent"]');
console.log("chart hit targets:", rects.length);
if (rects.length) {
  await rects[Math.floor(rects.length/2)].hover();
  await new Promise(r=>setTimeout(r,400));
  const tip = await p.evaluate(() => {
    const el = [...document.querySelectorAll(".a-card")].find(n => /pageviews$/i.test(n.textContent?.trim()||"") || /pageviews/.test(n.textContent||"") && n.className.includes("absolute"));
    return el ? el.textContent.trim().slice(0,60) : null;
  });
  console.log("tooltip on hover:", tip ? `"${tip}"` : "not found");
  await p.screenshot({ path: `${OUT}/chart-tooltip.png` });
}

// --- selection + bulk bar + detail panel ---------------------------------
await p.goto("http://localhost:3111/admin/articles", { waitUntil:"domcontentloaded" });
await new Promise(r=>setTimeout(r,2000));
const boxes = await p.$$('tbody input[type="checkbox"]');
console.log("rows:", boxes.length);
await boxes[0].click(); await boxes[1].click();
await new Promise(r=>setTimeout(r,500));
const bulk = await p.evaluate(() => document.querySelector('[role="status"]')?.textContent?.trim() ?? null);
console.log("bulk bar:", bulk ? `"${bulk}"` : "not shown");
await p.screenshot({ path: `${OUT}/bulk-bar.png` });

await p.evaluate(() => document.querySelectorAll('tbody tr')[2]?.dispatchEvent(new MouseEvent("click",{bubbles:true})));
await new Promise(r=>setTimeout(r,600));
const panel = await p.evaluate(() => {
  const a = [...document.querySelectorAll("aside")].find(n => n.className.includes("fixed"));
  return a ? a.textContent.trim().slice(0,60) : null;
});
console.log("detail panel:", panel ? `"${panel}"` : "not shown");
await p.screenshot({ path: `${OUT}/detail-panel.png` });

await b.close(); process.exit(0);
