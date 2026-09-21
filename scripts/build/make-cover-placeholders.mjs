/**
 * Generates the temporary cover images, so that the layout, the motion and the
 * audits all work before any real photograph exists.
 *
 * They are DELIBERATELY, OBVIOUSLY FAKE: a flat --black-raised panel with a
 * --bone number on it and a hairline frame. A plausible-looking placeholder is
 * the one that ships — a numbered grey card cannot be mistaken for finished
 * work by anybody, including whoever has to replace it.
 *
 * WHY THIS WRITES PNG RATHER THAN JPG. There is no JPEG encoder in the Node
 * standard library, and adding an image dependency to produce throwaway assets
 * is a poor trade. PNG needs only `zlib`, which is built in, and a flat panel
 * deflates to a couple of kilobytes at full size — smaller than the JPG would
 * be. `public/cover/README.md` records that .png is accepted FOR THIS REASON
 * ONLY and that photographs must not ship as PNG.
 *
 * The dimensions are the real minimums from the README, so the placeholders
 * exercise the same `sizes` and the same srcset widths the photographs will:
 *
 *   landscape  2400 x 1350   16:9
 *   portrait   1440 x 1800   4:5
 *
 *   node scripts/build/make-cover-placeholders.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const COUNT = 5;
const LANDSCAPE = { w: 2400, h: 1350 };
const PORTRAIT = { w: 1440, h: 1800 };

/* --black-raised and --bone. The panel is the raised step rather than the page
   ground so a placeholder reads as a MISSING IMAGE rather than as a hole in the
   layout — which is also exactly what §9 asks a failed image to look like. */
const GROUND = [0x1a, 0x17, 0x15];
const INK = [0xed, 0xe7, 0xdb];

/* --- PNG plumbing -------------------------------------------------------- */

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/**
 * A 3x5 dot matrix per digit. Blocky on purpose — this is signage, not
 * typography, and a bitmap font is the only way to draw a glyph without
 * shipping a rasterizer.
 */
const DIGITS = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
};

/** True where the number's glyphs cover pixel (x, y). */
function makeMask({ w, h }, text) {
  // The number occupies a third of the short edge, centred.
  const cell = Math.floor(Math.min(w, h) / 3 / 5);
  const glyphW = 3 * cell;
  const gap = cell;
  const totalW = text.length * glyphW + (text.length - 1) * gap;
  const x0 = Math.floor((w - totalW) / 2);
  const y0 = Math.floor((h - 5 * cell) / 2);

  const on = new Uint8Array(w * h);

  text.split("").forEach((ch, gi) => {
    const rows = DIGITS[ch];
    if (!rows) return;
    const gx = x0 + gi * (glyphW + gap);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (rows[r][c] !== "1") continue;
        for (let y = y0 + r * cell; y < y0 + (r + 1) * cell; y++) {
          for (let x = gx + c * cell; x < gx + (c + 1) * cell; x++) on[y * w + x] = 1;
        }
      }
    }
  });

  // A hairline frame one cell in from each edge, so the placeholder shows where
  // the frame's edges are and makes a bad `object-position` obvious.
  const inset = cell;
  const t = Math.max(2, Math.floor(cell / 12));
  for (let y = inset; y < h - inset; y++) {
    for (let x = inset; x < w - inset; x++) {
      const onFrame =
        y < inset + t || y >= h - inset - t || x < inset + t || x >= w - inset - t;
      if (onFrame) on[y * w + x] = 1;
    }
  }

  return on;
}

function png({ w, h }, text) {
  const mask = makeMask({ w, h }, text);
  // RGB rows, each prefixed with a filter byte (0 = none).
  const raw = Buffer.alloc(h * (1 + w * 3));
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0;
    for (let x = 0; x < w; x++) {
      const c = mask[y * w + x] ? INK : GROUND;
      raw[p++] = c[0]; raw[p++] = c[1]; raw[p++] = c[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/cover/landscape", { recursive: true });
mkdirSync("public/cover/portrait", { recursive: true });

let total = 0;
for (let i = 1; i <= COUNT; i++) {
  const n = String(i).padStart(2, "0");
  for (const [dir, dim] of [["landscape", LANDSCAPE], ["portrait", PORTRAIT]]) {
    const buf = png(dim, n);
    writeFileSync(`public/cover/${dir}/${n}.png`, buf);
    total += buf.length;
    console.log(`  public/cover/${dir}/${n}.png  ${dim.w}x${dim.h}  ${(buf.length / 1024).toFixed(1)}KB`);
  }
}
console.log(`\n${COUNT * 2} placeholder(s), ${(total / 1024).toFixed(1)}KB total — replace them, see public/cover/README.md`);
