import puppeteer from "puppeteer-core";
const B = process.env.BASE ?? "http://localhost:3111";
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const br = await puppeteer.launch({ executablePath: CH, headless: "new", args:["--no-sandbox","--disable-gpu","--hide-scrollbars"]});

async function open(w,h,{mobile=false,reduced=false}={}) {
  const p = await br.newPage();
  await p.setViewport({width:w,height:h,isMobile:mobile,hasTouch:mobile});
  if (reduced) await p.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
  await p.goto(B+"/", {waitUntil:"load",timeout:90000});
  await new Promise(r=>setTimeout(r,1800));
  return p;
}
const toSection = async (p, offset=0) => {
  await p.evaluate(o=>{const s=document.querySelector("[data-rotation]");window.scrollTo(0,s.getBoundingClientRect().top+scrollY+o);},offset);
  await new Promise(r=>setTimeout(r,700));
};
const tf = (p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).transform:"none";},sel);

console.log("=== §6.1 enter sequence (desktop)");
{
  const p = await open(1440,900);
  console.log("  before scroll  entered:", await p.evaluate(()=>document.querySelector("[data-rotation]").hasAttribute("data-entered")));
  await toSection(p,-200);
  await new Promise(r=>setTimeout(r,1600));
  console.log("  after scroll   entered:", await p.evaluate(()=>document.querySelector("[data-rotation]").hasAttribute("data-entered")));
  console.log("  letter --i set:", await p.evaluate(()=>[...document.querySelectorAll(".rotation-letter")].slice(0,3).map(e=>e.style.getPropertyValue("--i")||getComputedStyle(e).getPropertyValue("--i").trim()).join(",")));
  console.log("  meta --i set:", await p.evaluate(()=>[...document.querySelectorAll(".rotation-meta-line")].map(e=>e.style.getPropertyValue("--i")).join(",")));
  await p.close();
}

console.log("\n=== §6.2 scroll-linked depth (desktop)");
{
  const p = await open(1440,900);
  await toSection(p,-400); await new Promise(r=>setTimeout(r,1800));
  for (const o of [-400,-100,200,500]) {
    await toSection(p,o);
    console.log(`  offset ${String(o).padStart(5)}  photo=${(await tf(p,"[data-rotation-photo]")).slice(0,46)}  word=${(await tf(p,"[data-rotation-word]")).slice(0,40)}`);
  }
  await p.close();
}

console.log("\n=== §6.3 pointer: parallax, spotlight, letters, magnet (desktop)");
{
  const p = await open(1440,900);
  await toSection(p,0); await new Promise(r=>setTimeout(r,2000));
  console.log("  data-pointer before:", await p.evaluate(()=>document.querySelector("[data-rotation]").hasAttribute("data-pointer")));
  await p.mouse.move(700,400); await new Promise(r=>setTimeout(r,500));
  await p.mouse.move(300,500); await new Promise(r=>setTimeout(r,700));
  console.log("  data-pointer after :", await p.evaluate(()=>document.querySelector("[data-rotation]").hasAttribute("data-pointer")));
  console.log("  spotlight opacity  :", await p.evaluate(()=>getComputedStyle(document.querySelector(".rotation-spotlight")).opacity));
  console.log("  spotlight transform:", (await tf(p,".rotation-spotlight")).slice(0,52));
  console.log("  type layer moved   :", (await tf(p,"[data-rotation-type]")).slice(0,52));
  // hover the word
  const wordBox = await p.evaluate(()=>{const e=document.querySelector(".rotation-word-letters");const r=e.getBoundingClientRect();return {x:r.left+r.width*0.3,y:r.top+r.height/2};});
  await p.mouse.move(wordBox.x, wordBox.y); await new Promise(r=>setTimeout(r,600));
  console.log("  letters transformed:", await p.evaluate(()=>[...document.querySelectorAll(".rotation-letter")].filter(e=>e.style.transform).length)+" of 8");
  // magnet
  const btn = await p.evaluate(()=>{const e=document.querySelector("[data-rotation-button]");const r=e.getBoundingClientRect();return {x:r.left+r.width/2+40,y:r.top+r.height/2};});
  await p.mouse.move(btn.x, btn.y); await new Promise(r=>setTimeout(r,600));
  console.log("  button transform   :", (await tf(p,"[data-rotation-button]")).slice(0,52));
  await p.close();
}

console.log("\n=== §6.4 mobile: no pointer effects");
{
  const p = await open(390,844,{mobile:true});
  await toSection(p,-200); await new Promise(r=>setTimeout(r,1800));
  console.log("  entered:", await p.evaluate(()=>document.querySelector("[data-rotation]").hasAttribute("data-entered")));
  console.log("  spotlight display:", await p.evaluate(()=>getComputedStyle(document.querySelector(".rotation-spotlight")).opacity));
  console.log("  data-pointer:", await p.evaluate(()=>document.querySelector("[data-rotation]").hasAttribute("data-pointer")));
  await p.close();
}

console.log("\n=== §6.5 reduced motion");
{
  const p = await open(1440,900,{reduced:true});
  await toSection(p,0); await new Promise(r=>setTimeout(r,1600));
  console.log("  entered attr:", await p.evaluate(()=>document.querySelector("[data-rotation]").hasAttribute("data-entered")));
  console.log("  photo transform:", await tf(p,"[data-rotation-photo]"));
  console.log("  photo opacity  :", await p.evaluate(()=>getComputedStyle(document.querySelector("[data-rotation-photo]")).opacity));
  console.log("  spotlight display:", await p.evaluate(()=>getComputedStyle(document.querySelector(".rotation-spotlight")).display));
  await p.close();
}

console.log("\n=== the loop sleeps off-screen");
{
  const p = await open(1440,900);
  await toSection(p,0); await new Promise(r=>setTimeout(r,1500));
  await p.evaluate(()=>window.scrollTo(0,0)); await new Promise(r=>setTimeout(r,900));
  await p.mouse.move(700,400); await new Promise(r=>setTimeout(r,500));
  console.log("  at top, pointer moved -> data-pointer:", await p.evaluate(()=>document.querySelector("[data-rotation]").hasAttribute("data-pointer")));
  await p.close();
}
await br.close();
