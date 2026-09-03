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
];

/** Removes /* *\/ blocks, // line comments and {/* *\/} JSX comments. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const files = globSync("{app,components}/**/*.{ts,tsx,css}");
let failed = 0;

for (const [label, re] of RULES) {
  const hits = [];
  for (const file of files) {
    const lines = stripComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
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
