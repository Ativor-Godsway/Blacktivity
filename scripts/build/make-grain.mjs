/**
 * Generates the tiling grain texture used by the paper ground.
 *
 * A fixed full-viewport element with mix-blend-mode forces the browser to
 * re-composite the entire viewport every scroll frame — it cannot be GPU
 * cached. A pre-rasterized tile drawn at plain opacity reads the same and
 * costs nothing per frame.
 *
 * REVISION 19 FLIPPED THE SPECKLE FROM BLACK TO BONE. The tile was opaque-ish
 * BLACK dots at low alpha — paper tooth for the sand ground. On #0E0C0B dark
 * speckle is invisible by construction, so the specks are --bone (237,231,219)
 * now and `.grain` drops to 5% opacity: light noise on near-black registers far
 * more per unit of alpha than dark noise on sand did, and 8.5% bone read as a
 * haze rather than as grain.
 *
 * The alpha DISTRIBUTION is unchanged — mostly-transparent with occasional
 * brighter specks, which is what reads as tooth rather than as TV static — and
 * the seed is the same, so the dot POSITIONS are identical to the old tile.
 * Only their colour moved. `npm run audit:grain` measures the result.
 *
 * REVISION 20 WRITES TWO TILES, because the site now alternates grounds:
 *
 *   public/grain.png       BONE speckle, for the black sections (opacity .08)
 *   public/grain-dark.png  INK  speckle, for the light  sections (opacity .055)
 *
 * Same seed, so the dot POSITIONS are identical in both and the texture does
 * not appear to change as the page scrolls from one ground to the other. Only
 * the colour differs.
 *
 * Run once: node scripts/build/make-grain.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 128;

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

// Deterministic noise so rebuilds do not churn the asset.
let seed = 0x9e3779b9;
const rand = () => {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed / 0xffffffff;
};

/**
 * One pass of noise in whichever colour is asked for. The seed is reset each
 * time so both tiles carry the SAME dot positions.
 */
function tile([R, G, B]) {
  seed = 0x9e3779b9;
  // RGBA rows, each prefixed with a filter byte (0 = none).
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
  let p = 0;
  for (let y = 0; y < SIZE; y++) {
    raw[p++] = 0;
    for (let x = 0; x < SIZE; x++) {
      // Bias toward mostly-transparent with occasional stronger specks, which
      // is what reads as paper tooth rather than TV static.
      const n = rand();
      const a = n > 0.86 ? Math.floor(90 + rand() * 165) : Math.floor(rand() * 60);
      raw[p++] = R; raw[p++] = G; raw[p++] = B; raw[p++] = a;
    }
  }
  return raw;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // colour type: RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

function write(path, rgb) {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(tile(rgb), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
  console.log(`${path} written — ${SIZE}x${SIZE}, ${(png.length / 1024).toFixed(1)}KB`);
}

// --bone, so the grain lifts off the black ground rather than sinking into it.
write("public/grain.png", [237, 231, 219]);
// --ink, for the light sections, where bone speckle is invisible by definition.
write("public/grain-dark.png", [14, 12, 11]);
