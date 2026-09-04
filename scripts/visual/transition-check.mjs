/**
 * The article reveal: duration, back/forward survival, no stranded overlay,
 * and a full stop under reduced motion.
 */
import puppeteer from "puppeteer-core";
const BASE = "http://localhost:3111";
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"]});

async function go(reduced) {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  if (reduced) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.goto(BASE + "/articles", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r=>setTimeout(r,2200));

  const supported = await p.evaluate(() => typeof document.startViewTransition === "function");

  await p.evaluate(() => {
    window.__vt = { started: 0, finished: 0 };
    const orig = document.startViewTransition?.bind(document);
    if (orig) document.startViewTransition = (cb) => {
      window.__vt.started = performance.now();
      const t = orig(cb);
      t.finished.then(() => { window.__vt.finished = performance.now(); }).catch(()=>{});
      return t;
    };
  });

  const card = await p.$('article a[href^="/articles/"]');
  await card.click();
  // Wait for the transition to actually finish before reading the duration.
  // Poll rather than waitForFunction: the document is replaced mid-navigation,
  // which invalidates puppeteer's execution context.
  await new Promise(r=>setTimeout(r,1800));

  const r = await p.evaluate(() => ({
    url: location.pathname,
    dur: window.__vt?.finished ? Math.round(window.__vt.finished - window.__vt.started) : null,
    cssTotal: (() => {
      // Longest declared animation across the view-transition pseudos.
      try {
        const s = [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch { return []; } });
        const names = s.filter((r) => r.type === 7).map((r) => r.name);
        return names.filter((n) => n.startsWith("article-")).join(",");
      } catch { return "n/a"; }
    })(),
    started: !!window.__vt?.started,
    // Anything left covering the viewport after the transition?
    stranded: [...document.querySelectorAll("body *")].filter((n) => {
      const cs = getComputedStyle(n);
      const rect = n.getBoundingClientRect();
      return cs.position === "fixed" && rect.width >= innerWidth * 0.9 && rect.height >= innerHeight * 0.9
        && cs.pointerEvents !== "none" && parseFloat(cs.opacity) > 0.05;
    }).length,
  }));

  await p.goBack({ waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r=>setTimeout(r,900));
  const back = await p.evaluate(() => ({
    url: location.pathname,
    stranded: [...document.querySelectorAll("body *")].filter((n) => {
      const cs = getComputedStyle(n); const rect = n.getBoundingClientRect();
      return cs.position === "fixed" && rect.width >= innerWidth*0.9 && rect.height >= innerHeight*0.9
        && cs.pointerEvents !== "none" && parseFloat(cs.opacity) > 0.05;
    }).length,
    readable: document.body.innerText.length > 400,
  }));

  console.log(`  ${reduced ? "reduced motion" : "normal        "}: API ${supported ? "supported" : "absent"}, transition ${r.started ? "ran" : "did not run"}${r.dur !== null ? ` in ${r.dur}ms` : ""}`);
  console.log(`     forward -> ${r.url}, stranded overlays ${r.stranded}`);
  console.log(`     back    -> ${back.url}, stranded overlays ${back.stranded}, page readable ${back.readable}`);
  await p.close();
}

await go(false);
await go(true);
await b.close(); process.exit(0);
