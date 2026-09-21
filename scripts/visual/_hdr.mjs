import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--hide-scrollbars","--disable-gpu"] });
const p = await b.newPage();
await p.goto("http://localhost:3111/", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 1500));
for (const w of [768, 1024, 1280, 1440, 1728, 2560]) {
  await p.setViewport({ width: w, height: 900 });
  await new Promise(r => setTimeout(r, 400));
  const g = await p.evaluate(() => {
    const bar = document.querySelector("header[data-overlay] [data-header-bar]");
    const nav = document.querySelector("header[data-overlay] nav[aria-label='Primary']");
    const ed  = [...document.querySelectorAll("section[aria-label] .mono")].find(e => e.textContent.includes("EDITION"));
    const r = (e) => e ? (({top,bottom}) => ({top:Math.round(top),bottom:Math.round(bottom)}))(e.getBoundingClientRect()) : null;
    return { bar: r(bar), nav: r(nav), ed: r(ed) };
  });
  console.log(`${String(w).padStart(5)}  barH=${g.bar.bottom-g.bar.top}  navBottom=${g.nav?.bottom}  edTop=${g.ed?.top}  GAP=${g.ed&&g.nav ? g.ed.top-g.nav.bottom : "n/a"}`);
}
await b.close();
