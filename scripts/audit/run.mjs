/**
 * READABLE TEXT ON EVERY SCREEN — Revision 26 §3.
 *
 *   BASE=http://localhost:3111 AUDIT_ADMIN_EMAIL=… AUDIT_ADMIN_PASSWORD=… npm run audit:contrast
 *   BASE=https://blacktivity.vercel.app npm run audit:contrast
 *
 * For every route in app/ (scripts/audit/routes.mjs), in every state
 * (scripts/audit/states.mjs), at 1440 and 390:
 *
 *   1. axe-core — fails on any color-contrast violation.
 *   2. The computed check (measure.mjs) — every visible text node and form
 *      value against what is actually painted beneath it, scrolled through
 *      the whole page. 4.5:1, or 3:1 for 24px+ (18.66px+ bold).
 *   3. Typed text — states named "typed" fill every field first, and step 2
 *      then measures the values. Placeholders are measured when a field is empty.
 *   4. Field boxes — every control has a visible edge or ground.
 *
 * Writes audit/results.json, a screenshot per state into audit/shots/, and
 * audit/contact-sheet.html. Exit code is non-zero on any failure.
 *
 * Without AUDIT_ADMIN_EMAIL / AUDIT_ADMIN_PASSWORD the admin routes behind the
 * sign-in are reported as SKIPPED (not passed). States marked localOnly — the
 * ones that write data — only run when BASE is localhost.
 */
import { chromium } from "playwright-core";
import { AxeBuilder } from "@axe-core/playwright";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { discoverRoutes } from "./routes.mjs";
import { STATES, EXTRA } from "./states.mjs";
import { measureViewport, measureFieldBoxes } from "./measure.mjs";
import { writeContactSheet } from "./contact-sheet.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3111").replace(/\/$/, "");
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
const OUT = process.env.AUDIT_OUT ?? "audit";
const PHASE = process.env.AUDIT_PHASE ?? "full"; // "full" | "empty"
const ONLY = process.env.AUDIT_ONLY ? new RegExp(process.env.AUDIT_ONLY) : null;
const WIDTHS = (process.env.AUDIT_WIDTHS ?? "1440,390").split(",").map(Number);
const EMAIL = process.env.AUDIT_ADMIN_EMAIL;
const PASSWORD = process.env.AUDIT_ADMIN_PASSWORD;
const CHROME =
  process.env.CHROME_PATH ??
  (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "/usr/bin/google-chrome");

mkdirSync(`${OUT}/shots`, { recursive: true });

const slug = (s) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "root";

/* ---------------------------------------------------------------- setup */

const browser = await chromium.launch({ executablePath: CHROME, args: ["--hide-scrollbars"] });

async function newContext(width, auth) {
  const mobile = width < 768;
  const context = await browser.newContext({
    baseURL: BASE,
    viewport: { width, height: mobile ? 844 : 900 },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: "reduce",
  });
  if (auth) {
    const res = await context.request.post("/api/auth/login", { data: { email: EMAIL, password: PASSWORD } });
    if (!res.ok()) throw new Error(`audit sign-in failed (${res.status()}) — check AUDIT_ADMIN_EMAIL / AUDIT_ADMIN_PASSWORD`);
  }
  return context;
}

/** Resolve [param] routes to a real URL by reading the matching list page. */
async function resolveDynamic(context) {
  const page = await context.newPage();
  const firstLink = async (listPath, prefix, prefer) => {
    await page.goto(listPath, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    return page.evaluate(
      ({ prefix, prefer }) => {
        const links = [...document.querySelectorAll(`a[href^="${prefix}"]`)]
          .map((a) => ({ href: a.getAttribute("href"), text: (a.closest("tr,li,article,div")?.textContent || a.textContent || "") }))
          .filter((l) => !/\/(new|archive|tracks)$/.test(l.href) && l.href !== prefix && l.href.split("/").length === prefix.split("/").length);
        const hit = prefer && links.find((l) => new RegExp(prefer, "i").test(l.text) || new RegExp(prefer, "i").test(l.href));
        return (hit ?? links[0])?.href ?? null;
      },
      { prefix, prefer },
    );
  };
  const map = {
    "/articles/[slug]": await firstLink("/articles", "/articles/", "makola"),
    "/events/[slug]": await firstLink("/events", "/events/"),
    "/rotation/[slug]": await firstLink("/rotation/archive", "/rotation/"),
  };
  await page.close();
  return map;
}

/** Admin [id] routes from the admin's own read APIs — the list pages only link from a detail panel. */
async function resolveAdminDynamic(context) {
  const get = async (path, key) => {
    const res = await context.request.get(path);
    if (!res.ok()) return [];
    const body = await res.json();
    return body[key] ?? [];
  };
  const articles = await get("/api/admin/articles", "articles");
  const makola = articles.find((a) => /makola/i.test(a.title)) ?? articles[0];
  const events = await get("/api/admin/events", "events");
  const volumes = await get("/api/admin/rotation", "volumes");
  const id = (d) => (d ? String(d.id ?? d._id) : null);
  return {
    "/admin/articles/[id]": makola ? `/admin/articles/${id(makola)}` : null,
    "/admin/events/[id]": events[0] ? `/admin/events/${id(events[0])}` : null,
    "/admin/rotation/[id]": volumes[0] ? `/admin/rotation/${id(volumes[0])}` : null,
  };
}

/* --------------------------------------------------------------- checks */

async function sweep(page) {
  // Walk the whole page a viewport at a time; the measurer only reads what is
  // inside the viewport, because elementsFromPoint only works there.
  await page.evaluate(() => document.querySelectorAll("[data-audit-seen]").forEach((e) => e.removeAttribute("data-audit-seen")));
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  const rows = [];
  const skipped = {};
  const stepPx = Math.max(200, Math.floor(vh * 0.8));
  for (let y = 0, step = 0; y < height && step < 60; y += stepPx, step++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    await page.waitForTimeout(250);
    const res = await page.evaluate(measureViewport, { step });
    rows.push(...res.rows);
    for (const [k, v] of Object.entries(res.skipped)) skipped[k] = (skipped[k] ?? 0) + v;
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

  // Fixed elements (the header) are measured at every step; keep the worst.
  const worst = new Map();
  for (const r of rows) {
    const key = `${r.kind}|${r.selector}|${r.text}`;
    const prev = worst.get(key);
    if (!prev || (r.ratio ?? 99) < (prev.ratio ?? 99)) worst.set(key, r);
  }
  const all = [...worst.values()];
  return {
    measured: all.filter((r) => !r.overImage).length,
    fails: all.filter((r) => !r.overImage && r.ratio < r.required),
    overImage: all.filter((r) => r.overImage),
    skipped,
  };
}

async function axeContrast(page) {
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const pick = (v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 12).map((n) => ({ target: n.target.join(" "), summary: (n.failureSummary ?? "").split("\n").slice(0, 3).join(" ") })),
  });
  return {
    contrast: res.violations.filter((v) => v.id === "color-contrast").map(pick),
    other: res.violations.filter((v) => v.id !== "color-contrast").map(pick),
  };
}

/* ------------------------------------------------------------------ run */

const results = [];
const routes = discoverRoutes();
const isAdmin = (r) => r.startsWith("/admin");
const loginEverywhere = new Set();

for (const route of routes) {
  if (!STATES[route]) {
    results.push({ group: isAdmin(route) ? "Admin" : "Public", route, state: "—", width: 0, pass: false, error: "No audit states defined for this route — add it to scripts/audit/states.mjs" });
  }
}

// The widths run side by side — each in its own browser context.
//
// States marked `last` (changing the password) run after both widths finish:
// a password change signs out every other session — Revision 25 — so running
// one mid-sweep would sign out the other width's context.
async function auditWidth(width, lastOnly = false) {
  const anon = await newContext(width, false);
  const authed = EMAIL && PASSWORD ? await newContext(width, true) : null;
  const dyn = PHASE === "full" && !lastOnly ? await resolveDynamic(anon) : {};
  const adminDyn = authed && PHASE === "full" && !lastOnly ? await resolveAdminDynamic(authed) : {};

  const jobs = [];
  for (const route of routes) for (const s of STATES[route] ?? []) jobs.push({ route, s });
  for (const x of EXTRA) for (const s of x.states) jobs.push({ route: x.route, s: { ...s, path: x.path } });

  for (const { route, s } of jobs) {
    if ((s.phase ?? "full") !== PHASE) continue;
    if (Boolean(s.last) !== lastOnly) continue;
    if (s.widths && !s.widths.includes(width)) continue;
    if (ONLY && !ONLY.test(`${route} ${s.name}`)) continue;
    const admin = isAdmin(route);
    const needsAuth = admin && s.auth !== false;
    const base = { group: admin ? "Admin" : "Public", route, state: s.name, width };

    if (s.localOnly && !LOCAL) {
      results.push({ ...base, skipped: "writes data — runs against localhost only" });
      continue;
    }
    if (needsAuth && !authed) {
      results.push({ ...base, skipped: "no AUDIT_ADMIN_EMAIL / AUDIT_ADMIN_PASSWORD" });
      continue;
    }
    if (s.once) {
      if (loginEverywhere.has(route + s.name)) continue;
      loginEverywhere.add(route + s.name);
    }

    const path = s.path ?? (route.includes("[") ? (dyn[route] ?? adminDyn[route]) : route);
    if (!path) {
      results.push({ ...base, pass: false, error: "Could not resolve a real URL for this dynamic route" });
      continue;
    }

    const page = await (needsAuth ? authed : anon).newPage();
    const row = { ...base, url: path };
    try {
      // "load", not "networkidle": the public pages keep a beacon or a marquee
      // image request open and never go idle on a phone viewport.
      await page.goto(path, { waitUntil: "load", timeout: 60000 });
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(700);
      if (s.run) await s.run(page, { password: PASSWORD, email: EMAIL });
      await page.waitForTimeout(300);

      const axe = await axeContrast(page);
      const sw = await sweep(page);
      const boxes = await page.evaluate(measureFieldBoxes);

      const file = `${slug(base.group)}-${slug(route)}-${slug(s.name)}-${width}.jpg`;
      await page.screenshot({ path: `${OUT}/shots/${file}`, fullPage: true, type: "jpeg", quality: 55 });

      Object.assign(row, {
        screenshot: `shots/${file}`,
        axe: axe.contrast,
        axeOther: axe.other,
        measured: sw.measured,
        contrastFails: sw.fails,
        overImage: sw.overImage,
        skippedNodes: sw.skipped,
        invisibleFields: boxes.filter((b) => !b.visible),
      });
      row.pass = axe.contrast.length === 0 && sw.fails.length === 0 && row.invisibleFields.length === 0;
    } catch (err) {
      row.pass = false;
      row.error = String(err.message ?? err).split("\n")[0];
      try {
        const file = `${slug(base.group)}-${slug(route)}-${slug(s.name)}-${width}.jpg`;
        await page.screenshot({ path: `${OUT}/shots/${file}`, type: "jpeg", quality: 55 });
        row.screenshot = `shots/${file}`;
      } catch {}
    }
    results.push(row);
    const mark = row.pass ? "pass" : "FAIL";
    const why = row.error ?? (row.pass ? "" : `${row.axe?.length ?? 0} axe, ${row.contrastFails?.length ?? 0} computed, ${row.invisibleFields?.length ?? 0} boxes`);
    console.log(`${mark}  ${String(width).padEnd(4)} ${route.padEnd(24)} ${s.name.padEnd(26)} ${why}`);
    await page.close();
  }
  await anon.close();
  await authed?.close();
}
await Promise.all(WIDTHS.map((w) => auditWidth(w)));
for (const w of WIDTHS) await auditWidth(w, true);
await browser.close();

const order = (r) => [r.group, r.route, r.state, -r.width].join("\u0000");
results.sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : b.width - a.width));

/* -------------------------------------------------------------- report */

// The empty phase appends to the full phase's results rather than replacing them.
const resultsFile = `${OUT}/results.json`;
let merged = results;
if (PHASE !== "full" && existsSync(resultsFile)) {
  const prev = JSON.parse(readFileSync(resultsFile, "utf8"));
  merged = [...prev.results, ...results];
}
const failed = merged.filter((r) => r.pass === false);
const skipped = merged.filter((r) => r.skipped);
const payload = { base: BASE, at: new Date().toISOString(), commit: process.env.AUDIT_COMMIT ?? null, results: merged };
writeFileSync(resultsFile, JSON.stringify(payload, null, 2));
writeContactSheet(payload, `${OUT}/contact-sheet.html`);

console.log(
  `\n${merged.length - skipped.length} checked, ${failed.length} failed, ${skipped.length} skipped — ${OUT}/contact-sheet.html`,
);
process.exit(failed.length ? 1 : 0);
