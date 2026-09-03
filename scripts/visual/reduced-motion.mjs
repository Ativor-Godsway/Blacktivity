/**
 * Reduced-motion audit. Emulates prefers-reduced-motion: reduce and asserts
 * that (a) nothing is left stuck invisible, and (b) no animation or transition
 * is still running long enough to read as motion.
 */
import puppeteer from "puppeteer-core";

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--disable-gpu", "--no-sandbox"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await p.goto("http://localhost:3111/", { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

const res = await p.evaluate(() => {
  const long = [];
  const hidden = [];
  let invisible = 0;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const onScreen = r.width > 4 && r.height > 4 && r.top < innerHeight && r.bottom > 0;

    const dur = (s) => Math.max(0, ...s.split(",").map((x) => parseFloat(x) * (x.includes("ms") ? 1 : 1000) || 0));
    const t = dur(cs.transitionDuration), a = dur(cs.animationDuration);
    if (Math.max(t, a) > 50) long.push({ cls: (el.className||"").toString().slice(0,50), t, a });

    // Anything meant to be seen must not be left at opacity 0.
    if (onScreen && parseFloat(cs.opacity) < 0.05 && el.getAttribute("aria-hidden") !== "true") { invisible++; hidden.push({tag: el.tagName, cls:(el.className||"").toString().slice(0,70), txt:(el.textContent||"").trim().slice(0,40)}); }
  }
  return { long: long.slice(0, 6), longCount: long.length, invisible, hidden: hidden.slice(0,5) };
});

console.log("elements still animating >50ms:", res.longCount);
for (const l of res.long) console.log(`   ${l.cls}  transition=${l.t}ms animation=${l.a}ms`);
console.log("on-screen elements stuck invisible:", res.invisible);
for (const h of res.hidden) console.log(`   ${h.tag} .${h.cls} "${h.txt}"`);
console.log(res.longCount === 0 && res.invisible === 0 ? "REDUCED MOTION OK" : "NEEDS ATTENTION");

await p.screenshot({ path: process.argv[2] + "/reduced-motion.png" });
await b.close(); process.exit(0);
