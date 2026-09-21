import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--hide-scrollbars","--disable-gpu"] });
const p = await b.newPage();

const read = () => p.evaluate(() => {
  const hero = document.querySelector("[data-hero-wordmark] svg");
  const hdr  = document.querySelector("header[data-overlay] [data-wordmark]");
  const cs = (e) => getComputedStyle(e);
  const r = (e) => { const x = e.getBoundingClientRect(); return {l:+x.left.toFixed(1), t:+x.top.toFixed(1), w:+x.width.toFixed(1)}; };
  return {
    y: Math.round(scrollY),
    hero: { ...r(hero), op: +cs(hero.parentElement).opacity, tf: cs(hero.parentElement).transform },
    hdr:  { ...r(hdr),  op: +cs(hdr).opacity },
  };
});

for (const [w,h] of [[1280,800],[1440,900],[1728,1080]]) {
  await p.setViewport({ width: w, height: h });
  await p.goto("http://localhost:3111/", { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 1800));
  console.log(`\n=== ${w}x${h} ===`);
  const travel = h * 0.6;
  let bothVisible = 0, prev = null, flicker = 0;
  for (const frac of [0,0.1,0.25,0.5,0.75,0.9,0.98,1,1.1]) {
    await p.evaluate((y) => window.scrollTo(0, y), Math.round(travel*frac));
    await new Promise(r => setTimeout(r, 260));
    const s = await read();
    if (s.hero.op > 0.02 && s.hdr.op > 0.02) bothVisible++;
    if (prev && frac>0 && (s.hero.t - prev.hero.t) > 1) flicker++;   // must move monotonically up
    prev = s;
    const tag = frac===0 ? "  <- p=0 identity: " + s.hero.tf : frac>=1 ? "  <- docked" : "";
    console.log(`  p=${String(frac).padEnd(5)} heroBox l=${String(s.hero.l).padEnd(6)} t=${String(s.hero.t).padEnd(7)} w=${String(s.hero.w).padEnd(6)} op=${s.hero.op}   hdr l=${s.hdr.l} t=${s.hdr.t} w=${s.hdr.w} op=${s.hdr.op}${tag}`);
  }
  // backwards scrub
  for (const frac of [0.75,0.4,0]) {
    await p.evaluate((y) => window.scrollTo(0, y), Math.round(travel*frac));
    await new Promise(r => setTimeout(r, 200));
    const s = await read();
    if (s.hero.op > 0.02 && s.hdr.op > 0.02) bothVisible++;
  }
  console.log(`  double-wordmark frames: ${bothVisible}   non-monotonic steps: ${flicker}`);
}
await b.close();
