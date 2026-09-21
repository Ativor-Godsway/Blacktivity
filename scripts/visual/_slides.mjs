import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const OUT = "/tmp/shots/slides"; mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--hide-scrollbars","--disable-gpu"]});
for (const [w,h] of [[1440,900],[390,844]]) {
  const p = await b.newPage();
  await p.setViewport({width:w,height:h,deviceScaleFactor:1});
  await p.goto("http://localhost:3111/",{waitUntil:"load",timeout:60000});
  await new Promise(r=>setTimeout(r,2600));
  for (let i=0;i<5;i++){
    await p.evaluate((i)=>document.querySelectorAll("[data-cover-tick]")[i].click(), i);
    await new Promise(r=>setTimeout(r,1500));
    await p.screenshot({path:`${OUT}/${w}-slide-0${i+1}.png`});
  }
  // which files were requested
  await p.close();
}
await b.close();
console.log("done");
