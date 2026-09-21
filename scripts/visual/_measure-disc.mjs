/**
 * Measures the vinyl record in public/rotation/image2.jpg so that
 * data/rotation-visual.ts can carry exact numbers rather than eyeballed ones.
 *
 * Decoding happens in the browser because a canvas is already a JPEG decoder;
 * adding an image library to measure one file once would be a poor trade.
 *
 * THE NAIVE MEASUREMENTS BOTH FAILED, and the reasons are worth recording:
 *
 *   - The label's centroid, taken as "every pixel brighter than 200", caught
 *     the record's glossy highlight arc as well as the label, and returned a
 *     blob 62px wide by 107px tall. A circle is not that shape.
 *   - Walking left from that centre looking for the first pixel back at ground
 *     brightness stopped after 0.3px, because the label itself is white.
 *
 * So the disc is found as a MASK instead: dark pixels, column by column, fitted
 * to a circle from three columns where the record is not clipped by any edge.
 */
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";

const b64 = readFileSync("public/rotation/image2.jpg").toString("base64");
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu"],
});
const p = await b.newPage();

const out = await p.evaluate(async (b64) => {
  const img = new Image();
  img.src = "data:image/jpeg;base64," + b64;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const W = img.width, H = img.height;
  const d = ctx.getImageData(0, 0, W, H).data;
  const at = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const L = (x, y) => { const [r, g, bb] = at(x, y); return 0.2126 * r + 0.7152 * g + 0.0722 * bb; };

  /* --- the flat grey, from a strip the notes never reach ---------------- */
  const med = (arr) => arr.slice().sort((a, z) => a - z)[Math.floor(arr.length / 2)];
  const cols = [[], [], []];
  for (let x = 0; x < 30; x++) for (let y = 0; y < H; y += 2) {
    const px = at(x, y);
    for (let k = 0; k < 3; k++) cols[k].push(px[k]);
  }
  const ground = cols.map((a) => Math.round(med(a)));
  const groundL = 0.2126 * ground[0] + 0.7152 * ground[1] + 0.0722 * ground[2];

  /*
   * --- ISOLATE THE RECORD, THEN FIT ITS VISIBLE ARC ----------------------
   *
   * Three earlier attempts failed, and each failure is a fact about the image:
   *
   *   1. Masking on DARKNESS split every column through the white label into
   *      two half-chords and put the centre 94px off.
   *   2. Masking on NOT-THE-GROUND fixed that, but the leftmost "usable"
   *      column was a music note, and one bad column in a two-point fit is the
   *      whole fit. Worst residual: 59px on a 100px radius.
   *   3. Flood-filling from the right edge isolates the record cleanly — the
   *      notes are all separate from it — but its bounding box is not its
   *      diameter, because THE RECORD IS CLIPPED ON THREE SIDES. It runs off
   *      the top, the right and the bottom of the frame.
   *
   * So: flood fill to isolate, then fit a circle to the one boundary that is
   * actually visible — the left arc. Kasa's algebraic fit, which is linear in
   * (cx, cy, R^2) and therefore has no starting guess to get wrong.
   */
  const NOT_GROUND = 22;
  const isRecord = (x, y) => Math.abs(L(x, y) - groundL) > NOT_GROUND;

  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let y = 0; y < H; y++) {
    if (isRecord(W - 1, y)) { stack.push((W - 1) + y * W); seen[(W - 1) + y * W] = 1; }
  }
  let area = 0;
  while (stack.length) {
    const i = stack.pop();
    const x = i % W, y = (i - x) / W;
    area++;
    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
      const ni = nx + ny * W;
      if (seen[ni] || !isRecord(nx, ny)) return;
      seen[ni] = 1; stack.push(ni);
    };
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }

  /* The left boundary, one point per row. Rows whose boundary sits on the
     frame edge carry no shape information and are dropped. */
  const pts = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (seen[x + y * W]) { if (x > 1) pts.push([x, y]); break; }
    }
  }

  /* Kasa: minimise sum((x^2+y^2) + A*x + B*y + C)^2, linear least squares. */
  const fit = (points) => {
    let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sz = 0, Szx = 0, Szy = 0;
    const n = points.length;
    for (const [x, y] of points) {
      const z = x * x + y * y;
      Sx += x; Sy += y; Sxx += x * x; Syy += y * y; Sxy += x * y;
      Sz += z; Szx += z * x; Szy += z * y;
    }
    const M = [
      [Sxx, Sxy, Sx],
      [Sxy, Syy, Sy],
      [Sx, Sy, n],
    ];
    const v = [-Szx, -Szy, -Sz];
    // 3x3 solve by Cramer.
    const det = (m) =>
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const sub = (col) => M.map((row, r) => row.map((val, c) => (c === col ? v[r] : val)));
    const D = det(M);
    const A = det(sub(0)) / D, B = det(sub(1)) / D, C = det(sub(2)) / D;
    const ccx = -A / 2, ccy = -B / 2;
    const R = Math.sqrt(ccx * ccx + ccy * ccy - C);
    return { ccx, ccy, R };
  };

  /* One pass, then reject points more than 3px off and fit again — that drops
     any note the flood fill happened to bridge into. */
  let f = fit(pts);
  const kept = pts.filter(([x, y]) => Math.abs(Math.hypot(x - f.ccx, y - f.ccy) - f.R) < 3);
  f = fit(kept);
  const cx = f.ccx, cy = f.ccy, discR = f.R;
  const residuals = kept.map(([x, y]) => Math.abs(Math.hypot(x - cx, y - cy) - discR));
  const worstResidual = Math.max(...residuals);
  const meanResidual = residuals.reduce((a, b) => a + b, 0) / residuals.length;

  /* --- the label, measured outward from the fitted centre ---------------
     Rays rather than a bounding box: the label sits inside a glossy highlight
     arc that is just as bright and much taller, and a box around "everything
     bright" returned 62 x 107 for a circle. A ray stops at the first pixel
     that is no longer label-white, and the median across rays ignores the two
     or three that run off the right edge. */
  const labelRadii = [];
  for (let t = 0; t < 72; t++) {
    const ang = (t / 72) * Math.PI * 2;
    let r = 6; // start outside the black spindle hole
    let last = 0;
    for (; r < discR; r += 0.5) {
      const x = Math.round(cx + Math.cos(ang) * r);
      const y = Math.round(cy + Math.sin(ang) * r);
      if (x < 0 || x >= W || y < 0 || y >= H) { last = 0; break; }
      if (L(x, y) < 150) { last = r; break; }
    }
    if (last > 8) labelRadii.push(last);
  }
  labelRadii.sort((a, z) => a - z);
  const labelR = labelRadii.length ? labelRadii[Math.floor(labelRadii.length / 2)] : 0;

  /*
   * --- how far out do the notes reach? -----------------------------------
   * §5 says to shrink the disc layer inside any note that overlaps its edge,
   * so this reports the nearest dark pixel outside the disc that is NOT part
   * of it — measured as a radius from the disc's centre.
   */
  let nearestNote = Infinity;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const r = Math.hypot(x - cx, y - cy);
    if (r <= discR + 2) continue;
    if (isRecord(x, y)) nearestNote = Math.min(nearestNote, r);
  }

  return { W, H, ground, groundL, cx, cy, discR, labelR, nearestNote, area, arcPoints: kept.length, worstResidual, meanResidual };
}, b64);

await b.close();
const pct = (v, total) => +((v / total) * 100).toFixed(3);
const hex = out.ground.map((v) => v.toString(16).padStart(2, "0")).join("");
console.log(JSON.stringify(out, null, 1));
console.log("\n--- for data/rotation-visual.ts");
console.log(`ground: "#${hex}"`);
console.log(`cx: ${pct(out.cx, out.W)}%   cy: ${pct(out.cy, out.H)}%`);
console.log(`discR:  ${pct(out.discR, out.W)}% of width  (${out.discR.toFixed(1)}px)`);
console.log(`labelR: ${pct(out.labelR, out.W)}% of width  (${out.labelR.toFixed(1)}px)`);
console.log(`nearest note outside the disc: ${out.nearestNote.toFixed(1)}px  (disc is ${out.discR.toFixed(1)}px)`);
console.log(`arc fit: ${out.arcPoints} boundary points, mean residual ${out.meanResidual.toFixed(2)}px, worst ${out.worstResidual.toFixed(2)}px`);
process.exit(0);
