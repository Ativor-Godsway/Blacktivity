/**
 * Lighthouse ACCESSIBILITY on the four pages Revision 26 §5 names.
 *
 *   BASE=https://blacktivity.vercel.app node scripts/audit/lighthouse.mjs
 *
 * /admin/articles/[id] needs a session: with AUDIT_ADMIN_EMAIL /
 * AUDIT_ADMIN_PASSWORD it signs in and passes the cookie to Lighthouse,
 * otherwise that page is reported as skipped. Prints each score and every
 * failing audit, so a deduction is explained rather than just counted.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.env.BASE ?? "http://localhost:3111").replace(/\/$/, "");
const CHROME =
  process.env.CHROME_PATH ??
  (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "/usr/bin/google-chrome");
const dir = mkdtempSync(join(tmpdir(), "lh-"));

let cookie = null;
if (process.env.AUDIT_ADMIN_EMAIL && process.env.AUDIT_ADMIN_PASSWORD) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.AUDIT_ADMIN_EMAIL, password: process.env.AUDIT_ADMIN_PASSWORD }),
  });
  cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.startsWith("blacktivity_session="));
}

async function firstLink(path, prefix, prefer) {
  const html = await fetch(BASE + path, cookie ? { headers: { cookie } } : {}).then((r) => r.text());
  const links = [...html.matchAll(new RegExp(`href="(${prefix}[^"#?]+)"`, "g"))].map((m) => m[1]);
  return links.find((l) => prefer && l.includes(prefer)) ?? links[0];
}

const articleSlug = await firstLink("/articles", "/articles/", "makola");
let adminArticle = null;
if (cookie) {
  const body = await fetch(`${BASE}/api/admin/articles`, { headers: { cookie } }).then((r) => r.json());
  const a = body.articles.find((x) => /makola/i.test(x.title)) ?? body.articles[0];
  adminArticle = a && `/admin/articles/${a.id}`;
}

const pages = [
  { path: "/admin/login" },
  { path: adminArticle, auth: true, label: "/admin/articles/[id]" },
  { path: "/" },
  { path: articleSlug, label: "/articles/[slug]" },
];

let worst = 100;
for (const p of pages) {
  const label = p.label ?? p.path;
  if (!p.path) {
    console.log(`skip  ${label.padEnd(24)} (needs AUDIT_ADMIN_EMAIL / AUDIT_ADMIN_PASSWORD)`);
    continue;
  }
  const out = join(dir, label.replace(/\W+/g, "_") + ".json");
  const args = [
    "lighthouse",
    BASE + p.path,
    "--only-categories=accessibility",
    "--output=json",
    `--output-path=${out}`,
    "--quiet",
    `--chrome-flags=--headless=new --no-sandbox`,
  ];
  if (p.auth) args.push(`--extra-headers=${JSON.stringify({ Cookie: cookie })}`);
  execFileSync("npx", args, { env: { ...process.env, CHROME_PATH: CHROME }, stdio: ["ignore", "ignore", "inherit"] });
  const lhr = JSON.parse(readFileSync(out, "utf8"));
  const score = Math.round(lhr.categories.accessibility.score * 100);
  worst = Math.min(worst, score);
  console.log(`${String(score).padStart(3)}   ${label}`);
  for (const ref of lhr.categories.accessibility.auditRefs) {
    const a = lhr.audits[ref.id];
    if (ref.weight > 0 && a.score !== null && a.score < 1) {
      console.log(`        − ${a.id}: ${a.title}`);
      for (const item of (a.details?.items ?? []).slice(0, 5)) {
        console.log(`            ${item.node?.selector ?? item.node?.snippet ?? ""}`);
      }
    }
  }
}
process.exit(worst === 100 ? 0 : 1);
