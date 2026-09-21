/**
 * THE COVER PAIR CHECK — Revision 19 §5.
 *
 * Fails the build when `data/cover.ts` and `public/cover/` disagree. Four ways
 * they can:
 *
 *   1. an entry with no `landscape/NN` file
 *   2. an entry with no `portrait/NN` file
 *   3. a file in either folder with no entry
 *   4. an entry with an empty `alt`
 *   5. an `alt` or `caption` still carrying PLACEHOLDER text
 *   6. a filename whose case does not match the manifest's expectation
 *
 * WHY THIS IS A HARD FAILURE AND NOT A WARNING. The two halves of a slide are
 * two files added by hand in two folders, and a missing portrait is INVISIBLE on
 * the machine of whoever added the landscape one — desktop never requests it.
 * The first person to see the gap is a reader on a phone looking at a blank
 * cover. A warning in a build log nobody reads is not a check.
 *
 * Direction 3 matters as much as 1 and 2: an orphaned file is a photograph
 * somebody meant to ship. Silently ignoring it means the work was done and the
 * image never appeared, which is the failure mode that takes longest to notice.
 *
 * It reads the manifest with a regex rather than importing it, so it runs as
 * plain node with no TypeScript loader in the chain — this has to work in a
 * build step and a pre-commit hook alike. The fields it needs are `id` and
 * `alt`, both of which are simple string literals by the manifest's own type.
 *
 * IT ALSO GENERATES `data/cover-files.ts`, and that is the second reason it is
 * a build step rather than a lint. The manifest records an `id`, not a
 * filename, because a photograph may arrive as .jpg or .webp and the cover
 * should not care — but the COMPONENT has to emit a real `src`, a real `width`
 * and a real `height`, and it cannot read the filesystem at render time on
 * every runtime the site might be deployed to. So the pairing this check has
 * already done is written out as a typed module: id -> two paths and two sets
 * of intrinsic dimensions.
 *
 * That makes the generated file a build artefact with the check as its only
 * author. It is committed, so a clone builds without running anything first,
 * and `--check` fails if it has drifted from what is on disk.
 *
 *   node scripts/build/check-cover.mjs
 *   node scripts/build/check-cover.mjs --check   (verify, do not write)
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";

const MANIFEST = "data/cover.ts";
const DIRS = ["landscape", "portrait"];
const IMAGE = /\.(jpe?g|webp|png)$/i;
/** Mirrors COVER_MAX in the manifest. */
const MAX = 10;
const GENERATED = "data/cover-files.ts";
const CHECK_ONLY = process.argv.includes("--check");

/**
 * The README's minimums. Under them a photograph is visibly soft on a large
 * display, because the cover is full-bleed — there is no column to hide in.
 *
 * A WARNING, NOT A FAILURE. The four hard failures above are all cases where
 * the site is BROKEN — a blank slide, an unlabelled image. An undersized
 * photograph still renders, still reads, and may be the only copy that exists
 * of an archival frame. Blocking the build on it would mean the choice between
 * shipping nothing and deleting the check, and the check would lose.
 */
const MIN_LONG_EDGE = { landscape: 2400, portrait: 1440 };

/** Intrinsic dimensions, from the file header. JPEG SOF and PNG IHDR only. */
function dimensions(buf) {
  // PNG: IHDR is always the first chunk, width and height at byte 16.
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // JPEG: walk the marker segments to the start-of-frame, which carries both.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      // SOF0-SOF15, excluding the three that are not frame headers.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  // WebP: VP8X/VP8/VP8L each store it differently. Not parsed — the cover does
  // not need the number badly enough to carry three more decoders, and a
  // missing size simply means no intrinsic width/height attribute for that one.
  return null;
}

const problems = [];
const fail = (m) => problems.push(m);

/* --- the manifest -------------------------------------------------------- */

const src = readFileSync(MANIFEST, "utf8");

/*
  One entry per `{ … }` inside the coverSlides array. The array is sliced out
  first so that `coverIssue` above it and the exports below it cannot contribute
  a stray `id:`.
*/
const arrayStart = src.indexOf("export const coverSlides");
if (arrayStart === -1) fail(`${MANIFEST}: no \`export const coverSlides\` found`);
const arrayEnd = src.indexOf("\n];", arrayStart);
const body = arrayStart === -1 ? "" : src.slice(arrayStart, arrayEnd);

const entries = [];
for (const m of body.matchAll(/id:\s*"([^"]*)"/g)) entries.push({ id: m[1], at: m.index });
for (const e of entries) {
  const after = body.slice(e.at, e.at + 900);
  const alt = after.match(/alt:\s*"([^"]*)"/);
  e.alt = alt ? alt[1] : null;
  const caption = after.match(/caption:\s*"([^"]*)"/);
  e.caption = caption ? caption[1] : null;
}

if (entries.length === 0) fail(`${MANIFEST}: the manifest has no slides`);

const seen = new Set();
for (const e of entries) {
  if (!/^\d{2}$/.test(e.id)) fail(`${MANIFEST}: id "${e.id}" is not two digits — see public/cover/README.md`);
  if (seen.has(e.id)) fail(`${MANIFEST}: id "${e.id}" appears twice`);
  seen.add(e.id);
  if (!e.alt) fail(`${MANIFEST}: slide ${e.id} has no alt text — §5 requires one on every content image`);

  /*
   * PLACEHOLDER TEXT CANNOT SHIP — Revision 20 §1.6.
   *
   * THIS IS NOT PEDANTRY, IT ALREADY HAPPENED. Slides 04 and 05 shipped with
   * `alt: "PLACEHOLDER — describe the real photograph here before this ships"`,
   * their generated images failed to load, and the browser did exactly what a
   * browser does with a broken image: it painted the alt text. The words
   * "PLACEHOLDER — describe the real photograph" appeared at the top left of
   * the home page.
   *
   * An alt string is not a code comment. It is copy, it is one failed request
   * away from being visible, and it is read aloud to anyone using a screen
   * reader whether the image loads or not. A caption is plain visible text and
   * needs no excuse at all.
   */
  for (const [field, value] of [["alt", e.alt], ["caption", e.caption]]) {
    if (value && /placeholder/i.test(value)) {
      fail(
        `${MANIFEST}: slide ${e.id} ${field} is still placeholder text — ` +
          `"${value.slice(0, 60)}". It is one failed image request from being on screen.`,
      );
    }
  }
}

/* --- the files ----------------------------------------------------------- */

/** number -> filename, per folder. */
const files = {};
for (const dir of DIRS) {
  const path = `public/cover/${dir}`;
  files[dir] = new Map();
  if (!existsSync(path)) {
    fail(`${path}/ does not exist — see public/cover/README.md`);
    continue;
  }
  for (const name of readdirSync(path)) {
    if (name.startsWith(".") || name === "README.md") continue;
    if (!IMAGE.test(name)) {
      fail(`${path}/${name}: not a .jpg, .jpeg, .webp or .png`);
      continue;
    }
    const n = name.replace(IMAGE, "");
    if (!/^\d{2}$/.test(n)) {
      fail(`${path}/${name}: filenames are two zero-padded digits — 01, 02, 03`);
      continue;
    }
    if (files[dir].has(n)) fail(`${path}/: two files numbered ${n} (${files[dir].get(n)} and ${name})`);
    files[dir].set(n, name);

    /*
     * EXTENSION CASE — macOS is case-insensitive, Vercel's filesystem is not.
     * `01.JPG` on disk referenced as `01.jpg` resolves perfectly on the machine
     * it was added on and 404s the moment it is deployed, which is the worst
     * possible place to find out. The generated module below carries the exact
     * name from `readdir`, so the reference is always right — but a file with
     * an upper-case extension is still a trap for anything that hand-writes a
     * path, so it is flagged here rather than silently accommodated.
     */
    const ext = name.slice(name.lastIndexOf("."));
    if (ext !== ext.toLowerCase()) {
      fail(`${path}/${name}: extension must be lower-case — "${ext}" 404s on a case-sensitive host`);
    }
  }
}

/* --- the two directions ------------------------------------------------- */

for (const e of entries) {
  for (const dir of DIRS) {
    if (!files[dir].has(e.id)) {
      fail(`slide ${e.id} is in the manifest but public/cover/${dir}/${e.id}.* is missing`);
    }
  }
}

for (const dir of DIRS) {
  for (const n of files[dir].keys()) {
    if (!seen.has(n)) {
      fail(`public/cover/${dir}/${files[dir].get(n)} has no entry in ${MANIFEST}`);
    }
  }
}

/* --- counts -------------------------------------------------------------- */

if (entries.length > MAX) {
  console.warn(
    `  warn  ${entries.length} slides; the cover renders the first ${MAX} — §5`,
  );
}
if (entries.length > 0 && entries.length < 3) {
  console.log(
    `  note  ${entries.length} slide(s): the cover renders STATICALLY, slide 01 only — §5`,
  );
}

/* --- resolution, and the generated module ------------------------------- */

const generated = [];

for (const e of entries) {
  const row = { id: e.id };
  for (const dir of DIRS) {
    const name = files[dir].get(e.id);
    if (!name) continue;
    const path = `public/cover/${dir}/${name}`;
    const dim = dimensions(readFileSync(path));
    row[dir] = { src: `/cover/${dir}/${name}`, ...(dim ?? {}) };
    if (dim) {
      const long = Math.max(dim.w, dim.h);
      if (long < MIN_LONG_EDGE[dir]) {
        console.warn(
          `  warn  ${path} is ${dim.w}x${dim.h}; the README asks for ` +
            `${MIN_LONG_EDGE[dir]}px on the long edge. It will be soft full-bleed.`,
        );
      }
    }
  }
  generated.push(row);
}

const module_ = `/**
 * GENERATED by \`node scripts/build/check-cover.mjs\` — do not edit.
 *
 * The bridge between \`data/cover.ts\`, which knows ids, and the cover
 * components, which need a src and intrinsic dimensions. Regenerate after
 * adding, removing or replacing anything in \`public/cover/\`; the same script
 * run with --check fails if this file has drifted from what is on disk.
 */
export type CoverFile = { src: string; w?: number; h?: number };

export const coverFiles: Record<string, { landscape: CoverFile; portrait: CoverFile }> = {
${generated
  .map(
    (r) =>
      `  "${r.id}": {\n` +
      `    landscape: ${JSON.stringify(r.landscape ?? {})},\n` +
      `    portrait: ${JSON.stringify(r.portrait ?? {})},\n` +
      `  },`,
  )
  .join("\n")}
};
`;

if (problems.length === 0) {
  const existing = existsSync(GENERATED) ? readFileSync(GENERATED, "utf8") : null;
  if (existing !== module_) {
    if (CHECK_ONLY) {
      fail(`${GENERATED} is out of date — run \`node scripts/build/check-cover.mjs\``);
    } else {
      writeFileSync(GENERATED, module_);
      console.log(`  wrote ${GENERATED}`);
    }
  }
}

/* --- verdict ------------------------------------------------------------ */

if (problems.length) {
  console.error(`COVER CHECK FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems) console.error("  " + p);
  console.error("\nSee public/cover/README.md for the folder contract.");
  process.exit(1);
}

console.log(
  `Cover check passed — ${entries.length} slide(s), ${entries.length * 2} files, every pair matched and every alt present.`,
);
