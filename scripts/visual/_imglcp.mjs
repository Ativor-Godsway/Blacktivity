// The image's true paint time, measured under reduced motion where Chrome
// actually counts it as an LCP candidate. See the note on cover-print-photo.
import puppeteer from "puppeteer-core";
const URL = process.argv[2];
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--disable-gpu","--no-sandbox"]});
const p = await b.newPage();
await p.setViewport({ width:390, height:844, deviceScaleFactor:2 });
await p.emulateMediaFeatures([{ name:"prefers-reduced-motion", value:"reduce" }]);
const cdp = await p.createCDPSession();
await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
await cdp.send("Network.emulateNetworkConditions",{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
await p.evaluateOnNewDocument(()=>{window.__lcp=[];new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp.push({t:Math.round(e.startTime),tag:e.element?.tagName,cls:(e.element?.className||"").toString().slice(0,40),size:e.size});}).observe({type:"largest-contentful-paint",buffered:true});});
await p.goto(URL,{waitUntil:"load",timeout:120000});
await new Promise(r=>setTimeout(r,9000));
const l = await p.evaluate(()=>window.__lcp);
const last = l[l.length-1];
console.log(`${URL}  (reduced motion)  LCP ${last.t}ms  ${last.tag} size=${last.size} ${last.cls}`);
await b.close(); process.exit(0);
