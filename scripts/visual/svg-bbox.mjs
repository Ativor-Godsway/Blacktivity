import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
const svg = readFileSync("public/brand/blacktivity-wordmark.svg", "utf8");
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"] });
const p = await b.newPage();
await p.setContent(`<body style="margin:0">${svg}</body>`);
const r = await p.evaluate(() => {
  const s = document.querySelector("svg");
  const bb = s.getBBox();
  return { x: bb.x, y: bb.y, w: bb.width, h: bb.height, viewBox: s.getAttribute("viewBox") };
});
console.log("declared viewBox:", r.viewBox);
console.log(`actual content bbox: x=${r.x.toFixed(1)} y=${r.y.toFixed(1)} w=${r.w.toFixed(1)} h=${r.h.toFixed(1)}`);
console.log(`tight viewBox -> "${r.x.toFixed(2)} ${r.y.toFixed(2)} ${r.w.toFixed(2)} ${r.h.toFixed(2)}"`);
console.log("aspect:", (r.w / r.h).toFixed(4));
await b.close(); process.exit(0);
