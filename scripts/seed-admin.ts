import { config } from "dotenv";
import mongoose from "mongoose";
import AdminUser from "../models/AdminUser";
import { ensureAdmin } from "../lib/admin-bootstrap";

config({ path: ".env.local" });
config();

/**
 * Creates the single admin account from ADMIN_EMAIL / ADMIN_PASSWORD — once.
 *
 * Safe to re-run: if an admin already exists it does nothing, so it can never
 * reset a password changed in the admin. To recover a forgotten password use
 * scripts/reset-admin-password.ts.
 */
async function main() {
  const uri = process.env.MONGODB_URI;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!uri) throw new Error("MONGODB_URI is not set.");
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");

  await mongoose.connect(uri);

  const result = await ensureAdmin(AdminUser, { email, password });
  console.log(
    result === "created"
      ? `Admin created: ${email}`
      : "An admin already exists — password left unchanged.",
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
