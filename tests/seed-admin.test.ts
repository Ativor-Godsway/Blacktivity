/**
 * THE SEED MUST NEVER RESET AN EXISTING ADMIN PASSWORD — Revision 25 §3.4.
 *
 *   npm run test:seed-admin
 *
 * Runs against an in-memory MongoDB, so it never touches a real database.
 */
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import AdminUser from "@/models/AdminUser";
import { ensureAdmin } from "@/lib/admin-bootstrap";

async function main() {
  const server = await MongoMemoryServer.create();
  try {
    await mongoose.connect(server.getUri());

    // 1. Empty database: the bootstrap password creates the admin.
    assert.equal(await ensureAdmin(AdminUser, { email: "Owner@Example.com", password: "bootstrap-pass" }), "created");
    const created = await AdminUser.findOne().lean();
    assert.ok(created);
    assert.equal(created.email, "owner@example.com");
    assert.ok(await bcrypt.compare("bootstrap-pass", created.passwordHash));

    // 2. The owner changes the password in the admin.
    const changedHash = await bcrypt.hash("changed-in-the-admin", 4);
    await AdminUser.updateOne({ _id: created._id }, { passwordHash: changedHash, passwordChangedAt: new Date() });

    // 3. The seed runs again — same email, and a different one. Neither may touch the hash.
    assert.equal(await ensureAdmin(AdminUser, { email: "owner@example.com", password: "bootstrap-pass" }), "exists");
    assert.equal(await ensureAdmin(AdminUser, { email: "other@example.com", password: "bootstrap-pass" }), "exists");

    const after = await AdminUser.find().lean();
    assert.equal(after.length, 1, "a second admin was created");
    assert.equal(after[0]!.passwordHash, changedHash, "the seed overwrote the existing hash");
    assert.ok(!(await bcrypt.compare("bootstrap-pass", after[0]!.passwordHash)));

    console.log("seed-admin: PASS — an existing admin's hash is left unchanged");
  } finally {
    await mongoose.disconnect();
    await server.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
