/**
 * ROTATION WITHOUT VOLUMES — Revision 27 §3.
 *
 *   BASE=http://localhost:3111 MONGODB_URI=<local> AUDIT_ADMIN_EMAIL=… AUDIT_ADMIN_PASSWORD=… npm run test:rotation
 *
 * LOCAL ONLY — it saves the rotation and starts a new one. Drives the real UI
 * (Playwright) for the save and the new-rotation flow, and reads the database
 * directly to prove archived rotations are byte-identical afterwards.
 */
import { chromium } from "playwright-core";
import mongoose from "mongoose";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3111";
const URI = process.env.MONGODB_URI;
const EMAIL = process.env.AUDIT_ADMIN_EMAIL;
const PASSWORD = process.env.AUDIT_ADMIN_PASSWORD;
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("Refusing: BASE must be localhost.");
if (!URI || !/(localhost|127\.0\.0\.1)/.test(URI)) throw new Error("Refusing: MONGODB_URI must be local.");
const CHROME =
  process.env.CHROME_PATH ??
  (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "/usr/bin/google-chrome");

await mongoose.connect(URI);
const volumes = mongoose.connection.collection("chartvolumes");
const tracks = mongoose.connection.collection("tracks");

const current = () => volumes.find({ status: "published" }).sort({ number: -1 }).limit(1).next();
/** Every volume except the current one, serialised exactly as stored. */
async function archiveSnapshot(excludeId) {
  const docs = await volumes.find({ _id: { $ne: excludeId } }).sort({ number: 1 }).toArray();
  return JSON.stringify(docs);
}
async function chartNames(doc) {
  const ids = doc.chart.slice().sort((a, b) => a.position - b.position).map((e) => e.track);
  const byId = new Map((await tracks.find({ _id: { $in: ids } }).toArray()).map((t) => [String(t._id), t]));
  return ids.map((id) => byId.get(String(id)));
}

const browser = await chromium.launch({ executablePath: CHROME });
const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
const login = await context.request.post("/api/auth/login", { data: { email: EMAIL, password: PASSWORD } });
assert.ok(login.ok(), "audit sign-in failed");
const page = await context.newPage();
page.on("dialog", (d) => d.accept());

let passed = 0;
const step = async (name, fn) => {
  await fn();
  passed++;
  console.log(`  ok   ${name}`);
};

try {
  const before = await current();
  assert.ok(before, "no published rotation — seed first");
  const archivedBefore = await archiveSnapshot(before._id);

  await step("/admin/rotation renders both lists with no intermediate page", async () => {
    const res = await page.goto("/admin/rotation", { waitUntil: "networkidle" });
    assert.equal(res.status(), 200);
    assert.equal(new URL(page.url()).pathname, "/admin/rotation");
    await page.getByRole("heading", { name: "Top 10" }).waitFor();
    await page.getByRole("heading", { name: "New Releases" }).waitFor();
    assert.equal(await page.locator('button[aria-label^="Move "][aria-label*="down"]').count() > 0, true);
  });

  const [first, second] = await chartNames(before);

  await step("reorder + save updates the public /rotation after revalidation", async () => {
    await page.locator('button[aria-label^="Move "][aria-label*="down"]').first().click();
    await page.getByRole("button", { name: /^Save changes • 1 edit$/i }).waitFor();
    await page.getByRole("button", { name: /^Save changes/i }).click();
    await page.getByText("Saved. It's live on the site.").waitFor({ timeout: 20000 });

    const after = await current();
    const [a, b] = await chartNames(after);
    assert.equal(String(a._id), String(second._id), "position 1 in the database is not the moved track");
    assert.equal(String(b._id), String(first._id));

    // The public page, after on-demand revalidation. A second request is
    // allowed in case the first one triggered the regeneration.
    let order = null;
    for (let i = 0; i < 5 && !order; i++) {
      const html = await fetch(`${BASE}/rotation`).then((r) => r.text());
      const ia = html.indexOf(second.title);
      const ib = html.indexOf(first.title);
      if (ia > -1 && ib > -1 && ia < ib) order = "moved";
      else await new Promise((r) => setTimeout(r, 1000));
    }
    assert.equal(order, "moved", "/rotation still shows the old order");
  });

  await step("archived rotations are byte-identical after a save", async () => {
    assert.equal(await archiveSnapshot(before._id), archivedBefore);
  });

  await step("start a new rotation creates the next one and archives the previous", async () => {
    const saved = await current();
    const savedJson = JSON.stringify(saved);
    const maxBefore = (await volumes.find().sort({ number: -1 }).limit(1).next()).number;

    await page.goto("/admin/rotation", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Start a new rotation$/i }).click();
    await page.getByRole("button", { name: /^Yes, start it$/ }).click();
    await page.getByText(/started with the same tracks/).waitFor({ timeout: 20000 });

    const now = await current();
    assert.equal(now.number, maxBefore + 1, "the new rotation didn't get the next number");
    assert.notEqual(String(now._id), String(saved._id));
    assert.deepEqual(
      now.chart.map((e) => [String(e.track), e.position]),
      saved.chart.map((e) => [String(e.track), e.position]).sort((x, y) => x[1] - y[1]),
      "the Top 10 wasn't carried over",
    );
    assert.equal(now.newMusic.length, saved.newMusic.length);
    // The previous rotation itself was not written to.
    assert.equal(JSON.stringify(await volumes.findOne({ _id: saved._id })), savedJson);
  });

  await step("/admin/rotation/[id] redirects: current → editor, archived → view-only", async () => {
    const now = await current();
    const archived = await volumes.find({ _id: { $ne: now._id } }).sort({ number: -1 }).limit(1).next();
    const cookies = (await context.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
    const get = (path) => fetch(BASE + path, { headers: { cookie: cookies }, redirect: "manual" });

    const a = await get(`/admin/rotation/${now._id}`);
    assert.ok([307, 308].includes(a.status), `current: ${a.status}`);
    assert.equal(new URL(a.headers.get("location"), BASE).pathname, "/admin/rotation");

    const b = await get(`/admin/rotation/${archived._id}`);
    assert.ok([307, 308].includes(b.status), `archived: ${b.status}`);
    assert.equal(new URL(b.headers.get("location"), BASE).pathname, `/admin/rotation/past/${archived._id}`);

    const c = await get("/admin/rotation/new");
    assert.equal(c.status, 404, "/admin/rotation/new should be gone");
  });

  console.log(`\nrotation: PASS (${passed} checks)`);
} catch (err) {
  console.error(`  FAIL ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  await mongoose.disconnect();
}
