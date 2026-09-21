/**
 * THE ROTATION SECTION'S TYPE, MEASURED AGAINST THE PHOTOGRAPH — Revision 20 §5.
 *
 * Every other contrast check on this site compares two TOKENS. This one cannot:
 * the ground behind the word is a photograph, composited with three gradient
 * scrims, and it is a different colour behind every letter.
 *
 * So it screenshots the section and samples the ACTUAL PIXELS behind each text
 * element — and takes the LIGHTEST one in that element's box, not the average.
 * The average is the number that lies: a caption over a face that is dark on
 * one side and blown out on the other averages to something comfortable and is
 * unreadable across half its length. The lightest pixel is the worst case, and
 * the worst case is what a reader actually hits.
 *
 * The bars are §5's: body and mono text ≥ 4.5, the sticker word and the button
 * label ≥ 3 (both are large text by the WCAG definition).
 *
 * IF SOMETHING FAILS, STRENGTHEN THE SCRIM — do not shrink or lighten the type.
 * A photograph that needs a heavier scrim is telling you something about the
 * photograph.
 *
 *   BASE=http://localhost:3111 node scripts/visual/check-rotation-contrast.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3111";
const WIDTHS = [
  { w: 360, h: 780, mobile: true },
  { w: 390, h: 844, mobile: true },
  { w: 430, h: 932, mobile: true },
  { w: 1280, h: 800 },
  { w: 1440, h: 900 },
];

const lum = ([r, g, b]) => {
  const f = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

let failed = 0;
const rows = [];

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

for (const vp of WIDTHS) {
  const p = await browser.newPage();
  await p.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
  await p.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 1800));

  // Bring the section fully into view and let the enter sequence settle.
  await p.evaluate(() => {
    const s = document.querySelector("[data-rotation]");
    window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY);
  });
  await new Promise((r) => setTimeout(r, 2200));

  /*
   * THE TYPE IS HIDDEN FOR THE SAMPLE, then restored.
   *
   * Sampling "behind" an element means sampling the ground it sits on, and the
   * glyphs themselves are in the way — a bone letterform over a dark photo
   * would be sampled as its own light pixels and every element would pass. So
   * the type layer's opacity goes to 0 for one screenshot, the boxes are
   * recorded first, and the layer comes straight back.
   */
  const boxes = await p.evaluate(() => {
    const out = [];

    /*
     * THE GLYPHS' BOX, NOT THE ELEMENT'S.
     *
     * A <p> is block-level and fills its column, so its rect includes all the
     * empty space to the right of a short line. The first version of this
     * script measured that, sampled the blown-out street in the empty half, and
     * reported the category line at 2.31 when the line itself sits on a scrim
     * at 9.7. A Range over the element's contents returns the rects the TEXT
     * actually occupies, which is the only ground a reader ever sees it on.
     */
    const textRect = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
      if (rects.length === 0) return el.getBoundingClientRect();
      const left = Math.min(...rects.map((r) => r.left));
      const top = Math.min(...rects.map((r) => r.top));
      const right = Math.max(...rects.map((r) => r.right));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };

    const push = (sel, name, bar, ownGround) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const r = textRect(el);
      if (r.width < 2 || r.height < 2) return;
      const cs = getComputedStyle(el);
      out.push({
        name, bar,
        colour: (cs.color.match(/\d+/g) ?? [0, 0, 0]).slice(0, 3).map(Number),
        /*
         * THE BUTTON HAS ITS OWN GROUND — §5 makes it a SOLID --bone panel
         * precisely so it does not depend on the photograph. Sampling the photo
         * behind it measures a ground no reader ever sees and reported 1.24
         * for a pairing that is actually 15.85. Its background colour is read
         * here instead.
         */
        ownGround: ownGround
          ? (getComputedStyle(el).backgroundColor.match(/\d+/g) ?? []).slice(0, 3).map(Number)
          : null,
        x: Math.max(0, Math.round(r.left)), y: Math.max(0, Math.round(r.top)),
        w: Math.round(r.width), h: Math.round(r.height),
      });
    };

    // The sticker word's colour is its FILL; the --black stroke sits behind it.
    push(".rotation-word-letters", "sticker word", 3, false);
    /*
     * THE META BLOCK MOVED — Revision 21 §3. It is top-right on a phone and a
     * single line above the word on desktop, and only one of the two is
     * rendered at a time. Whichever is visible is the one to measure; asking
     * for the phone's selector on a laptop measured a `display: none` element
     * and silently reported nothing.
     */
    const metaSel = [...document.querySelectorAll("[data-rotation-meta], [data-rotation-meta-inline]")]
      .find((el) => el.getClientRects().length > 0);
    if (metaSel) {
      metaSel.setAttribute("data-meta-visible", "");
      push("[data-meta-visible]", "meta block", 4.5, false);
    }
    push("[data-rotation-links]", "category line", 4.5, false);
    push("[data-rotation-button]", "button label", 3, true);
    return out;
  });

  await p.evaluate(() => {
    document.querySelector("[data-rotation-type]").style.opacity = "0";
  });
  await new Promise((r) => setTimeout(r, 150));
  const shot = await p.screenshot({ type: "png" });
  await p.evaluate(() => {
    document.querySelector("[data-rotation-type]").style.opacity = "";
  });

  // Decode the PNG in the page, where a decoder already exists.
  const pixels = await p.evaluate(async (b64, boxes) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return boxes.map((box) => {
      const w = Math.min(box.w, c.width - box.x);
      const h = Math.min(box.h, c.height - box.y);
      if (w <= 0 || h <= 0) return null;
      const d = ctx.getImageData(box.x, box.y, w, h).data;
      let best = null, bestL = -1;
      for (let i = 0; i < d.length; i += 4) {
        const px = [d[i], d[i + 1], d[i + 2]];
        // Relative luminance, inline: this runs on thousands of pixels.
        const f = px.map((v) => { const u = v / 255; return u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; });
        const L = 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
        if (L > bestL) { bestL = L; best = px; }
      }
      return best;
    });
  }, shot.toString("base64"), boxes);

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    const bg = box.ownGround ?? pixels[i];
    if (!bg) continue;
    const r = ratio(box.colour, bg);
    const pass = r >= box.bar - 0.005;
    if (!pass) failed++;
    rows.push({
      vp: `${vp.w}x${vp.h}`, name: box.name, ratio: r, bar: box.bar,
      fg: `rgb(${box.colour.join(",")})`, bg: `rgb(${bg.join(",")})`, pass,
    });
  }

  await p.close();
}

await browser.close();

console.log("\n  viewport    element          lightest pixel behind   ratio   bar   ");
console.log("  " + "-".repeat(68));
for (const r of rows) {
  console.log(
    `  ${r.vp.padEnd(11)} ${r.name.padEnd(16)} ${r.bg.padEnd(22)} ${r.ratio.toFixed(2).padStart(6)}  ${String(r.bar).padStart(4)}  ${r.pass ? "ok" : "FAIL"}`,
  );
}
console.log(
  failed === 0
    ? `\n  every element clears its bar against the LIGHTEST pixel behind it, at ${WIDTHS.length} widths`
    : `\n  ${failed} element(s) under the bar — strengthen the scrim, do not shrink the type`,
);
process.exit(failed === 0 ? 0 : 1);
