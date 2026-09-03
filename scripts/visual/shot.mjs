/**
 * Local design QA. Drives the installed Chrome to screenshot the site at real
 * breakpoints and report any element wider than the viewport. Dev-only — not
 * part of the build or the deployed app.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE ?? "http://localhost:3111";
const OUT = process.env.OUT ?? "./.shots";

const targets = JSON.parse(process.env.TARGETS ?? "[]");

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars", "--disable-gpu"],
});

for (const t of targets) {
  const page = await browser.newPage();
  await page.setViewport({ width: t.w, height: t.h, deviceScaleFactor: 1 });
  await page.goto(BASE + t.path, { waitUntil: "networkidle0", timeout: 60000 });
  if (t.scroll) await page.evaluate((y) => window.scrollTo(0, y), t.scroll);
  await new Promise((r) => setTimeout(r, t.wait ?? 1600));

  const audit = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      // Ignore things deliberately clipped by an ancestor.
      let clipped = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === "hidden" || ov === "auto" || ov === "scroll") { clipped = true; break; }
      }
      if (clipped) continue;
      if (r.right > vw + 1 || r.left < -1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.toString?.() ?? "").slice(0, 90),
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
      }
    }
    return {
      vw,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: offenders.slice(0, 8),
    };
  });

  const name = `${t.name}-${t.w}`;
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const overflow = audit.scrollWidth > audit.vw + 1;
  console.log(
    `${name.padEnd(22)} vw=${audit.vw} scrollW=${audit.scrollWidth} ${overflow ? "OVERFLOW" : "ok"}`,
  );
  for (const o of audit.offenders) {
    console.log(`   ${o.tag}.${o.cls} [${o.left} → ${o.right}]`);
  }
  await page.close();
}

await browser.close();
