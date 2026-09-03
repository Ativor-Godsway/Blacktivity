import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync } from "node:fs";
const token = readFileSync("/tmp/bt-token.txt","utf8").trim();
const OUT = process.argv[2]; mkdirSync(OUT,{recursive:true});
const targets = JSON.parse(process.argv[3]);
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--disable-gpu"]});
for (const t of targets) {
  const p = await b.newPage();
  await p.setViewport({ width: t.w ?? 1440, height: t.h ?? 1000, deviceScaleFactor: 1 });
  await p.setCookie({ name:"blacktivity_session", value:token, domain:"localhost", path:"/" });
  await p.goto("http://localhost:3111"+t.path, { waitUntil:"domcontentloaded", timeout:60000 });
  if (t.click) { try { await p.click(t.click); } catch {} }
  await new Promise(r=>setTimeout(r, t.wait ?? 1200));
  if (t.scroll) await p.evaluate(y=>scrollTo(0,y), t.scroll);
  await new Promise(r=>setTimeout(r,400));
  const w = await p.evaluate(()=>({vw:document.documentElement.clientWidth, sw:document.documentElement.scrollWidth}));
  console.log(`${t.name.padEnd(20)} vw=${w.vw} scrollW=${w.sw} ${w.sw>w.vw+1?"OVERFLOW":"ok"}`);
  await p.screenshot({ path: `${OUT}/${t.name}.png` });
  await p.close();
}
await b.close(); process.exit(0);
