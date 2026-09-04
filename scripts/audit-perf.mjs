/**
 * Enforces the scroll-performance rules that are easy to reintroduce by
 * accident. Comments are stripped first, so the notes explaining *why* these
 * properties are banned do not trip their own check.
 *
 *   node scripts/audit-perf.mjs
 */
import { readFileSync, globSync } from "node:fs";

const RULES = [
  ["mix-blend-mode", /mix-blend-mode|mixBlendMode|\bmix-blend-\w/],
  ["backdrop-filter", /backdrop-filter|backdropFilter|\bbackdrop-blur\b/],
  ["animated filter", /transition-\[filter\]|transition:[^;]*\bfilter\b|will-change:[^;]*filter/],
  ["filter: drop-shadow()", /filter:[^;]*drop-shadow|\bdrop-shadow-/],
  ["scroll listener", /addEventListener\(\s*["']scroll["']/],
  ["layout read in code", /getBoundingClientRect|\.offsetTop\b|\.scrollHeight\b/],
  ["will-change", /will-change|willChange/],

  /**
   * Never distort an image. `object-fit: fill` stretches; setting both width
   * and height in CSS without an aspect-ratio does the same thing more subtly.
   * Cropping (`cover`) and stretching look superficially similar and this is
   * the one that is always a bug.
   */
  ["object-fit: fill", /object-fit:\s*fill|\bobject-fill\b/],
];

/**
 * Blanks out comments while PRESERVING line count, so reported line numbers
 * match the file. Deleting block comments outright shifted every subsequent
 * line number and made the exemption pragma below line up with the wrong line.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^(\s*)\/\/.*$/gm, (_m, indent) => indent);
}

const PRAGMA = /\/\/\s*layout-read-ok:\s*\S+/;

function exemptLines(src) {
  const out = new Set();
  src.split("\n").forEach((line, i) => {
    if (PRAGMA.test(line)) {
      out.add(i + 1); // the pragma line itself
      out.add(i + 2); // and the line it annotates
    }
  });
  return out;
}

const files = globSync("{app,components}/**/*.{ts,tsx,css}");
let failed = 0;

for (const [label, re] of RULES) {
  const hits = [];
  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const exempt = exemptLines(raw);
    const lines = stripComments(raw).split("\n");
    lines.forEach((line, i) => {
      if (exempt.has(i + 1)) return;
      if (re.test(line)) hits.push(`${file}:${i + 1}  ${line.trim().slice(0, 90)}`);
    });
  }
  if (hits.length) {
    failed = 1;
    console.error(`FAIL  no ${label}`);
    for (const h of hits) console.error("        " + h);
  } else {
    console.log(`  ok  no ${label}`);
  }
}

process.exit(failed);
