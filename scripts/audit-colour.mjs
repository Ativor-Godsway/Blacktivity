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
 * Everything permitted in UI chrome, lowercased, no alpha.
 *
 * REVISION 19 REPLACED THIS LIST RATHER THAN WIDENING IT. The warm-neutral
 * light grounds and their inks are not "also allowed" — they are gone, and a
 * hex from the old palette appearing anywhere in the public site is now a
 * failure, which is the whole point of replacing the list instead of adding to
 * it. Pure black and pure white remain off it in every form.
 */
const ALLOWED_HEX = new Set([
  "#0e0c0b", // black — the page ground, the whole public site
  "#1a1715", // black-raised — cards, hovers, inset panels
  "#ede7db", // bone — all primary type (the old --sand value, new job)
  "#b9af9f", // bone-2 — secondary text, excerpts, card titles at rest
  "#8f8476", // muted — mono labels, dates, metadata
  "#c9b79c", // tan — accent; TYPE-SAFE on black at 9.98
  // The Rotation gradient's two stops, re-derived on black.
  "#201c19", // black-lift — the gradient's light end
  "#080706", // black-deep — the gradient's dark end

  /* --- REVISION 20: THE LIGHT GROUND -------------------------------------
     The site alternates black and white section by section. Exactly three new
     values plus two that are restatements: --ink IS --black, so #0e0c0b is
     already on this list above, and it is not repeated. */
  "#f6f4f0", // paper        — light ground
  "#ece9e3", // paper-raised — cards and hovers on light
  "#6b635a", // ink-muted    — mono labels, dates on light
  "#3d3833", // ink-2        — secondary text, excerpts, article body
]);

/**
 * rgb()/rgba() is only permitted as an alpha of a token — that is how the
 * hairline and fill tokens are built (`rgba(237,231,219,0.14)` is bone at 14%).
 *
 * TWO BASES, ONE PER GROUND. A hairline on a dark section is an alpha of
 * --bone; the same hairline on a light section is an alpha of --ink. The old
 * warm-neutral base (42,33,26) is still gone and still a failure.
 */
const ALPHA_BASES = [
  [237, 231, 219], // bone — rules, grid lines and fills on the dark ground
  /* Revision 20: the same rules and fills on a light section, which are an
     alpha of --ink. This base returned to the list rather than never having
     left it — Revision 19 removed it when the site had no light ground, and
     the comment then said an rgba(14,12,11,…) hairline would be "a black rule
     on a black page". On --paper it is the only hairline that reads. */
  [14, 12, 11], // ink — rules, grid lines and fills on the light ground
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

  /*
   * THE ROTATION VISUAL'S SAMPLED GROUND — Revision 21 §2.
   *
   * `data/rotation-visual.ts` carries one hex that is not a palette decision:
   * the flat grey read out of `image2.jpg`, which the section extends to the
   * left of the image so there is no seam where the file ends. It is a pixel
   * from a photograph, and this audit's own rule is that photographs are the
   * one place colour outside the palette is allowed to come from.
   *
   * Exempting the FILE rather than the value, because the value changes
   * whenever the image does — and it is measured by
   * `scripts/visual/_measure-disc.mjs`, not chosen.
   */
  if (file.endsWith("rotation-visual.ts")) continue;

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

    // Hue-bearing utilities break the token rule. `black` and `white` break a
    // different one and are just as important: the palette has no #000 and no
    // #FFF, and Revision 19 makes that trap far easier to fall into than it was
    // — the ground is called --black, so `bg-black` LOOKS right and resolves to
    // Tailwind's #000000, not to --color-black. It is banned for that reason.
    //
    // Note this scans SOURCE, so `bg-black` here means the Tailwind default
    // utility. `bg-bg` is the ground; the token is never reached by that name.
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
