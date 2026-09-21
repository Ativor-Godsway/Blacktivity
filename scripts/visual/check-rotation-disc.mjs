/**
 * THE SPINNING DISC LINES UP WITH THE PAINTED RECORD — Revision 21 §5.
 *
 * The disc and label layers are positioned from percentages measured out of
 * image2.jpg. Percentages of WHAT is the whole question: they resolve against
 * the image box, which is height-driven and therefore a different size at every
 * viewport. If the box and the layers ever disagree, the rotating label drifts
 * off the painted label and the effect reads as a bug rather than as a record.
 *
 * So this measures, at each width, where the layers actually land against where
 * the painted record actually is — the latter read from the rendered pixels,
 * not from the manifest, so the two cannot agree by sharing a mistake.
 *
 * It also checks the things the layers must never do: appear on a phone, or
 * leave a gap at the section's right edge while the scroll transform runs.
 *
 *   BASE=http://localhost:3111 node scripts/visual/check-rotation-disc.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3111";
const WIDTHS = [1280, 1440, 1728];
/** The layers are positioned from percentages; a pixel or two of rounding is
 *  expected, a drift of five is a mistake. */
const TOLERANCE = 3;
/** `disc.labelR` from data/rotation-visual.ts — a percentage of the image's width. */
const LABEL_R_PCT = 8.898;

let failed = 0;
const fail = (m) => { console.error("  FAIL " + m); failed++; };
const ok = (m) => console.log("  ok   " + m);

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

for (const w of WIDTHS) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
  await p.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 1600));
  await p.evaluate(() => {
    const s = document.querySelector("[data-rotation]");
    window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY);
  });
  await new Promise((r) => setTimeout(r, 2400));

  /*
   * Where is the painted label, on screen? The white label is the brightest
   * thing in the section by a wide margin, so its centroid is unambiguous —
   * and it is read from a SCREENSHOT, which is the only source that knows what
   * the layout actually did.
   */
  const shot = await p.screenshot({ type: "png" });
  /*
   * The scan is confined to the SECTION's own box. The first version searched
   * the whole viewport for bright pixels and found the light section below —
   * --paper is #F6F4F0 and fills the bottom of the screenshot, so the "label"
   * centroid landed 350px below the record.
   */
  const bounds = await p.evaluate(() => {
    const b = document.querySelector("[data-rotation]").getBoundingClientRect();
    return { top: Math.max(0, Math.round(b.top)), bottom: Math.round(Math.min(b.bottom, window.innerHeight)) };
  });
  const measured = await p.evaluate(async (b64, bounds) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    /*
     * THE LABEL'S HORIZONTAL CENTROID IS USELESS HERE, because the painted
     * label runs off the right edge of the viewport — its right half is not on
     * screen, so the centroid of what IS on screen sits some 60px left of the
     * real centre. The first version of this check compared against that and
     * reported a 60px drift at every width on layers that were exactly right.
     *
     * Two unclipped measurements instead: the VERTICAL centroid, and the
     * LEFTMOST bright pixel. Neither is affected by the missing right half.
     */
    let sy = 0, n = 0, minX = c.width;
    for (let y = bounds.top; y < Math.min(bounds.bottom, c.height); y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        // The label is near-white; nothing else in the section comes close
        // except the LISTEN button, which is bone and far to the left.
        if (L > 205 && x > c.width * 0.5) { sy += y; n++; if (x < minX) minX = x; }
      }
    }
    return n > 50 ? { y: sy / n, left: minX, n } : null;
  }, shot.toString("base64"), bounds);

  const layers = await p.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, w: b.width, h: b.height };
    };
    const box = document.querySelector(".rotation-image-box").getBoundingClientRect();
    const sec = document.querySelector("[data-rotation]").getBoundingClientRect();
    return {
      disc: r("[data-rotation-disc]"),
      label: r("[data-rotation-label]"),
      boxRight: box.right,
      boxWidth: box.width,
      sectionRight: sec.right,
      labelTransform: getComputedStyle(document.querySelector("[data-rotation-label]")).transform,
    };
  });

  const tag = `${w}`;

  if (!measured) { fail(`${tag}: could not find the painted label in the screenshot`); await p.close(); continue; }
  if (!layers.disc || !layers.label) { fail(`${tag}: a spinning layer is missing`); await p.close(); continue; }

  /*
   * The DISC and LABEL share a centre, and that centre is the painted label's.
   * The disc's own bounding box grows as it rotates — a square rotated by t has
   * a bbox of a(|cos t| + |sin t|) — but its CENTRE does not move, which is why
   * the centre is what is compared rather than the width.
   */
  for (const [name, layer] of [["disc", layers.disc], ["label", layers.label]]) {
    const dy = Math.abs(layer.cy - measured.y);
    if (dy > TOLERANCE) {
      fail(`${tag}: the ${name} layer's centre is at y=${layer.cy.toFixed(1)} but the painted label is at y=${measured.y.toFixed(1)} — off by ${dy.toFixed(1)}px`);
    } else {
      ok(`${tag}  ${name} layer centred on the record vertically (off by ${dy.toFixed(1)}px)`);
    }
  }

  /*
   * Horizontally: the label layer's own left edge against the painted label's.
   * The layer's bounding box grows as it rotates — a square rotated by t spans
   * a(|cos t| + |sin t|) — so the edge is derived from the CENTRE and the known
   * radius rather than read off the box.
   */
  const labelRpx = (layers.boxWidth * LABEL_R_PCT) / 100;
  const expectedLeft = layers.label.cx - labelRpx;
  const dxEdge = Math.abs(expectedLeft - measured.left);
  if (dxEdge > TOLERANCE + 2) {
    fail(`${tag}: the label layer's left edge should be x=${expectedLeft.toFixed(1)} but the painted label starts at x=${measured.left} — off by ${dxEdge.toFixed(1)}px`);
  } else {
    ok(`${tag}  label layer's left edge matches the painted label (off by ${dxEdge.toFixed(1)}px)`);
  }

  // §4: no gap at the right edge, at any point in the scroll transform.
  const gap = layers.sectionRight - layers.boxRight;
  if (gap > 0.5) fail(`${tag}: ${gap.toFixed(1)}px of bare ground at the section's right edge — the image is not reaching it`);
  else ok(`${tag}  image reaches the section's right edge (gap ${gap.toFixed(1)}px)`);

  // It is turning: the transform is not the identity translate.
  if (!/rotate|matrix/.test(layers.labelTransform) || layers.labelTransform === "none") {
    fail(`${tag}: the label layer carries no transform — it is not turning`);
  } else ok(`${tag}  label layer is transformed (${layers.labelTransform.slice(0, 40)}…)`);

  await p.close();
}

/* --- the phone must have none of it -------------------------------------- */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 1800));
  const hidden = await p.evaluate(() =>
    ["[data-rotation-disc]", "[data-rotation-label]"].every(
      (s) => getComputedStyle(document.querySelector(s)).display === "none",
    ),
  );
  if (hidden) ok("390   neither spinning layer renders on a phone");
  else fail("390: a spinning layer is rendered on a phone, which uses the other image entirely");
  await p.close();
}

await browser.close();
console.log(failed === 0 ? "\n  the record's layers line up at every width" : `\n  ${failed} problem(s)`);
process.exit(failed === 0 ? 0 : 1);
