/**
 * NO STYLESHEET USES A CUSTOM PROPERTY NOBODY DEFINES — Revision 26 §3.4.
 *
 * A `var(--x)` with no definition and no fallback resolves to the property's
 * initial value: for `color` that is inherited text colour, for `background`
 * transparent. That is exactly how a field ends up painted in its ground's
 * colour without anything in the source looking wrong. This reads the BUILT
 * CSS — admin and public chunks alike — and fails on any such reference.
 *
 * A property counts as defined if any built chunk declares it, or if the app
 * sets it from code (style={{ "--x": … }} or style.setProperty("--x")), which
 * a stylesheet can't see.
 *
 *   node scripts/audit-undefined-vars.mjs      (after `next build`)
 */
import { readFileSync, globSync } from "node:fs";

const chunks = globSync(".next/static/chunks/**/*.css");
if (chunks.length === 0) {
  console.error("UNDEFINED-VAR AUDIT: no built CSS — run `next build` first.");
  process.exit(1);
}

const css = chunks.map((f) => [f, readFileSync(f, "utf8")]);
const defined = new Set();
for (const [, src] of css) {
  for (const m of src.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) defined.add(m[1]);
  for (const m of src.matchAll(/@property\s+(--[a-zA-Z0-9_-]+)/g)) defined.add(m[1]);
}
// Set from code at runtime.
for (const f of globSync("{app,components,lib}/**/*.{ts,tsx}")) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/["'`](--[a-zA-Z0-9_-]+)["'`]\s*[:,]/g)) defined.add(m[1]);
  for (const m of src.matchAll(/setProperty\(\s*["'`](--[a-zA-Z0-9_-]+)/g)) defined.add(m[1]);
}

const missing = new Map();
for (const [file, src] of css) {
  // var(--x) with NO fallback. var(--x, y) is a deliberate default and fine.
  for (const m of src.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)\s*\)/g)) {
    if (defined.has(m[1])) continue;
    if (!missing.has(m[1])) missing.set(m[1], new Set());
    missing.get(m[1]).add(file.replace(/^.*\//, ""));
  }
}

if (missing.size) {
  console.error(`FAIL  ${missing.size} custom propert${missing.size === 1 ? "y is" : "ies are"} used but never defined:`);
  for (const [name, files] of missing) console.error(`        ${name}  (${[...files].join(", ")})`);
  process.exit(1);
}
console.log(`  ok  every var() in ${chunks.length} built stylesheets resolves (${defined.size} properties defined)`);
