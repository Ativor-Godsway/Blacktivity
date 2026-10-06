/**
 * AUTOMATIC WEB ADDRESSES, END TO END — Revision 27 §3–4.
 *
 *   BASE=http://localhost:3111 AUDIT_ADMIN_EMAIL=… AUDIT_ADMIN_PASSWORD=… npm run test:redirect
 *
 * LOCAL ONLY (it creates articles and events). Every request sends a title
 * and NO slug — the server makes the address.
 */
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3111";
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("Refusing: BASE must be localhost.");

const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: process.env.AUDIT_ADMIN_EMAIL, password: process.env.AUDIT_ADMIN_PASSWORD }),
});
assert.ok(login.ok, "sign-in failed");
const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.startsWith("blacktivity_session="));

const api = (method, path, body) =>
  fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const image = { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", alt: "A test image", width: 1200, height: 1600 };
const run = Date.now().toString(36);
const article = (title, extra = {}) => ({
  title,
  excerpt: "A test article made by the web address test.",
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Body." }] }] },
  coverImage: image,
  category: "Culture",
  tags: [],
  author: { name: "Test Author", igHandle: "" },
  status: "draft",
  featured: false,
  ...extra,
});
const event = (title) => ({
  title,
  description: "A test event made by the web address test.",
  poster: { url: image.url, alt: "Poster", width: 1200, height: 1600 },
  startDate: new Date(Date.now() + 7 * 864e5).toISOString(),
  venue: "Test Venue",
  city: "Accra",
  ticketUrl: "",
  featured: false,
});

let passed = 0;
const step = async (name, fn) => {
  await fn();
  passed++;
  console.log(`  ok   ${name}`);
};

try {
  await step('an article titled "Archive" gets /articles/archive-2, with no slug typed', async () => {
    const r = await api("POST", "/api/admin/articles", article("Archive"));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.match(r.body.slug, /^archive-\d+$/);
    assert.notEqual(r.body.slug, "archive");
  });

  await step("two events with the same title get different addresses", async () => {
    const title = `Listening Session ${run}`;
    const a = await api("POST", "/api/admin/events", event(title));
    const b = await api("POST", "/api/admin/events", event(title));
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.equal(a.body.slug, `listening-session-${run}`);
    assert.equal(b.body.slug, `listening-session-${run}-2`);
  });

  let id;
  let slug;
  await step("a draft's address follows its title until it is published", async () => {
    const r = await api("POST", "/api/admin/articles", article(`Draft Title ${run}`));
    id = r.body.id;
    assert.equal(r.body.slug, `draft-title-${run}`);
    const renamed = await api("PATCH", `/api/admin/articles/${id}`, { title: `Better Title ${run}` });
    assert.equal(renamed.body.slug, `better-title-${run}`);
    const published = await api("PATCH", `/api/admin/articles/${id}`, { status: "published" });
    slug = published.body.slug;
    assert.equal(slug, `better-title-${run}`);
    const retitled = await api("PATCH", `/api/admin/articles/${id}`, { title: `Retitled After Publishing ${run}` });
    assert.equal(retitled.body.slug, slug, "a published address must not follow the title");
  });

  await step("changing a published article's address: the old one returns 308 to the new one", async () => {
    const live = await fetch(`${BASE}/articles/${slug}`, { redirect: "manual" });
    assert.equal(live.status, 200, `the article isn't live at /articles/${slug}`);

    const changed = await api("PATCH", `/api/admin/articles/${id}`, { slug: `New Address ${run}` });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal(changed.body.slug, `new-address-${run}`, "the typed address is normalised");

    const old = await fetch(`${BASE}/articles/${slug}`, { redirect: "manual" });
    assert.equal(old.status, 308, `old address answered ${old.status}`);
    // Next 16 sends the Location line twice on the FIRST (uncached) render of a
    // redirecting ISR page, both identical; later hits send one. Browsers only
    // reject repeated Location headers whose values DIFFER, so the property
    // that matters is: exactly one distinct target.
    const targets = new Set(old.headers.get("location").split(/,\s*/).map((l) => new URL(l, BASE).pathname));
    assert.deepEqual([...targets], [`/articles/new-address-${run}`]);
    const again = await fetch(`${BASE}/articles/${slug}`, { redirect: "manual" });
    assert.equal(again.status, 308);
    assert.equal(new URL(again.headers.get("location"), BASE).pathname, `/articles/new-address-${run}`);

    const fresh = await fetch(`${BASE}/articles/new-address-${run}`, { redirect: "manual" });
    assert.equal(fresh.status, 200);
  });

  await step("an old address counts as taken", async () => {
    const r = await api("POST", "/api/admin/articles", article(`Better Title ${run}`));
    assert.equal(r.body.slug, `better-title-${run}-2`);
  });

  await step("the preview endpoint answers what a save would produce", async () => {
    const r = await api("GET", `/api/admin/slug-preview?type=article&title=${encodeURIComponent("Archive")}`);
    assert.match(r.body.slug, /^archive-\d+$/);
    const typed = await api("GET", `/api/admin/slug-preview?type=article&slug=${encodeURIComponent("Archive!!")}`);
    assert.equal(typed.body.slug, "archive");
    assert.equal(typed.body.free, false, "a reserved word is not free");
  });

  console.log(`\nslug redirect: PASS (${passed} checks)`);
} catch (err) {
  console.error(`  FAIL ${err.message}`);
  process.exitCode = 1;
}
