/**
 * CONTRAST AUDIT — reads the BUILT stylesheet, not the source.
 *
 * The palette's contrast table is only true if the values that reach the
 * browser are the ones that were measured. A token can be overridden later in
 * the cascade, renamed, or resolved through a chain that ends somewhere else,
 * and every one of those ships a failing pairing while the source file still
 * shows the correct hex. So this parses the emitted CSS, resolves each token to
 * a literal, and recomputes the ratios from scratch.
 *
 * It also asserts THE LOAD-BEARING FACT about the Revision 19 palette, which
 * is the one a well-meaning edit would break:
 *
 *   --muted must clear AA on --black-raised. It is the LOWEST value that does,
 *   and mono labels sit on raised cards all over the site, so moving it darker
 *   fails every card at once. Revision 12's mirror-image of this rule was that
 *   --muted must not go LIGHTER; the direction flipped with the ground.
 *
 * REVISION 19 DELETED THE --muted-dark ASSERTION and the three banned pairings
 * with it. Those existed because the site had two grounds: --muted was 2.64 on
 * espresso and 4.04 on sand-deep, so a second label tone and a set of explicit
 * bans were the only thing standing between a tinted row and a failing label.
 * There is one ground and one raised step now, --muted clears AA on both, and
 * asserting bans against tokens that no longer exist would fail on the missing
 * token rather than on anything real.
 *
 *   node scripts/audit-contrast.mjs
 */
import { readFileSync, globSync } from "node:fs";

const AA = 4.5;

const files = globSync(".next/static/chunks/*.css");
if (files.length === 0) {
  console.error("CONTRAST AUDIT: no built stylesheet found — run `next build` first.");
  process.exit(1);
}
const css = files.map((f) => readFileSync(f, "utf8")).join("\n");

/** Last definition wins, which is what the cascade does for a plain :root. */
function token(name) {
  const matches = [...css.matchAll(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`, "g"))];
  return matches.length ? matches[matches.length - 1][1].toLowerCase() : null;
}

function luminance(hex) {
  const h = hex.length === 4 ? "#" + [...hex.slice(1)].map((c) => c + c).join("") : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * THE MEASURED TABLE — Revision 19 §1. Every number here is asserted, not
 * documented, and the list is EXHAUSTIVE: these eight are the only pairings the
 * palette forms, because there are only two grounds and four inks.
 */
const PAIRINGS = [
  ["--color-bone", "--color-black", 15.85, AA],
  ["--color-bone-2", "--color-black", 9.01, AA],
  ["--color-muted", "--color-black", 5.32, AA],
  ["--color-tan", "--color-black", 9.98, AA],
  ["--color-bone", "--color-black-raised", 14.49, AA],
  ["--color-bone-2", "--color-black-raised", 8.24, AA],
  ["--color-muted", "--color-black-raised", 4.87, AA],
  ["--color-tan", "--color-black-raised", 9.12, AA],

  /* --- THE GRADIENT RULE, which survives Revision 19 unchanged -------------
     Contrast on a gradient is measured at its LIGHTEST point, never its
     average, so --black-lift is the ground every text colour on the Rotation
     poster is checked against. Checking a midpoint passes a label that is
     unreadable across the top third of the section.

     --muted is 4.62 there: it clears AA, but only just, and over a gradient
     rather than a flat fill — which is why `.on-gradient` re-points
     --color-fg-dim to --tan (8.65) instead. Both are asserted: the first so
     nobody "fixes" the re-pointing by deleting it, the second because it is
     what actually ships. */
  ["--color-bone", "--color-black-lift", 13.74, AA],
  ["--color-bone-2", "--color-black-lift", 7.81, AA],
  ["--color-muted", "--color-black-lift", 4.62, AA],
  ["--color-tan", "--color-black-lift", 8.65, AA],

  /* --- REVISION 20: THE LIGHT GROUND -------------------------------------
     Six pairings, the mirror of the dark table. --ink-muted is the binding one,
     exactly as --muted is on black: 4.87 on --paper-raised, because mono labels
     sit on raised cards on both grounds. It must not drift lighter. */
  ["--color-ink", "--color-paper", 17.77, AA],
  ["--color-ink-2", "--color-paper", 10.55, AA],
  ["--color-ink-muted", "--color-paper", 5.37, AA],
  ["--color-ink", "--color-paper-raised", 16.11, AA],
  ["--color-ink-2", "--color-paper-raised", 9.57, AA],
  ["--color-ink-muted", "--color-paper-raised", 4.87, AA],
];

let failed = 0;
const fail = (m) => { console.error("  FAIL " + m); failed++; };

console.log(`Contrast audit — ${files.length} built stylesheet(s)\n`);

for (const [fg, bg, claimed, floor] of PAIRINGS) {
  const f = token(fg), b = token(bg);
  if (!f || !b) { fail(`${fg} on ${bg}: token missing from the built CSS`); continue; }
  const r = ratio(f, b);
  const label = `${fg.replace("--color-", "")} on ${bg.replace("--color-", "")}`;
  if (Math.abs(r - claimed) > 0.05) fail(`${label}: ${r.toFixed(2)}, but the palette documents ${claimed}`);
  else if (r < floor) fail(`${label}: ${r.toFixed(2)}, under the ${floor} bar`);
  else console.log(`  ok   ${label.padEnd(28)} ${r.toFixed(2)}  (${f} on ${b})`);
}

/* --- the load-bearing fact ----------------------------------------------
   --muted on --black-raised is the binding measurement in the whole palette.
   It is asserted in the table above as 4.87, and again here as a floor with its
   own message, because the table's failure reads "the palette documents 4.87"
   and this one reads what actually breaks. */

const muted = token("--color-muted");
const raised = token("--color-black-raised");

if (muted && raised && ratio(muted, raised) < AA) {
  fail(`--muted is ${ratio(muted, raised).toFixed(2)} on black-raised — every card's labels fail`);
}

/* --- --ink-muted is the light ground's load-bearing value ----------------
   The mirror of the --muted assertion above, and it matters for the same
   reason: mono labels sit on raised cards on both grounds, so the raised
   figure is the binding one on each. */
const inkMuted = token("--color-ink-muted");
const paperRaised = token("--color-paper-raised");

if (inkMuted && paperRaised && ratio(inkMuted, paperRaised) < AA) {
  fail(`--ink-muted is ${ratio(inkMuted, paperRaised).toFixed(2)} on paper-raised — every light card's labels fail`);
}

/* --- --ink IS --black, and that identity is load-bearing -----------------
   The type on a light section and the ground of a dark one are one colour,
   which is what makes the alternation read as one system rather than two
   palettes. If they ever drift apart it will be by someone "tuning" one of
   them, and the result will look almost right, which is the worst outcome. */
const ink = token("--color-ink");
const blackTok = token("--color-black");
if (ink && blackTok && ink !== blackTok) {
  fail(`--ink is ${ink} and --black is ${blackTok}; Revision 20 requires them to be the same value`);
} else if (ink) {
  console.log(`  ok   ${"--ink === --black".padEnd(28)} ${ink}`);
}

/* --- tan is NOT type on the light ground, and never becomes it -----------
   The mirror of the rule below. On black --tan is 9.98 and is type; on --paper
   it is 1.78, which is decorative-only, and §2.1 says so explicitly. Asserted
   as a BAN so that "it looked fine" can never quietly ship a tan label on a
   white section — the same shape of mistake that produced --muted-dark in
   Revision 12. */
const tanTok = token("--color-tan");
const paper = token("--color-paper");
if (tanTok && paper) {
  const r = ratio(tanTok, paper);
  if (r >= 3) fail(`--tan is ${r.toFixed(2)} on paper — re-examine §2.1's rule that it is never type on a light ground`);
  else console.log(`  ok   ${"banned: tan on paper".padEnd(28)} ${r.toFixed(2)}  decorative only, never type`);
}

/* --- tan is type-safe on black, and that is a CHANGE worth asserting ------
   Revision 12 treated --tan as decorative-only and this audit enforced that it
   stayed UNDER the large-text bar on the light ground. On black it is 9.98 and
   is used as type — pills, active nav, arrows — so the assertion inverts: it
   must now CLEAR AA, and a drift that made it decorative again would silently
   fail every category pill and every active nav item on the site. */
const tan = token("--color-tan");
const black = token("--color-black");
if (tan && black) {
  const r = ratio(tan, black);
  if (r < AA) fail(`--tan is ${r.toFixed(2)} on black; Revision 19 uses it as TYPE and needs AA`);
  else console.log(`  ok   ${"tan on black (as type)".padEnd(28)} ${r.toFixed(2)}`);
}

/* --- no palette or semantic token resolves to pure black or white --------
   Named explicitly rather than scanned as `--color-*`: Tailwind emits
   --color-black and --color-white as theme defaults on every build whether or
   not a single rule uses them, so a wildcard scan reports the framework and
   tells you nothing about the palette. Whether anything USES those two is a
   source question, and `audit:colour` answers it for the public site. */
const OWNED = [
  "--color-black", "--color-black-raised", "--color-bone", "--color-bone-2",
  "--color-muted", "--color-tan",
  "--color-black-lift", "--color-black-deep",
  "--color-paper", "--color-paper-raised", "--color-ink", "--color-ink-2",
  "--color-ink-muted",
  "--color-fg", "--color-fg-muted", "--color-fg-dim", "--color-fg-faint",
  "--color-bg", "--color-bg-raised",
];
const BANNED = new Set(["#000000", "#ffffff", "#000", "#fff"]);
for (const name of OWNED) {
  for (const m of css.matchAll(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`, "g"))) {
    if (BANNED.has(m[1].toLowerCase())) fail(`${name} resolves to ${m[1]} — the palette has no pure black or white`);
  }
}

console.log(failed === 0
  ? `\n  all ${PAIRINGS.length} measured pairings hold in the built stylesheet`
  : `\n  ${failed} contrast problem(s)`);
process.exit(failed === 0 ? 0 : 1);
