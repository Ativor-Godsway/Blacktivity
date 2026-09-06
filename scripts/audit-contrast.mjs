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
 * It also asserts the two LOAD-BEARING facts about the palette, which are the
 * ones a well-meaning edit would break:
 *
 *   - --muted must clear AA on BOTH light grounds. It is the lightest tone that
 *     does, and mono labels sit on cards all over the site, so moving it
 *     lighter fails every card at once.
 *   - --muted must NOT be used on espresso, where it is 2.64. That is why
 *     --muted-dark exists and why .on-espresso re-points --color-fg-dim.
 *
 *   node scripts/audit-contrast.mjs
 */
import { readFileSync, globSync } from "node:fs";

const AA = 4.5;
const AA_LARGE = 3;

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

/** The measured table. Every number here is asserted, not documented. */
const PAIRINGS = [
  ["--color-ink", "--color-sand", 12.81, AA],
  ["--color-ink-2", "--color-sand", 6.95, AA],
  ["--color-muted", "--color-sand", 5.16, AA],
  ["--color-ink", "--color-sand-raised", 11.27, AA],
  ["--color-muted", "--color-sand-raised", 4.53, AA],
  ["--color-sand", "--color-espresso", 13.61, AA],
  ["--color-muted-dark", "--color-espresso", 5.60, AA],
  ["--color-tan", "--color-espresso", 8.57, AA],

  /* --- REVISION 14 -------------------------------------------------------
     Every pairing the new tokens are actually allowed to form. The three
     combinations that FAIL are asserted separately below, as bans rather than
     as pairings, because a passing number is not what needs protecting there. */
  ["--color-ink", "--color-sand-deep", 10.03, AA],
  ["--color-ink-2", "--color-sand-deep", 5.44, AA],
  ["--color-ink", "--color-tan", 8.07, AA],
  ["--color-espresso", "--color-tan", 8.57, AA],
  ["--color-sand", "--color-cocoa", 10.64, AA],
  ["--color-tan", "--color-cocoa", 6.70, AA],
  ["--color-sand", "--color-espresso-deep", 15.32, AA],
  ["--color-tan", "--color-espresso-deep", 9.65, AA],
  ["--color-muted-dark", "--color-espresso-deep", 6.30, AA],
];

/**
 * THE THREE BANNED COMBINATIONS, and THE GRADIENT RULE.
 *
 * Each of these is a pairing someone would reasonably reach for — the same
 * mono-label-on-a-tinted-ground shape that produced --muted-dark in Revision
 * 12 — and each lands between 4.04 and 4.38: large-text-only, while mono
 * labels are 11-12px. They are asserted as bans so that "it looked fine" can
 * never quietly ship one.
 *
 * The gradient entry is the important one. Contrast on a gradient is measured
 * at its LIGHTEST point, never its average, so --cocoa is the ground every
 * text colour on the Rotation gradient is checked against. Checking a midpoint
 * passes a label that is unreadable across the top third of the section.
 */
const BANNED_PAIRINGS = [
  ["--color-muted", "--color-sand-deep", "mono labels on sand-deep must use --ink-2"],
  ["--color-ink-2", "--color-tan", "the tan strip carries --ink or --espresso only"],
  ["--color-muted-dark", "--color-cocoa", "labels on the gradient must use --tan or --sand"],
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

/* --- Revision 14: the banned combinations must stay under the bar -------- */

for (const [fg, bg, why] of BANNED_PAIRINGS) {
  const f = token(fg), b = token(bg);
  if (!f || !b) { fail(`${fg} on ${bg}: token missing from the built CSS`); continue; }
  const r = ratio(f, b);
  const label = `${fg.replace("--color-", "")} on ${bg.replace("--color-", "")}`;
  if (r >= AA) {
    // Not a pass. If this became true the restriction would have lost its
    // reason to exist and someone would rightly delete it — so surface it and
    // make the call deliberately, exactly as with --muted on espresso.
    fail(`${label} now clears AA (${r.toFixed(2)}) — re-examine the rule: ${why}`);
  } else {
    console.log(`  ok   ${("banned: " + label).padEnd(28)} ${r.toFixed(2)}  under AA — ${why}`);
  }
}

/* --- the two load-bearing facts ----------------------------------------- */

const muted = token("--color-muted");
const espresso = token("--color-espresso");
const raised = token("--color-sand-raised");

if (muted && raised && ratio(muted, raised) < AA) {
  fail(`--muted is ${ratio(muted, raised).toFixed(2)} on sand-raised — every card's labels fail`);
}

if (muted && espresso && ratio(muted, espresso) >= AA) {
  // Not a pass: if this ever became true, --muted-dark and the .on-espresso
  // indirection would have quietly lost their reason to exist, and someone
  // would rightly delete them. Flag it so the decision is made deliberately.
  fail(`--muted now clears AA on espresso (${ratio(muted, espresso).toFixed(2)}) — re-examine whether --muted-dark is still needed`);
}

/* --- tan is decorative on light grounds ---------------------------------- */
const tan = token("--color-tan");
const sand = token("--color-sand");
if (tan && sand) {
  const r = ratio(tan, sand);
  if (r >= AA_LARGE) fail(`--tan is ${r.toFixed(2)} on sand; the palette treats it as decorative-only and the docs say 1.59`);
  else console.log(`  ok   ${"tan on sand".padEnd(28)} ${r.toFixed(2)}  (decorative only, never type)`);
}

/* --- no palette or semantic token resolves to pure black or white --------
   Named explicitly rather than scanned as `--color-*`: Tailwind emits
   --color-black and --color-white as theme defaults on every build whether or
   not a single rule uses them, so a wildcard scan reports the framework and
   tells you nothing about the palette. Whether anything USES those two is a
   source question, and `audit:colour` answers it for the public site. */
const OWNED = [
  "--color-sand", "--color-sand-raised", "--color-tan", "--color-ink",
  "--color-ink-2", "--color-muted", "--color-muted-dark", "--color-espresso",
  "--color-fg", "--color-fg-muted", "--color-fg-dim", "--color-fg-faint",
  "--color-bg", "--color-bg-raised",
  "--color-sand-deep", "--color-cocoa", "--color-espresso-deep",
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
