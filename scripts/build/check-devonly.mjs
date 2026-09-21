/**
 * THE DEV-ONLY GUARD MUST NOT SHIP — Revision 23 §2.
 *
 * `StylesheetGuard` exists to shout at a developer. Its message, its banner and
 * its red background have no business in a production bundle, and "it is behind
 * a NODE_ENV check" is a claim about what a bundler does, not a fact about what
 * shipped. This greps the built output and settles it.
 *
 *   node scripts/build/check-devonly.mjs
 */
import { readFileSync, globSync } from "node:fs";

/** Strings that exist only inside the development-only branch. */
const FORBIDDEN = [
  "STALE STYLESHEET",
  "reload with cache disabled",
  "--stylesheet-build at all",
];

/*
 * THE PRODUCTION OUTPUT ONLY. `.next/dev/` is Next 16's development build, and
 * a running dev server leaves it behind — it is SUPPOSED to contain the guard,
 * so scanning it reports a failure that means the opposite of what it says.
 * The first version of this check did exactly that.
 */
const files = globSync(".next/{static,server}/**/*.{js,css}", {
  exclude: (p) => p.includes("/cache/"),
});

if (files.length === 0) {
  console.error("DEV-ONLY CHECK: no built output found — run `next build` first.");
  process.exit(1);
}

const hits = [];
for (const f of files) {
  let src;
  try { src = readFileSync(f, "utf8"); } catch { continue; }
  for (const needle of FORBIDDEN) {
    if (src.includes(needle)) hits.push(`${f}: ${needle}`);
  }
}

if (hits.length) {
  console.error(`DEV-ONLY CHECK FAILED — ${hits.length} occurrence(s) in the build:\n`);
  for (const h of hits.slice(0, 20)) console.error("  " + h);
  console.error("\nThe StylesheetGuard's body must be eliminated in production.");
  process.exit(1);
}

console.log(
  `Dev-only check passed — ${files.length} built files, none contains the stylesheet guard.`,
);
