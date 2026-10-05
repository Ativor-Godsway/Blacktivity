/**
 * POST /api/admin/password — Revision 25 §4.
 *
 *   BASE=http://localhost:3111 MONGODB_URI=<local> npm run test:admin-password
 *
 * LOCAL ONLY: it writes a known password into the admin it finds, so it refuses
 * any BASE that isn't localhost and any non-local MONGODB_URI. It goes through
 * the real server — proxy, session check, route — rather than calling the
 * handler directly, because the thing under test is the whole chain.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3111";
const URI = process.env.MONGODB_URI;
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("Refusing: BASE must be localhost.");
if (!URI || !/(localhost|127\.0\.0\.1)/.test(URI)) throw new Error("Refusing: MONGODB_URI must be local.");

const START = "start-password-1234";
const NEXT = "brand-new-password-5678";

await mongoose.connect(URI);
const users = mongoose.connection.collection("adminusers");
const admin = await users.findOne({});
assert.ok(admin, "no admin in the local database — run npm run seed:admin");
await users.updateOne(
  { _id: admin._id },
  { $set: { passwordHash: await bcrypt.hash(START, 4), passwordChangedAt: null } },
);

const cookieFrom = (res) => res.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.startsWith("blacktivity_session="));

async function login(password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify({ email: admin.email, password }),
  });
  return { status: res.status, cookie: cookieFrom(res) };
}
const change = (cookie, body) =>
  fetch(`${BASE}/api/admin/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });

let passed = 0;
const step = async (name, fn) => {
  await fn();
  passed++;
  console.log(`  ok   ${name}`);
};

try {
  const a = await login(START);
  assert.equal(a.status, 200);
  // A second "device", signed in before the change. iat is whole seconds, so
  // wait a second so the change lands strictly after both tokens were issued.
  const b = await login(START);
  await new Promise((r) => setTimeout(r, 1100));

  await step("no session → 401", async () => {
    const res = await change("", { currentPassword: START, newPassword: NEXT });
    assert.equal(res.status, 401);
  });

  await step("wrong current password → 400", async () => {
    const res = await change(a.cookie, { currentPassword: "definitely-wrong-1", newPassword: NEXT });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /current password is incorrect/i);
  });

  await step("short new password → 400", async () => {
    const res = await change(a.cookie, { currentPassword: START, newPassword: "short" });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).fields?.newPassword);
  });

  let fresh;
  await step("success → 200, fresh cookie, hash never returned", async () => {
    const res = await change(a.cookie, { currentPassword: START, newPassword: NEXT });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(!text.includes("$2"), "response contains a bcrypt hash");
    fresh = cookieFrom(res);
    assert.ok(fresh && fresh !== a.cookie, "no fresh cookie issued");
  });

  await step("old password fails at login, new one works", async () => {
    assert.equal((await login(START)).status, 401);
    assert.equal((await login(NEXT)).status, 200);
  });

  await step("old session token rejected after the change (API → 401)", async () => {
    const res = await fetch(`${BASE}/api/admin/events`, { headers: { Cookie: b.cookie } });
    assert.equal(res.status, 401);
  });

  await step("old session token rejected after the change (page → sign-in, cookie cleared)", async () => {
    const res = await fetch(`${BASE}/admin`, { headers: { Cookie: b.cookie }, redirect: "manual" });
    assert.ok([303, 307, 308].includes(res.status), `expected a redirect, got ${res.status}`);
    const loc = res.headers.get("location") ?? "";
    assert.match(loc, /\/admin\/login\?expired=1/);
    const login = await fetch(new URL(loc, BASE), { headers: { Cookie: b.cookie }, redirect: "manual" });
    assert.equal(login.status, 200, "the sign-in page bounced the stale token instead of showing");
    assert.match(login.headers.getSetCookie().join(";"), /blacktivity_session=;/);
  });

  await step("the session that made the change stays signed in", async () => {
    const res = await fetch(`${BASE}/admin`, { headers: { Cookie: fresh }, redirect: "manual" });
    assert.equal(res.status, 200);
  });

  console.log(`\nadmin-password: PASS (${passed} checks)`);
} catch (err) {
  console.error(`  FAIL ${err.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
