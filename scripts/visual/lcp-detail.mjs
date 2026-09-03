import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await p.setCacheEnabled(false);
const cdp = await p.createCDPSession();
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Network.emulateNetworkConditions", { offline:false, latency:150, downloadThroughput:1.6*1024*1024/8, uploadThroughput:750*1024/8 });

const imgs = [];
p.on("response", async (r) => {
  if (r.request().resourceType() !== "image") return;
  let len = Number(r.headers()["content-length"] ?? 0);
  if (!len) { try { len = (await r.buffer()).length; } catch {} }
  imgs.push({ url: r.url(), kb: len/1024, type: r.headers()["content-type"] });
});
await p.evaluateOnNewDocument(() => {
  window.__lcp=[];
  new PerformanceObserver(l=>{for(const e of l.getEntries())
    window.__lcp.push({t:Math.round(e.startTime),tag:e.element?.tagName,size:e.size,url:e.url||""});
  }).observe({type:"largest-contentful-paint",buffered:true});
});
await p.goto("http://localhost:3111/", { waitUntil:"load", timeout:120000 });
await new Promise(r=>setTimeout(r,5000));
const out = await p.evaluate(()=>({lcp:window.__lcp, fcp:Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime||0)}));
console.log("FCP:", out.fcp,"ms");
console.log("LCP candidates:");
for(const c of out.lcp) console.log(`  ${String(c.t).padStart(5)}ms  ${c.tag}  size=${c.size}  ${String(c.url).split("/").pop().slice(0,60)}`);
console.log("images delivered:");
for(const i of imgs.sort((a,b)=>b.kb-a.kb).slice(0,6))
  console.log(`  ${i.kb.toFixed(0).padStart(4)} KB  ${i.type}  ${decodeURIComponent(i.url).split("?")[1]?.slice(0,70) ?? i.url.slice(-50)}`);
await b.close(); process.exit(0);
