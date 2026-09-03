/**
 * COLOUR AUDIT
 *
 * Enforces the one design rule: no colour outside the approved token list may
 * appear in UI chrome. Photographs are the only source of colour.
 *
 * The old "must be pure greyscale" check no longer applies — the ramp is warm
 * neutral now — so this validates against the token list itself.
 *
 *   node scripts/audit-colour.mjs
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

/** Everything permitted in UI chrome, lowercased, no alpha. */
const ALLOWED_HEX = new Set([
  "#f2f1ee", // paper
  "#e8e7e3", // paper-raised
  "#0b0b0b", // ink
  "#000000", "#000", // void
  "#6e6c68", // grey-70
  "#a8a6a1", // grey-45
  "#c9c7c2", // grey-25
  "#4a4844", // grey-25 equivalent on the void ground
  "#111111", // bg-raised on void
  "#ffffff", "#fff", // permitted ONLY as an alpha base for rules/fills on black
]);

/**
 * rgb()/rgba() is only permitted as an alpha of a token — that is how the
 * hairline and fill tokens are built (`rgba(11,11,11,0.12)` is ink at 12%).
 */
const ALPHA_BASES = [
  [0, 0, 0], // void
  [255, 255, 255], // the white used for rules and fills on the black ground
  [11, 11, 11], // ink
  [242, 241, 238], // paper
];

function rgbIsToken(r, g, b) {
  return ALPHA_BASES.some(([R, G, B]) => R === r && G === g && B === b);
}

/**
 * The admin is EXCLUDED, not exempted. It has its own palette (see
 * app/admin/admin.css) because it is a tool, not a brand surface. The public
 * site's one-colour rule is unchanged and still enforced everywhere else;
 * `npm run audit:admin-colour` separately proves the two never mix.
 */
const files = globSync("{app,components,lib,data}/**/*.{ts,tsx,css}", {
  exclude: (p) => p.includes("node_modules"),
}).filter((f) => !f.startsWith("app/admin") && !f.startsWith("components/admin"));

const problems = [];

for (const file of files) {
  // Seed/placeholder image URLs are photography, not chrome.
  if (file.endsWith("seed-content.ts") || file.endsWith("covers.ts")) continue;

  const src = readFileSync(file, "utf8");

  src.split("\n").forEach((line, i) => {
    // Skip comment lines — token docs quote hexes legitimately.
    const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");

    for (const m of code.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const hex = m[0].toLowerCase();
      if (!ALLOWED_HEX.has(hex)) {
        problems.push(`${file}:${i + 1}  ${m[0]}  (not an approved token)`);
      }
    }

    for (const m of code.matchAll(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/g)) {
      const [r, g, b] = [+m[1], +m[2], +m[3]];
      if (!rgbIsToken(r, g, b)) {
        problems.push(`${file}:${i + 1}  ${m[0]})  (not an alpha of a token)`);
      }
    }

    // Named CSS colours and any hue-bearing utility would both break the rule.
    for (const m of code.matchAll(
      /\b(?:bg|text|border|fill|stroke|from|via|to|ring|shadow|accent|decoration|outline)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g,
    )) {
      problems.push(`${file}:${i + 1}  ${m[0]}  (Tailwind palette colour)`);
    }
  });
}

if (problems.length) {
  console.error(`COLOUR AUDIT FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}

console.log(`Colour audit passed — ${files.length} files, no colour outside the token list.`);
