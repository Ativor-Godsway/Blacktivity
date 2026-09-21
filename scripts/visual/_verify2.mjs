import puppeteer from "puppeteer-core";
const B = "http://localhost:3111";
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CH, headless: "new", args:["--no-sandbox","--disable-gpu","--hide-scrollbars"]});

// --- first-load sequence plays once per session -------------------------
{
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(B + "/", { waitUntil: "domcontentloaded" });
  await new Promise(r=>setTimeout(r,300));
  console.log("first visit  .cover-print:", await p.evaluate(()=>document.querySelector("[data-cover]").classList.contains("cover-print")),
    " flag:", await p.evaluate(()=>{try{return sessionStorage.getItem("blacktivity:cover-printed")}catch{return "throw"}}));
  await p.goto(B + "/articles", { waitUntil: "domcontentloaded" });
  await p.goto(B + "/", { waitUntil: "domcontentloaded" });
  await new Promise(r=>setTimeout(r,300));
  console.log("same session .cover-print:", await p.evaluate(()=>document.querySelector("[data-cover]").classList.contains("cover-print")));
  await p.close();
}
// a fresh context = a fresh session
{
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(B + "/", { waitUntil: "domcontentloaded" });
  await new Promise(r=>setTimeout(r,300));
  console.log("new session  .cover-print:", await p.evaluate(()=>document.querySelector("[data-cover]").classList.contains("cover-print")));
  await ctx.close();
}

// --- swipe, and that a vertical drag does NOT change slides --------------
{
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.goto(B + "/", { waitUntil: "load", timeout: 60000 });
  await new Promise(r=>setTimeout(r,2400));
  const idx = () => p.evaluate(()=>document.querySelector("[data-cover-slide][data-active]").dataset.index);
  const swipe = async (dx, dy) => {
    await p.touchscreen.touchStart(200, 400);
    await p.touchscreen.touchMove(200 + dx*0.5, 400 + dy*0.5);
    await p.touchscreen.touchMove(200 + dx, 400 + dy);
    await p.touchscreen.touchEnd();
    await new Promise(r=>setTimeout(r,700));
  };
  console.log("\nswipe start:", await idx());
  await swipe(-160, 0); console.log("  after swipe left  ->", await idx(), "(expect 1)");
  await swipe(160, 0);  console.log("  after swipe right ->", await idx(), "(expect 0)");
  await swipe(0, -200); console.log("  after vertical    ->", await idx(), "(expect 0, unchanged)");
  await swipe(-30, 0);  console.log("  after tiny swipe  ->", await idx(), "(expect 0, under threshold)");
  await p.close();
}

// --- keyboard ------------------------------------------------------------
{
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(B + "/", { waitUntil: "load", timeout: 60000 });
  await new Promise(r=>setTimeout(r,2400));
  const idx = () => p.evaluate(()=>document.querySelector("[data-cover-slide][data-active]").dataset.index);
  await p.evaluate(()=>document.querySelector("[data-cover-tick]").focus());
  await p.keyboard.press("ArrowRight"); await new Promise(r=>setTimeout(r,600));
  console.log("\narrow right ->", await idx(), "(expect 1)");
  await p.keyboard.press("ArrowLeft"); await new Promise(r=>setTimeout(r,600));
  console.log("arrow left  ->", await idx(), "(expect 0)");
  console.log("live region politeness after user drive:", await p.evaluate(()=>document.querySelector("[data-cover-live]").getAttribute("aria-live")));
  console.log("inert on inactive slides:", await p.evaluate(()=>[...document.querySelectorAll("[data-cover-slide]")].map(e=>e.inert).join(",")));
  await p.close();
}

// --- hidden tab pauses ---------------------------------------------------
{
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(B + "/", { waitUntil: "load", timeout: 60000 });
  await new Promise(r=>setTimeout(r,2400));
  await p.evaluate(()=>{ Object.defineProperty(document,"visibilityState",{get:()=>"hidden",configurable:true}); document.dispatchEvent(new Event("visibilitychange")); });
  await new Promise(r=>setTimeout(r,300));
  console.log("\nhidden tab -> data-paused:", await p.evaluate(()=>document.querySelector("[data-cover]").hasAttribute("data-paused")));
  await p.close();
}
await b.close();
