import { writeFileSync } from "node:fs";

/**
 * One page with every screen the audit visited — Revision 26 §4.
 * Grouped Admin / Public, each thumbnail labelled route · state · width, with
 * the pass/fail badge and, on a failure, the offending elements and ratios.
 */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function failureList(r) {
  const items = [];
  if (r.error) items.push(`<li>${esc(r.error)}</li>`);
  for (const v of r.axe ?? []) {
    for (const n of v.nodes) items.push(`<li><b>axe</b> <code>${esc(n.target)}</code> — ${esc(n.summary.replace(/^Fix any of the following:\s*/, ""))}</li>`);
  }
  for (const f of r.contrastFails ?? []) {
    items.push(
      `<li><b>${f.ratio.toFixed(2)}:1</b> (needs ${f.required}) <code>${esc(f.selector)}</code> “${esc(f.text)}” <span class="sw" style="background:${f.fg}"></span>${f.fg} on <span class="sw" style="background:${f.bg}"></span>${f.bg}</li>`,
    );
  }
  for (const w of r.forbiddenWords ?? []) {
    items.push(`<li><b>says “volume” or “slug”</b> ${esc(w)}</li>`);
  }
  for (const b of r.invisibleFields ?? []) {
    items.push(`<li><b>no visible box</b> <code>${esc(b.selector)}</code> (edge ${b.edge}:1, ground ${b.groundStep}:1)</li>`);
  }
  return items.length ? `<ul class="fails">${items.slice(0, 40).join("")}${items.length > 40 ? `<li>…and ${items.length - 40} more</li>` : ""}</ul>` : "";
}

function card(r) {
  const status = r.skipped ? "skip" : r.pass ? "pass" : "fail";
  const label = r.skipped ? "Skipped" : r.pass ? "Pass" : "Fail";
  const thumb = r.screenshot
    ? `<a class="thumb" href="${esc(r.screenshot)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(r.screenshot)}" alt="${esc(`${r.route} — ${r.state} at ${r.width}px`)}"></a>`
    : `<div class="thumb empty">${r.skipped ? esc(r.skipped) : "No screenshot"}</div>`;
  const meta = r.skipped
    ? ""
    : r.measured != null
      ? `<p class="meta">${r.measured} text nodes and values measured${r.overImage?.length ? ` · ${r.overImage.length} over a photograph (${r.overImage.filter((o) => o.scrim).length} with a scrim)` : ""}</p>`
      : "";
  return `<article class="card ${status}">
    ${thumb}
    <div class="body">
      <div class="row"><span class="badge ${status}">${label}</span><span class="w">${r.width ? `${r.width}px` : ""}</span></div>
      <h3>${esc(r.route)}</h3>
      <p class="state">${esc(r.state)}</p>
      ${meta}
      ${status === "fail" ? failureList(r) : ""}
    </div>
  </article>`;
}

export function writeContactSheet({ base, at, commit, results }, file, { fragment = false } = {}) {
  const groups = ["Admin", "Public"];
  const counts = (rs) => ({
    pass: rs.filter((r) => r.pass === true).length,
    fail: rs.filter((r) => r.pass === false).length,
    skip: rs.filter((r) => r.skipped).length,
  });
  const total = counts(results);
  const sections = groups
    .map((g) => {
      const rs = results.filter((r) => r.group === g);
      const c = counts(rs);
      return `<section>
        <h2>${g} <span class="count">${c.pass} pass · ${c.fail} fail${c.skip ? ` · ${c.skip} skipped` : ""}</span></h2>
        <div class="grid">${rs.map(card).join("")}</div>
      </section>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blacktivity Contact Sheet</title>
<style>
  :root {
    --bg: #f6f4f0; --surface: #ffffff; --ink: #14110f; --muted: #5c564e; --line: #d9d3c8;
    --pass: #0b7a32; --pass-bg: #e3f3e8; --fail: #b42318; --fail-bg: #fbe9e7; --skip: #6b5a00; --skip-bg: #f6efcf;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #12100e; --surface: #1c1916; --ink: #f1ece4; --muted: #b3aa9c; --line: #34302b;
      --pass: #7fd69a; --pass-bg: #163322; --fail: #ff9b8f; --fail-bg: #3a1714; --skip: #e8d27a; --skip-bg: #332c0e;
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --bg: #12100e; --surface: #1c1916; --ink: #f1ece4; --muted: #b3aa9c; --line: #34302b;
    --pass: #7fd69a; --pass-bg: #163322; --fail: #ff9b8f; --fail-bg: #3a1714; --skip: #e8d27a; --skip-bg: #332c0e;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { padding: 32px 16px 8px; max-width: 1400px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 28px; letter-spacing: -0.01em; }
  .sub { color: var(--muted); margin: 0; font-size: 14px; overflow-wrap: anywhere; }
  .totals { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 0; }
  main { max-width: 1400px; margin: 0 auto; padding: 0 16px 64px; }
  section { margin-top: 36px; }
  h2 { font-size: 20px; margin: 0 0 14px; display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
  .count { font-size: 13px; color: var(--muted); font-weight: 500; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 16px; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; min-width: 0; }
  .card.fail { border-color: var(--fail); }
  .thumb { display: block; height: 220px; overflow: hidden; background: var(--bg); border-bottom: 1px solid var(--line); }
  .thumb img { width: 100%; display: block; }
  .thumb.empty { display: grid; place-items: center; color: var(--muted); font-size: 13px; padding: 16px; text-align: center; }
  .body { padding: 12px 14px 14px; min-width: 0; }
  .row { display: flex; justify-content: space-between; align-items: center; }
  .badge { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; }
  .badge.pass { color: var(--pass); background: var(--pass-bg); }
  .badge.fail { color: var(--fail); background: var(--fail-bg); }
  .badge.skip { color: var(--skip); background: var(--skip-bg); }
  .w { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
  h3 { margin: 8px 0 0; font-size: 15px; overflow-wrap: anywhere; font-family: ui-monospace, "SF Mono", monospace; }
  .state { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
  .meta { margin: 6px 0 0; color: var(--muted); font-size: 12px; }
  .fails { margin: 10px 0 0; padding-left: 18px; font-size: 12.5px; color: var(--ink); }
  .fails li { margin: 4px 0; overflow-wrap: anywhere; }
  .fails b { color: var(--fail); }
  code { font-size: 11.5px; }
  .sw { display: inline-block; width: 10px; height: 10px; border: 1px solid var(--line); vertical-align: middle; margin: 0 2px 0 4px; }
</style>
</head>
<body>
<header>
  <h1>Every screen, before clients see it</h1>
  <p class="sub">${esc(base)} · ${esc(new Date(at).toUTCString())}${commit ? ` · commit ${esc(commit)}` : ""}</p>
  <p class="sub">Each state is checked with axe (colour contrast) and a computed check of every visible text node and field value against what is painted beneath it: 4.5:1, or 3:1 for large text. Click a thumbnail for the full page.</p>
  <div class="totals">
    <span class="badge pass">${total.pass} pass</span>
    <span class="badge fail">${total.fail} fail</span>
    ${total.skip ? `<span class="badge skip">${total.skip} skipped</span>` : ""}
  </div>
</header>
<main>${sections}</main>
</body>
</html>`;
  // fragment: the same page without the document wrapper, for hosts that
  // supply their own <html>/<head>/<body>.
  const out = fragment
    ? html.replace(/^<!doctype html>\s*<html[^>]*>\s*<head>\s*(?:<meta[^>]*>\s*)*/i, "").replace(/<\/head>\s*<body>/i, "").replace(/<\/body>\s*<\/html>\s*$/i, "")
    : html;
  writeFileSync(file, out);
}

// CLI: node scripts/audit/contact-sheet.mjs <results.json> <out.html> [--fragment]
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import("node:fs");
  const [, , input = "audit/results.json", output = "audit/contact-sheet.html", flag] = process.argv;
  writeContactSheet(JSON.parse(readFileSync(input, "utf8")), output, { fragment: flag === "--fragment" });
}
