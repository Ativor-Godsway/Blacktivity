import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--hide-scrollbars","--disable-gpu"] });
const p = await b.newPage();
for (const [w,h] of [[360,780],[390,844],[430,932]]) {
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true });
  await p.goto("http://localhost:3111/", { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 1500));
  const g = await p.evaluate(() => {
    const hero = document.querySelector("section[aria-label='Blacktivity']");
    const svg  = document.querySelector("section[aria-label] svg[data-wordmark]");
    const mq   = document.querySelector("[data-hero-marquee]");
    const hr = hero.getBoundingClientRect(), sr = svg.getBoundingClientRect(), mr = mq.getBoundingClientRect();
    return {
      vh: innerHeight, heroH: Math.round(hr.height),
      heroBottom: Math.round(hr.bottom),
      markBottom: Math.round(sr.bottom), markRight: Math.round(sr.right), vw: innerWidth,
      marqueeBottom: Math.round(mr.bottom),
      pinned: document.documentElement.classList.contains("hero-pin"),
      spacerH: Math.round(document.querySelector("[data-hero-spacer]").getBoundingClientRect().height),
    };
  });
  const dead = g.vh - g.heroH;
  console.log(`${w}x${h}  heroH=${g.heroH} (${Math.round(g.heroH/g.vh*100)}% of vh)  pin=${g.pinned}  markBottom=${g.markBottom} descenderClear=${g.heroBottom-g.markBottom>=0?'in-hero':'BELOW'}  markRight=${g.markRight}/${g.vw}  spacer=${g.spacerH}  ${dead>0?`content-height ✓ (${dead}px shorter than viewport)`:'FULL VIEWPORT'}`);
}
await b.close();
