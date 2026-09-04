/**
 * Reads the Next dev overlay's issue list — the badge count that has been
 * showing on the homepage and article pages.
 */
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE ?? "http://localhost:3112";
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"]});

for (const path of ["/", "/articles/tailors-of-makola"]) {
  const p = await b.newPage();
  const msgs = [];
  p.on("console", (m) => {
    const t = m.type();
    if (t === "warning" || t === "error") msgs.push(`[${t}] ${m.text()}`);
  });
  p.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));

  await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 7000));

  // The overlay badge lives in a shadow root on nextjs-portal.
  const badge = await p.evaluate(() => {
    const portal = document.querySelector("nextjs-portal");
    if (!portal?.shadowRoot) return null;
    const txt = portal.shadowRoot.textContent || "";
    const btn = portal.shadowRoot.querySelector("[data-nextjs-toast], [data-issues-count], button");
    return { count: (txt.match(/(\d+)\s*(issue|error|warning)/i) || [])[0] ?? null, badge: btn?.textContent?.trim()?.slice(0, 40) ?? null };
  });

  console.log(`\n${path}`);
  console.log(`  overlay badge: ${badge ? JSON.stringify(badge) : "no nextjs-portal found"}`);
  console.log(`  console issues: ${msgs.length}`);
  for (const m of [...new Set(msgs)]) console.log("    " + m.replace(/\s+/g, " ").slice(0, 260));
  await p.close();
}
await b.close(); process.exit(0);
