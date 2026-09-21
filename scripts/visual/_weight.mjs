/**
 * First-view transfer weight, by resource type, from the CDP network events
 * (encodedDataLength — the bytes actually on the wire, including headers and
 * after compression). `content-length` is missing on Next's streamed responses,
 * so counting that header under-reports the JS by an order of magnitude.
 */
import puppeteer from "puppeteer-core";
const URL = process.argv[2] ?? "http://localhost:3111/";
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--disable-gpu","--no-sandbox"]});
const p = await b.newPage();
await p.setViewport({ width:390, height:844, deviceScaleFactor:2 });
const cdp = await p.createCDPSession();
await cdp.send("Network.enable");
const byType = {}; const byUrl = [];
const types = new Map();
cdp.on("Network.responseReceived", (e) => types.set(e.requestId, { type: e.type, url: e.response.url }));
cdp.on("Network.loadingFinished", (e) => {
  const t = types.get(e.requestId); if (!t) return;
  byType[t.type] = (byType[t.type] ?? 0) + e.encodedDataLength;
  byUrl.push([t.url.replace(URL.replace(/\/$/,""), ""), e.encodedDataLength]);
});
await p.goto(URL, { waitUntil:"load", timeout:120000 });
await new Promise(r=>setTimeout(r,3500));
const total = Object.values(byType).reduce((a,b)=>a+b,0);
console.log(`first view, 390px: ${(total/1024).toFixed(0)}KB total`);
for (const [k,v] of Object.entries(byType).sort((a,b)=>b[1]-a[1])) console.log(`  ${k.padEnd(12)} ${(v/1024).toFixed(0)}KB`);
console.log("  largest:");
for (const [u,v] of byUrl.sort((a,b)=>b[1]-a[1]).slice(0,8)) console.log(`    ${(v/1024).toFixed(0).padStart(5)}KB  ${u.slice(0,72)}`);
await b.close(); process.exit(0);
