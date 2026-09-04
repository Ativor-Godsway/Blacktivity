/**
 * Console errors and warnings across every page named in the verify list,
 * including client-side navigation between them.
 */
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3112";
const token = (() => { try { return readFileSync("/tmp/bt-token.txt","utf8").trim(); } catch { return null; } })();

const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"]});
let total = 0;

for (const path of ["/", "/articles", "/articles/tailors-of-makola", "/about", "/events", "/creatives", "/submit", "/admin"]) {
  const p = await b.newPage();
  const msgs = [];
  p.on("console", (m) => { const t = m.type(); if (t === "error" || t === "warning") msgs.push(`[${t}] ${m.text()}`); });
  p.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));
  if (token) await p.setCookie({ name:"blacktivity_session", value:token, domain:"localhost", path:"/" });

  await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 5000));

  const unique = [...new Set(msgs)].filter((m) => !/Download the React DevTools/.test(m));
  total += unique.length;
  console.log(`  ${unique.length === 0 ? "ok  " : "FAIL"} ${path.padEnd(30)} ${unique.length} issue(s)`);
  for (const m of unique.slice(0, 4)) console.log("        " + m.replace(/\s+/g, " ").slice(0, 200));
  await p.close();
}

// Client-side navigation, where the transition errors used to fire.
const p = await b.newPage();
const navMsgs = [];
p.on("console", (m) => { const t = m.type(); if (t === "error" || t === "warning") navMsgs.push(`[${t}] ${m.text()}`); });
p.on("pageerror", (e) => navMsgs.push(`[pageerror] ${e.message}`));
await p.goto(BASE + "/articles", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 3500));
for (let i = 0; i < 3; i++) {
  const hrefs = await p.$$eval('article a[href^="/articles/"]', (as) => as.map((a) => a.getAttribute("href")));
  await p.evaluate((h) => document.querySelector(`a[href="${h}"]`)?.click(), hrefs[i]);
  await new Promise((r) => setTimeout(r, 3000));
  await p.goBack({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 2500));
}
const navUnique = [...new Set(navMsgs)].filter((m) => !/React DevTools/.test(m));
total += navUnique.length;
console.log(`  ${navUnique.length === 0 ? "ok  " : "FAIL"} ${"(3 navigations + back)".padEnd(30)} ${navUnique.length} issue(s)`);
for (const m of navUnique.slice(0, 5)) console.log("        " + m.replace(/\s+/g, " ").slice(0, 200));

await b.close();
console.log(total === 0 ? "\n  console clean on every page" : `\n  ${total} console issue(s)`);
process.exit(total === 0 ? 0 : 1);
