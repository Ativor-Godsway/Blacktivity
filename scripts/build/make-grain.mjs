/**
 * Generates the tiling grain texture used by the paper ground.
 *
 * A fixed full-viewport element with mix-blend-mode forces the browser to
 * re-composite the entire viewport every scroll frame — it cannot be GPU
 * cached. A pre-rasterized tile drawn at plain opacity reads the same and
 * costs nothing per frame.
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

// RGBA rows, each prefixed with a filter byte (0 = none).
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0;
  for (let x = 0; x < SIZE; x++) {
    // Bias toward mostly-transparent with occasional darker specks, which is
    // what reads as paper tooth rather than TV static.
    const n = rand();
    const a = n > 0.86 ? Math.floor(90 + rand() * 165) : Math.floor(rand() * 60);
    raw[p++] = 0; raw[p++] = 0; raw[p++] = 0; raw[p++] = a;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // colour type: RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync("public/grain.png", png);
console.log(`public/grain.png written — ${SIZE}x${SIZE}, ${(png.length / 1024).toFixed(1)}KB`);
