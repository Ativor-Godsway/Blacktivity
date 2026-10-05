/**
 * THE MOBILE MENU AND THE DESKTOP NAV ARE THE SAME LIST — Revision 25 §1.
 *
 *   BASE=http://localhost:3111 npm run test:nav
 *
 * Compares hrefs and their order, at 360/390/430 (menu open) against
 * 1280/1440/1728, and checks no hidden route (Creatives) appears in either.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE ?? "http://localhost:3111";
const SHOTS = process.env.SHOTS;
const EXPECT = process.env.EXPECT_NAV; // optional, comma-separated hrefs
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
const failures = [];
const lists = {};

for (const width of [1280, 1440, 1728]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.goto(`${BASE}/articles`, { waitUntil: "networkidle0", timeout: 60000 });
  lists[`desktop ${width}`] = await page.$$eval('nav[aria-label="Primary"] a', (as) => as.map((a) => a.getAttribute("href")));
  await page.close();
}

for (const width of [360, 390, 430]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await page.click('button[aria-controls="mobile-nav"]');
  await page.waitForSelector("#mobile-nav a");
  lists[`mobile ${width}`] = await page.$$eval("#mobile-nav a", (as) => as.map((a) => a.getAttribute("href")));
  if (SHOTS && width === 390) await page.screenshot({ path: `${SHOTS}/mobile-menu-390.png` });
  await page.close();
}
await browser.close();

const reference = lists["desktop 1440"];
for (const [k, v] of Object.entries(lists)) {
  const same = JSON.stringify(v) === JSON.stringify(reference);
  console.log(`${same ? "  ok  " : "  FAIL"} ${k.padEnd(13)} ${v.join(" ")}`);
  if (!same) failures.push(k);
  if (v.includes("/creatives") && !process.env.ALLOW_CREATIVES) failures.push(`${k} shows /creatives`);
}
if (EXPECT && JSON.stringify(reference) !== JSON.stringify(EXPECT.split(","))) failures.push(`order ≠ ${EXPECT}`);

console.log(failures.length ? `\nFAILED: ${failures.join("; ")}` : "\nnav: PASS");
process.exit(failures.length ? 1 : 0);
