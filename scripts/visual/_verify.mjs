import puppeteer from "puppeteer-core";
const BASE = process.env.BASE ?? "http://localhost:3000";
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function run(label, { width, height, mobile = false, reduced = false, js = true, fn }) {
  const b = await puppeteer.launch({ executablePath: CH, headless: "new", args: ["--no-sandbox","--disable-gpu","--hide-scrollbars"] });
  const p = await b.newPage();
  await p.setViewport({ width, height, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  if (reduced) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  if (!js) await p.setJavaScriptEnabled(false);
  const requested = [];
  p.on("request", (r) => { const u = r.url(); if (u.includes("/cover/")) requested.push(u.replace(BASE, "")); });
  await p.goto(BASE + "/", { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  console.log(`\n== ${label}`);
  await fn(p, requested);
  await b.close();
}

// 1. art direction — phone gets portrait only
await run("390 phone — which cover files are fetched", { width: 390, height: 844, mobile: true, fn: async (p, req) => {
  console.log("  requested:", req.join(", ") || "none");
  console.log("  landscape fetched:", req.filter(u=>u.includes("landscape")).length, " portrait fetched:", req.filter(u=>u.includes("portrait")).length);
}});

// 2. art direction — desktop gets landscape only
await run("1440 desktop — which cover files are fetched", { width: 1440, height: 900, fn: async (p, req) => {
  console.log("  requested:", req.join(", ") || "none");
  console.log("  landscape fetched:", req.filter(u=>u.includes("landscape")).length, " portrait fetched:", req.filter(u=>u.includes("portrait")).length);
}});

// 3. the dock — scrub forward, fast, and back
await run("1440 dock scrub", { width: 1440, height: 900, fn: async (p) => {
  const read = () => p.evaluate(() => {
    const m = document.querySelector("[data-cover-masthead]");
    const hw = document.querySelector("header[data-overlay] [data-wordmark]");
    return { y: Math.round(window.scrollY), m: getComputedStyle(m).transform, mo: getComputedStyle(m).opacity, hwo: getComputedStyle(hw).opacity };
  });
  for (const y of [0, 150, 300, 450, 540, 560, 1200, 0]) {
    await p.evaluate((y) => window.scrollTo(0, y), y);
    await new Promise((r) => setTimeout(r, 260));
    const s = await read();
    console.log(`  scrollY=${String(s.y).padStart(4)}  masthead=${s.m}  mastheadOpacity=${s.mo}  headerWordmark=${s.hwo}`);
  }
}});

// 4. reduced motion
await run("1440 prefers-reduced-motion", { width: 1440, height: 900, reduced: true, fn: async (p) => {
  const before = await p.evaluate(() => document.querySelector("[data-cover-slide][data-active]").dataset.index);
  console.log("  pin class on <html>:", await p.evaluate(() => document.documentElement.classList.contains("hero-pin")));
  console.log("  paused attribute:", await p.evaluate(() => document.querySelector("[data-cover]").hasAttribute("data-paused")));
  await new Promise((r) => setTimeout(r, 8000));
  const after = await p.evaluate(() => document.querySelector("[data-cover-slide][data-active]").dataset.index);
  console.log(`  slide after 8s: ${before} -> ${after}  (auto-advance must be OFF)`);
  await p.evaluate(() => document.querySelectorAll("[data-cover-tick]")[2].click());
  await new Promise((r) => setTimeout(r, 700));
  console.log("  after clicking tick 03:", await p.evaluate(() => document.querySelector("[data-cover-slide][data-active]").dataset.index));
  console.log("  crossfade duration:", await p.evaluate(() => getComputedStyle(document.querySelector("[data-cover-slide]")).transitionDuration));
}});

// 5. no JavaScript
await run("1440 no JavaScript", { width: 1440, height: 900, js: false, fn: async (p) => {
  console.log(await p.evaluate(() => {
    // evaluate still runs via CDP even with JS disabled for page scripts
    return "";
  }).catch(() => ""));
  const html = await p.content();
  console.log("  active slide in markup:", /data-cover-slide[^>]*data-active/.test(html));
  console.log("  masthead present:", html.includes("data-cover-masthead"));
  console.log("  ticks row hidden by CSS @media (scripting: none) — asserted in globals.css");
  await p.screenshot({ path: "/tmp/shots/nojs-1440.png" });
}});

// 6. auto-advance + pause
await run("1440 auto-advance and pause", { width: 1440, height: 900, fn: async (p) => {
  const idx = () => p.evaluate(() => document.querySelector("[data-cover-slide][data-active]").dataset.index);
  console.log("  at load:", await idx());
  await new Promise((r) => setTimeout(r, 7000));
  console.log("  after ~7s (print + 6s):", await idx());
  await p.evaluate(() => document.querySelector("[data-cover-pause]").click());
  const at = await idx();
  await new Promise((r) => setTimeout(r, 7500));
  console.log(`  after pause + 7.5s: ${at} -> ${await idx()} (must not change), button now:`,
    await p.evaluate(() => document.querySelector("[data-cover-pause]").textContent));
}});
