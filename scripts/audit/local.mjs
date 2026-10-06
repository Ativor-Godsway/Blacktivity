/**
 * THE WHOLE AUDIT, SELF-CONTAINED — what CI runs on every PR.
 *
 *   npm run audit:contrast:local
 *
 * 1. An in-memory MongoDB, seeded with the placeholder content and a test admin
 *    (never your .env.local database — MONGODB_URI is overridden).
 * 2. `next build` (skip with AUDIT_SKIP_BUILD=1 when .next is current) and
 *    `next start` on :3111.
 * 3. The full audit (scripts/audit/run.mjs), then every content collection is
 *    emptied and the "empty state" pass runs on the same server.
 *
 * Output lands in audit/: results.json, shots/, contact-sheet.html.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";

const PORT = 3111;
const EMAIL = "audit@blacktivity.test";
const PASSWORD = "audit-password-1234";

const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri("blacktivity");
const env = {
  ...process.env,
  MONGODB_URI: uri,
  ADMIN_EMAIL: EMAIL,
  ADMIN_PASSWORD: PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET ?? "audit-only-secret-that-is-at-least-32-chars",
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
};
// Asynchronous on purpose. The in-memory mongod is this process's child and
// writes its log into a pipe this process drains; spawnSync would block the
// event loop, the pipe would fill, and mongod would stall mid-seed.
const run = (cmd, args, extra = {}) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", env: { ...env, ...extra } });
    child.on("exit", (code) => resolve(code ?? 1));
  });

let server;
let code = 1;
try {
  if (await run("npx", ["tsx", "scripts/seed.ts"])) throw new Error("seed failed");
  if (!process.env.AUDIT_SKIP_BUILD && (await run("npm", ["run", "build"]))) throw new Error("build failed");

  // Its own process group, so stopping it stops next as well as npx.
  server = spawn("npx", ["next", "start", "-p", String(PORT)], { env, stdio: "ignore", detached: true });
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`http://localhost:${PORT}/`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  rmSync("audit/shots", { recursive: true, force: true });
  const auditEnv = { BASE: `http://localhost:${PORT}`, AUDIT_ADMIN_EMAIL: EMAIL, AUDIT_ADMIN_PASSWORD: PASSWORD };
  const full = await run("node", ["scripts/audit/run.mjs"], auditEnv);

  // Empty every content collection — the admin account stays.
  await mongoose.connect(uri);
  for (const name of ["articles", "events", "submissions", "chartvolumes", "tracks", "dailystats", "analyticsevents"]) {
    await mongoose.connection.collection(name).deleteMany({});
  }
  await mongoose.disconnect();
  const empty = await run("node", ["scripts/audit/run.mjs"], { ...auditEnv, AUDIT_PHASE: "empty" });

  code = full || empty;
} catch (err) {
  console.error(err.message);
} finally {
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  }
  await mongo.stop();
}
process.exit(code);
