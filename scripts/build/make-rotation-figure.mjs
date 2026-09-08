/**
 * Encodes the Rotation cut-out to AVIF and WebP, and reports the matte.
 *
 *   npm run build:rotation-figure
 *
 * WHY THIS SCRIPT EXISTS AT ALL — read before "simplifying" it away.
 *
 * Revision 16 §1 asks for the figure to be dropped in public/ and served as
 * AVIF/WebP by next/image. On this codebase that does not happen, and the
 * reason is two lines in next.config.ts:
 *
 *     loader: "custom",
 *     loaderFile: "./lib/image-loader.ts",
 *
 * `loader: "custom"` DISABLES the built-in /_next/image route entirely — it is
 * not a per-host opt-in, as lib/image-loader.ts says in its own header. That
 * loader rewrites Cloudinary and Unsplash URLs and returns everything else
 * untouched, so a local /rotation/figure.png is served exactly as it sits on
 * disk: 780KB of PNG, no format negotiation, no resizing. There is no
 * per-image escape hatch; the loader is global.
 *
 * So the conversion the pipeline would normally do happens HERE instead, once,
 * at author time, and the component ships a <picture> with the encoded files.
 * That is strictly better for this particular asset anyway — it is a single
 * static decorative image that changes only when someone deliberately swaps
 * it, so paying for the encode on every request would be wasteful even if the
 * optimizer were available.
 *
 * It also re-checks the matte against --espresso rather than white, per §1: a
 * cut-out matted on a white artboard shows a bright halo on a dark ground, and
 * that is the first thing anyone notices. The check compares the luminance of
 * the semi-transparent edge against the opaque interior — a white matte pushes
 * the edge BRIGHTER than the body it belongs to.
 */
import sharp from "sharp";
import { existsSync, statSync } from "node:fs";

const SRC = "public/rotation/figure.png";

/** Over ~400KB delivered is wrong — Revision 16 §7. */
const BUDGET_KB = 400;

const kb = (bytes) => bytes / 1024;
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/*
 * `--check` — the staleness guard, wired into `npm run audit:all`.
 *
 * The failure this exists to catch is silent and very easy to hit: drop a NEW
 * figure.png in and forget to re-run the encode. The <picture> lists AVIF and
 * WebP ahead of the PNG, so the browser keeps choosing a derivative built from
 * the OLD photograph and the new one never appears. Nothing errors, nothing
 * 404s, and the page looks like it simply ignored you.
 */
if (process.argv.includes("--check")) {
  const missing = ["avif", "webp"].filter((e) => !existsSync(`public/rotation/figure.${e}`));
  if (missing.length) {
    console.error(
      `FAIL  public/rotation/figure.{${missing.join(",")}} missing — run \`npm run build:rotation-figure\``,
    );
    process.exit(1);
  }
  const png = statSync(SRC).mtimeMs;
  const stale = ["avif", "webp"].filter((e) => statSync(`public/rotation/figure.${e}`).mtimeMs < png);
  if (stale.length) {
    console.error(
      `FAIL  figure.png is newer than figure.{${stale.join(",")}} — the page is still serving the OLD` +
        `\n      cut-out, because <picture> prefers the derivatives. Run \`npm run build:rotation-figure\`.`,
    );
    process.exit(1);
  }
  console.log("  ok  rotation figure derivatives exist and are newer than the source PNG");
  process.exit(0);
}

const input = sharp(SRC);
const meta = await input.metadata();

if (!meta.hasAlpha) {
  console.error(`FAIL  ${SRC} has no alpha channel — it is not a cut-out.`);
  process.exit(1);
}

/* --- the matte, measured against the ground it will actually sit on -------- */
{
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let edgeSum = 0, edgeN = 0, bodySum = 0, bodyN = 0, ghost = 0;
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const a = data[o + 3];
    const l = lum(data[o], data[o + 1], data[o + 2]);
    if (a > 250) { bodySum += l; bodyN++; }
    else if (a > 8) { edgeSum += l; edgeN++; }
    else if (l > 200) ghost++;
  }

  const edge = edgeSum / Math.max(edgeN, 1);
  const body = bodySum / Math.max(bodyN, 1);

  console.log(`  matte: edge luminance ${edge.toFixed(1)} vs body ${body.toFixed(1)}`);
  console.log(`         ${ghost} fully-transparent pixels carry bright RGB residue`);

  // A white matte leaves the edge markedly brighter than the body it trims.
  // Some headroom: a genuinely light subject edge (a white strap, chrome) is
  // legitimately brighter, so this only fires on a wholesale halo.
  if (edge > body + 40) {
    console.error(
      `FAIL  the cut-out edge is ${(edge - body).toFixed(1)} brighter than the body — ` +
        `this will halo against #241c16. Re-matte against the espresso ground.`,
    );
    process.exit(1);
  }
  console.log(`         ok — no halo against espresso (#241c16)`);
}

/* --- encode --------------------------------------------------------------
   Native resolution, never upscaled. Revision 16 §1 asks for a ~1640x2048
   export; if the file on disk is smaller than that, that is a note for whoever
   supplies the asset, not licence to invent pixels sharp does not have. */
const targets = [
  { ext: "avif", run: (p) => p.avif({ quality: 55, effort: 6 }) },
  { ext: "webp", run: (p) => p.webp({ quality: 78, effort: 6, alphaQuality: 90 }) },
];

console.log(`\n  source: ${meta.width}x${meta.height}, ${kb(statSync(SRC).size).toFixed(0)}KB PNG`);
if (meta.width < 1400) {
  console.log(
    `  NOTE  §1 asks for roughly 1640x2048; this file is ${meta.width}x${meta.height}.` +
      `\n        Encoded at native size — upscaling would invent detail. Supply a 2x` +
      `\n        export and re-run to get the intended density.`,
  );
}

let failed = false;
for (const { ext, run } of targets) {
  const out = `public/rotation/figure.${ext}`;
  await run(sharp(SRC)).toFile(out);
  const size = kb(statSync(out).size);

  // Transparency has to survive the round trip, or the cut-out becomes a box.
  const check = await sharp(out).metadata();
  const alpha = check.hasAlpha ? "alpha kept" : "ALPHA LOST";
  if (!check.hasAlpha) failed = true;

  const verdict = size > BUDGET_KB ? `OVER ${BUDGET_KB}KB BUDGET` : "ok";
  if (size > BUDGET_KB) failed = true;

  console.log(
    `  ${out.padEnd(30)} ${size.toFixed(0).padStart(4)}KB  ${check.width}x${check.height}  ${alpha}  ${verdict}`,
  );
}

process.exit(failed ? 1 : 0);
