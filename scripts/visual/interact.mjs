/**
 * Exercises the /articles index the way a reader does: click a filter, click
 * load more, and assert what actually changed in the DOM. Rendering correctly
 * on first paint is not the same as working.
 */
import puppeteer from "puppeteer-core";

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

const requests = [];
p.on("request", (r) => requests.push(r.url()));

await p.goto("http://localhost:3111/articles", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 800));

const count = () => p.$$eval("article", (n) => n.length);
const loadMore = () => p.$x ? null : null;

console.log("initial cells:", await count(), "(page size 9)");

// --- filter -------------------------------------------------------------
const navBefore = requests.length;
const pills = await p.$$('[role="group"] button');
console.log("filter pills:", pills.length);

// Click the Music pill by its text.
const musicIdx = await p.$$eval('[role="group"] button', (bs) =>
  bs.findIndex((b) => /music/i.test(b.textContent || "")),
);
await pills[musicIdx].click();
await new Promise((r) => setTimeout(r, 400));

const afterFilter = await count();
const cats = await p.$$eval("article", (ns) =>
  [...new Set(ns.map((n) => n.querySelector("span.mono.rounded-full")?.textContent?.trim()))],
);
const urlAfter = p.url();
const newDocRequests = requests.slice(navBefore).filter((u) => !u.includes("/_next/image"));

console.log(`after Music filter: ${afterFilter} cells, categories = ${JSON.stringify(cats)}`);
console.log("  url unchanged:", urlAfter.endsWith("/articles"), `(${urlAfter.split("localhost:3111")[1]})`);
console.log("  network requests triggered by filtering:", newDocRequests.length);
console.log("  aria-pressed set:", await p.$eval('[role="group"] button[aria-pressed="true"]', (b) => b.textContent.trim()));

// --- back to all + load more -------------------------------------------
const allIdx = await p.$$eval('[role="group"] button', (bs) =>
  bs.findIndex((b) => /^all/i.test(b.textContent?.trim() || "")),
);
await (await p.$$('[role="group"] button'))[allIdx].click();
await new Promise((r) => setTimeout(r, 300));
console.log("back to All:", await count(), "cells");

for (let i = 1; i <= 3; i++) {
  const btn = await p.$$eval("button", (bs) => {
    const t = bs.find((b) => /load more/i.test(b.textContent || ""));
    return t ? t.textContent.trim() : null;
  });
  if (!btn) { console.log(`  load more ${i}: button gone (all shown)`); break; }
  await p.$$eval("button", (bs) => bs.find((b) => /load more/i.test(b.textContent || ""))?.click());
  await new Promise((r) => setTimeout(r, 350));
  console.log(`  after click ${i}: ${await count()} cells   ("${btn}")`);
}

await b.close();
process.exit(0);
