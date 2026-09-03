import puppeteer from "puppeteer-core";
for (const [w,h] of [[360,780],[1440,900],[2560,1400]]) {
  const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"]});
  const p = await b.newPage();
  await p.setViewport({width:w,height:h,deviceScaleFactor:1});
  await p.goto("http://localhost:3111/",{waitUntil:"networkidle0"});
  await new Promise(r=>setTimeout(r,900));
  const g = await p.evaluate(() => {
    const svg = document.querySelector("section[aria-label] svg");
    const stack = document.querySelector('section[aria-label] .aspect-4\\/5');
    const r = svg.getBoundingClientRect();
    const s = stack.getBoundingClientRect();
    return {
      vw: innerWidth, vh: innerHeight,
      mark: {l:Math.round(r.left), r:Math.round(r.right), t:Math.round(r.top), b:Math.round(r.bottom), w:Math.round(r.width), h:Math.round(r.height)},
      stack:{l:Math.round(s.left), r:Math.round(s.right), t:Math.round(s.top), b:Math.round(s.bottom)},
    };
  });
  const cutL = -g.mark.l, cutR = g.mark.r - g.vw, cutB = g.mark.b - g.vh;
  console.log(`${g.vw}x${g.vh}`);
  console.log(`  mark  ${g.mark.w}x${g.mark.h} at [${g.mark.l}..${g.mark.r}] y[${g.mark.t}..${g.mark.b}]`);
  console.log(`        cut: left ${cutL}px, right ${cutR}px, bottom ${cutB}px (${(cutB/g.mark.h*100).toFixed(0)}% of height)`);
  console.log(`  stack [${g.stack.l}..${g.stack.r}] y[${g.stack.t}..${g.stack.b}]  centre ${((g.stack.l+g.stack.r)/2/g.vw*100).toFixed(0)}% of vw`);
  console.log(`        overlaps mark top by ${g.stack.b - g.mark.t}px of ${g.mark.h - cutB}px visible`);
  await b.close();
}
process.exit(0);
