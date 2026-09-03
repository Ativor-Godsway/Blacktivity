import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
const token = readFileSync("/tmp/bt-token.txt", "utf8").trim();
const OUT = process.argv[2];
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--hide-scrollbars", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.setCookie({ name: "blacktivity_session", value: token, domain: "localhost", path: "/" });
for (const [name, path] of [["dash","/admin"],["editor","/admin/articles/new"],["subs","/admin/submissions"]]) {
  await page.goto("http://localhost:3111" + path, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector(".on-void")).backgroundColor);
  console.log(name.padEnd(8), path.padEnd(22), "on-void bg =", bg);
  await page.screenshot({ path: `${OUT}/admin-${name}.png` });
}
await browser.close();
