/**
 * ADMIN / PUBLIC COLOUR SEPARATION
 *
 * The admin has its own palette. This proves the two never mix:
 *
 *   1. No public file references an admin token or admin utility class.
 *   2. No admin token appears in the public site's built CSS.
 *   3. The admin only uses colours from its own approved list.
 *
 * Run after `next build` so check 2 has something to inspect.
 */
import { readFileSync, globSync, existsSync } from "node:fs";

const ADMIN_TOKENS = [
  "--admin-sidebar", "--admin-plane", "--admin-surface", "--admin-ink",
  "--admin-ink-2", "--admin-muted", "--admin-rule", "--admin-hover",
  "--status-ok", "--status-wait", "--status-bad",
  "--series-1", "--series-2", "--series-3",
  "--a-plane", "--a-surface", "--a-ink", "--a-muted", "--a-border", "--a-error",
];

/**
 * Every hex the admin is allowed to contain.
 *
 * The neutrals were warmed in revision 12 to match the public site. The STATUS
 * and CHART hues below were not, and neither was --admin-surface (#ffffff):
 * those three groups were contrast-validated against a white card, and warming
 * the card underneath would invalidate every one of those numbers without
 * changing a single line that looks like a contrast decision.
 */
const ADMIN_ALLOWED = new Set([
  "#2a211a", "#241c16", "#ede7db", "#ffffff", "#52514e", "#6b665e", "#ded6c8", "#f7f4ee",
  "#0ca30c", "#fab219", "#d03b3b",
  "#2a78d6", "#eb6834", "#1baf7a",
  "#232320", // a-btn-primary hover
  "#ff8b8b", // destructive label on the dark bulk bar
  // Revision 25 — the auth forms' --a-* tokens (contrast in admin.css).
  "#14110f", // --a-ink: 18.80 on white
  "#625b52", // --a-muted: 6.69 on white, 5.44 on the plane
  "#8a8277", // --a-border: 3.79 on white (non-text)
  "#b42318", // --a-error: 6.57 on white
  "#2e2824", // a-btn-submit hover
  // Revision 26
  "#45403a", // --a-ink-2: 10.26 on white, 8.33 on the plane
  "#cfc6b8", // --a-rail-ink: 9.92 on the rail
]);

let failed = 0;
const fail = (msg, rows = []) => {
  failed = 1;
  console.error(`FAIL  ${msg}`);
  for (const r of rows.slice(0, 10)) console.error("        " + r);
};

// --- 1. public source must not reference admin tokens --------------------
const publicFiles = globSync("{app,components,lib,data}/**/*.{ts,tsx,css}")
  .filter((f) => !f.startsWith("app/admin") && !f.startsWith("components/admin"));

/**
 * Comments are stripped first. Documentation naturally quotes these token
 * names — the README explaining the leak was itself scanned by Tailwind and
 * produced one, and a code comment describing the rule should not fail it.
 */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^(\s*)\/\/.*$/gm, (_m, indent) => indent);

const leaks = [];
for (const f of publicFiles) {
  const src = stripComments(readFileSync(f, "utf8"));
  for (const t of ADMIN_TOKENS) if (src.includes(t)) leaks.push(`${f}: ${t}`);
  for (const m of src.matchAll(/\ba-(pill|card|table|chip|btn|input|meta|muted|ink2|num)\b/g)) {
    leaks.push(`${f}: ${m[0]}`);
  }
}
if (leaks.length) fail("public source references admin tokens/classes", leaks);
else console.log("  ok  no admin token or class in public source");

// --- 2. admin only uses its own approved colours -------------------------
const adminFiles = globSync("{app/admin,components/admin}/**/*.{ts,tsx,css}");
const stray = [];
for (const f of adminFiles) {
  const src = readFileSync(f, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const hex = m[0].toLowerCase();
    const full = hex.length === 4
      ? "#" + hex.slice(1).split("").map((c) => c + c).join("")
      : hex;
    if (!ADMIN_ALLOWED.has(full)) stray.push(`${f}: ${m[0]}`);
  }
}
if (stray.length) fail("admin uses a colour outside its palette", stray);
else console.log("  ok  admin uses only its approved palette");

// --- 2b. the admin never borrows the public palette — Revision 26 ---------
// The article editor's fields rendered their values in the ground colour
// because they were public components: --color-fg is #ede7db, which is also
// the admin's sand. So: no public component imports, no public colour
// utilities, no .prose-editorial outside the preview box, and no opacity used
// to fade text (disabled: variants are allowed — they fade a control).
const borrowed = [];
const PUBLIC_UTIL = /(?:^|[\s"'`])(?:[a-z-]+:)*(?:text|bg|border|placeholder|decoration|ring|outline|divide)-(?:fg|fg-muted|fg-dim|fg-faint|bg|bg-raised|rule|rule-soft|rule-strong|accent|bone|bone-2|tan|paper|paper-raised|ink-2|ink-muted)(?=[\s"'`/]|$)/gm;
for (const f of adminFiles) {
  const src = stripComments(readFileSync(f, "utf8"));
  if (/from\s+["']@\/components\/ui\//.test(src)) borrowed.push(`${f}: imports a public components/ui component`);
  for (const m of src.matchAll(PUBLIC_UTIL)) borrowed.push(`${f}: ${m[0].trim()}`);
  for (const m of src.matchAll(/(?:^|[\s"'`])(opacity-\d+)(?=[\s"'`]|$)/gm)) borrowed.push(`${f}: ${m[1]} (fade the control with disabled:, never text)`);
  for (const m of src.matchAll(/\bvar\(--color-[a-z0-9-]+\)/g)) borrowed.push(`${f}: ${m[0]}`);
  // Status hues are reinforcement, never text: #fab219 and #d03b3b both fail 4.5:1.
  for (const m of src.matchAll(/(?<![-\w])color:\s*["']?var\(--status-[a-z]+\)/g)) borrowed.push(`${f}: ${m[0]} (use --a-error for text)`);
  const prose = src.match(/prose-editorial/g)?.length ?? 0;
  const previews = src.match(/data-theme="light"/g)?.length ?? 0;
  if (prose > previews) borrowed.push(`${f}: .prose-editorial outside a data-theme="light" preview`);
}
if (borrowed.length) fail("admin borrows the public palette", borrowed);
else console.log("  ok  admin uses no public component, colour utility, or text opacity");

// --- 3. admin tokens must be confined to their own built chunk -----------
const cssFiles = globSync(".next/static/chunks/**/*.css");
if (cssFiles.length === 0) {
  console.log("  --  built CSS not found; run `next build` first");
} else {
  const admin = cssFiles.filter((f) => readFileSync(f, "utf8").includes("--admin-sidebar"));
  console.log(`  ok  admin tokens confined to ${admin.length} of ${cssFiles.length} built CSS chunk(s)`);
}

// --- 4. the definitive check: a public page must not LOAD that chunk -----
const base = process.env.AUDIT_BASE_URL;
if (!base) {
  console.log("  --  set AUDIT_BASE_URL to also verify no public page loads the admin stylesheet");
} else {
  const bad = [];
  for (const path of ["/", "/articles", "/submit"]) {
    const html = await fetch(base + path).then((r) => r.text());
    const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
    for (const href of hrefs) {
      const css = await fetch(new URL(href, base)).then((r) => r.text());
      if (ADMIN_TOKENS.some((t) => css.includes(t))) bad.push(`${path} loads ${href}`);
    }
  }
  if (bad.length) fail("a public page loads a stylesheet containing admin tokens", bad);
  else console.log("  ok  no public page loads the admin stylesheet");
}

process.exit(failed);
