/**
 * Transfer tally. The grayscale crossfade renders two <img> per image; this
 * confirms the browser DEDUPES them (same src => one network fetch) rather
 * than doubling the payload.
 */
import puppeteer from "puppeteer-core";

for (const path of process.argv.slice(2)) {
  const b = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await p.setCacheEnabled(false);

  const byUrl = new Map();
  p.on("response", async (res) => {
    const url = res.url();
    const type = res.request().resourceType();
    let len = Number(res.headers()["content-length"] ?? 0);
    if (!len) { try { len = (await res.buffer()).length; } catch {} }
    const prev = byUrl.get(url) ?? { type, bytes: 0, hits: 0 };
    prev.bytes = len; prev.hits += 1; prev.type = type;
    byUrl.set(url, prev);
  });

  await p.goto("http://localhost:3111" + path, { waitUntil: "networkidle0", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 1200));

  const imgTags = await p.$$eval("img", (n) => n.length);
  const rows = [...byUrl.entries()];
  const imgs = rows.filter(([, v]) => v.type === "image");
  const total = rows.reduce((a, [, v]) => a + v.bytes, 0);
  const imgBytes = imgs.reduce((a, [, v]) => a + v.bytes, 0);
  const refetched = imgs.filter(([, v]) => v.hits > 1).length;

  console.log(`${path}`);
  console.log(`  <img> elements:        ${imgTags}`);
  console.log(`  unique image requests: ${imgs.length}`);
  console.log(`  images refetched:      ${refetched} (expect 0 — same src is deduped)`);
  console.log(`  image bytes:           ${(imgBytes / 1024).toFixed(0)} KB`);
  console.log(`  total transfer:        ${(total / 1024).toFixed(0)} KB`);
  await b.close();
}
process.exit(0);
