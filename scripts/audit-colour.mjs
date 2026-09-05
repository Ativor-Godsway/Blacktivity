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

/**
 * Everything permitted in UI chrome, lowercased, no alpha. REVISION 12: this is
 * the warm-neutral palette, and it REPLACED the monochrome list rather than
 * being widened to accept both. Pure black and pure white are no longer on it
 * in any form — not as a colour, not as an alpha base — because the whole point
 * of the change is that the neutrals themselves carry the warmth.
 */
const ALLOWED_HEX = new Set([
  "#ede7db", // sand — page ground
  "#e2d9c8", // sand-raised
  "#c9b79c", // tan — decorative on light grounds only
  "#2a211a", // ink
  "#574a3e", // ink-2
  "#6b5d50", // muted
  "#a2937f", // muted-dark
  "#241c16", // espresso
]);

/**
 * rgb()/rgba() is only permitted as an alpha of a token — that is how the
 * hairline and fill tokens are built (`rgba(42,33,26,0.16)` is ink at 16%).
 */
const ALPHA_BASES = [
  [42, 33, 26], // ink — rules and fills on the light grounds
  [237, 231, 219], // sand — rules and fills inside .on-espresso
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

    // Hue-bearing utilities break the token rule; `black` and `white` break the
    // warm-neutral rule, which is a different thing and just as important —
    // revision 12 removed pure black and pure white from the system entirely.
    // The admin is excluded from this file, so its dark rail keeps them.
    for (const m of code.matchAll(
      /\b(?:bg|text|border|fill|stroke|from|via|to|ring|shadow|accent|decoration|outline)-(black|white|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)(-\d{2,3})?(\/\[?[0-9.]+\]?)?\b/g,
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
