import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--hide-scrollbars","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:900,deviceScaleFactor:3});
await p.goto("http://localhost:3111/",{waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,1500));
await p.screenshot({path:process.argv[2]+"/grain-zoom.png", clip:{x:950,y:200,width:180,height:120}});
await b.close(); process.exit(0);
