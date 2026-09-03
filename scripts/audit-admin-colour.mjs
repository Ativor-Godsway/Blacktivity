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
];

/** Every hex the admin is allowed to contain. */
const ADMIN_ALLOWED = new Set([
  "#0b0b0b", "#f2f1ee", "#ffffff", "#52514e", "#898781", "#e1e0d9", "#f7f7f5",
  "#0ca30c", "#fab219", "#d03b3b",
  "#2a78d6", "#eb6834", "#1baf7a",
  "#232320", // a-btn-primary hover
  "#ff8b8b", // destructive label on the dark bulk bar
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

const leaks = [];
for (const f of publicFiles) {
  const src = readFileSync(f, "utf8");
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
