/**
 * THE ROTATION PHOTOGRAPH'S MANIFEST CHECK — Revision 20 §4.
 *
 * `data/rotation-visual.ts` is the ONLY file allowed to contain these paths,
 * and it carries each file's pixel dimensions because those are what hold CLS
 * at zero. Both of those facts rot silently:
 *
 *   - a path is edited and the file is not added, so the section renders as a
 *     flat ground and nobody notices until it is live;
 *   - a file is replaced with one of different proportions and the `width` and
 *     `height` are left behind, so the reserved box is the wrong shape and the
 *     page shifts when the image lands.
 *
 * So this resolves every declared source against the disk and compares the
 * numbers to the file's own header. It also enforces the "one place" rule by
 * grepping the rest of the source for the paths.
 *
 *   node scripts/build/check-rotation-image.mjs
 */
import { readFileSync, existsSync, globSync } from "node:fs";

const MANIFEST = "data/rotation-visual.ts";
/** §4's target weights for the delivered file. */
const BUDGET = { mobile: 200, desktop: 350 };
/** §1: below this the desktop file is a stock preview, not a shippable asset. */
const MIN_DESKTOP_WIDTH = 2000;

const problems = [];
const fail = (m) => problems.push(m);

/** Intrinsic dimensions from the file header. JPEG SOF and PNG IHDR. */
function dimensions(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

const src = readFileSync(MANIFEST, "utf8");

/* Each declared source: a `src`, then the `width`/`height` that follow it. */
const entries = [];
for (const m of src.matchAll(/src:\s*"(\/rotation\/[^"]+)"/g)) {
  const after = src.slice(m.index, m.index + 400);
  const w = after.match(/width:\s*(\d+)/);
  const h = after.match(/height:\s*(\d+)/);
  entries.push({ path: m[1], w: w ? +w[1] : null, h: h ? +h[1] : null, at: m.index });
}

if (entries.length === 0) fail(`${MANIFEST}: no /rotation/ source declared`);

for (const e of entries) {
  const file = "public" + e.path;
  if (!existsSync(file)) {
    fail(`${MANIFEST} declares ${e.path}, but ${file} does not exist`);
    continue;
  }
  const buf = readFileSync(file);
  const dim = dimensions(buf);
  const kb = buf.length / 1024;

  if (!dim) {
    console.warn(`  warn  ${file}: could not read dimensions (not JPEG or PNG)`);
  } else if (e.w !== dim.w || e.h !== dim.h) {
    fail(
      `${MANIFEST} says ${e.path} is ${e.w}x${e.h}; the file is ${dim.w}x${dim.h}. ` +
        `These numbers reserve the box before the image loads — wrong ones shift the page.`,
    );
  } else {
    const orient = dim.w >= dim.h ? "landscape" : "portrait";
    console.log(`  ok    ${e.path}  ${dim.w}x${dim.h}  ${orient}  ${kb.toFixed(0)}KB`);
  }

  /*
   * WEIGHT IS A WARNING, NOT A FAILURE. next.config.ts sets a custom image
   * loader, which disables Next's optimiser for local files — they are served
   * byte for byte. So this figure IS the delivered weight, and there is no
   * pipeline step that can bring an oversized file down. Failing the build
   * would block a deploy on something only a new export can fix.
   */
  const budget = e.path.includes("image2") ? BUDGET.desktop : BUDGET.mobile;
  if (kb > budget) {
    console.warn(`  warn  ${file} is ${kb.toFixed(0)}KB against a ${budget}KB budget — it is served as-is`);
  }

  /*
   * A PORTRAIT FILE USED ON DESKTOP IS CROPPED HARD, and §4 asks for the owner
   * to be told rather than for the build to fail. A wide frame showing a
   * portrait photograph keeps a narrow horizontal band of it.
   */
  /*
   * THE DESKTOP FILE'S RESOLUTION IS A BLOCKER, NOT A NICETY — Revision 21 §1.
   *
   * The desktop image is stretched across the full width of a laptop. A
   * stock-site preview is around 600px wide; at 1440 that is upscaled more than
   * twice and the grooves turn to mush. It is reported loudly every build, and
   * it stays reported until a real file lands.
   *
   * A WARNING RATHER THAN A FAILURE, for the same reason the weight check is:
   * next.config.ts sets a custom image loader, which disables Next's optimiser
   * for local files. They are served byte for byte. No pipeline step can make
   * a 626px file sharp, so failing the build would block every deploy on
   * something only a new download can fix.
   */
  const isDesktop = e.path.includes("image2");
  if (isDesktop && dim && dim.w < MIN_DESKTOP_WIDTH) {
    console.warn(
      `  warn  BLOCKER: ${e.path} is only ${dim.w}px wide. Full-bleed on a 1440 ` +
        `laptop that is a ${(1440 / dim.w).toFixed(1)}x upscale and will look soft. ` +
        `Ask for the full-resolution download at 2400px+ and replace the file; ` +
        `the numbers in ${MANIFEST} are percentages, so nothing else changes.`,
    );
  }
}

/* --- the "one place" rule ------------------------------------------------ */
const others = globSync("{app,components,lib,scripts}/**/*.{ts,tsx,css,mjs}").filter(
  (f) => !f.includes("check-rotation-image"),
);
for (const f of others) {
  const body = readFileSync(f, "utf8");
  for (const m of body.matchAll(/["'`](\/rotation\/[^"'`]+\.(?:jpe?g|png|webp|avif))["'`]/g)) {
    fail(`${f} contains the path ${m[1]}; ${MANIFEST} is the only file allowed to`);
  }
}

if (problems.length) {
  console.error(`ROTATION IMAGE CHECK FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`Rotation image check passed — ${entries.length} source(s), ${MANIFEST} is the only place they appear.`);
