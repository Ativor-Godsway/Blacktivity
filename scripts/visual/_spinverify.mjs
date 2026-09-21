import puppeteer from "puppeteer-core";
const B = process.env.BASE ?? "http://localhost:3111";
const br = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu","--hide-scrollbars"]});

const angle = (p) => p.evaluate(() => {
  const m = new DOMMatrix(getComputedStyle(document.querySelector("[data-rotation-label]")).transform);
  return (Math.atan2(m.b, m.a) * 180) / Math.PI;
});
/** Unwrapped degrees turned between two samples over `ms`. */
const rate = async (p, ms) => {
  const a0 = await angle(p);
  await new Promise(r => setTimeout(r, ms));
  let a1 = await angle(p);
  let d = a1 - a0; while (d < -180) d += 360; while (d > 180) d -= 360;
  return (d / ms) * 1000; // deg/sec
};

async function open({ reduced = false } = {}) {
  const p = await br.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  if (reduced) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.goto(B + "/", { waitUntil: "load", timeout: 90000 });
  await new Promise(r => setTimeout(r, 1600));
  await p.evaluate(() => { const s = document.querySelector("[data-rotation]"); window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY); });
  await new Promise(r => setTimeout(r, 2600));
  return p;
}

console.log("=== idle  (target 30 deg/s — one turn per 12s)");
{
  const p = await open();
  console.log("  measured:", (await rate(p, 1500)).toFixed(1), "deg/s");
  await p.close();
}

console.log("\n=== hover LISTEN  (target 200 deg/s — 33 1/3 rpm)");
{
  const p = await open();
  const b = await p.evaluate(() => { const r = document.querySelector("[data-rotation-button]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.move(b.x, b.y);
  await new Promise(r => setTimeout(r, 900));           // spin-up window is 600ms
  console.log("  after 900ms of hover:", (await rate(p, 900)).toFixed(1), "deg/s");
  await p.mouse.move(b.x, b.y - 400);                    // off the button, still in section
  await new Promise(r => setTimeout(r, 1500));           // spin-down window is 1200ms
  console.log("  1.5s after leaving  :", (await rate(p, 900)).toFixed(1), "deg/s");
  await p.close();
}

console.log("\n=== hover the record itself");
{
  const p = await open();
  const r = await p.evaluate(() => { const b = document.querySelector(".rotation-image-box").getBoundingClientRect(); return { x: b.right - 120, y: b.top + b.height / 2 }; });
  await p.mouse.move(r.x, r.y);
  await new Promise(r2 => setTimeout(r2, 900));
  console.log("  after 900ms of hover:", (await rate(p, 900)).toFixed(1), "deg/s");
  await p.close();
}

console.log("\n=== reduced motion");
{
  const p = await open({ reduced: true });
  const a0 = await angle(p);
  await new Promise(r => setTimeout(r, 1500));
  const a1 = await angle(p);
  console.log(`  angle ${a0.toFixed(2)} -> ${a1.toFixed(2)} deg  (must not move)`);
  console.log("  transform:", await p.evaluate(() => getComputedStyle(document.querySelector("[data-rotation-label]")).transform));
  await p.close();
}

console.log("\n=== no JavaScript");
{
  const p = await br.newPage();
  await p.setJavaScriptEnabled(false);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(B + "/", { waitUntil: "load", timeout: 90000 });
  await new Promise(r => setTimeout(r, 1200));
  const html = await p.content();
  console.log("  section present :", /data-rotation\b/.test(html));
  console.log("  both links      :", /rotation#chart/.test(html) && /rotation#new-releases/.test(html));
  console.log("  LISTEN button   :", /rotation-button/.test(html));
  console.log("  label ring text :", /BLACKTIVITY · ROTATION/.test(html));
  await p.close();
}
await br.close();
