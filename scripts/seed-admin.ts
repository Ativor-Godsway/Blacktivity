import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import AdminUser from "../models/AdminUser";

config({ path: ".env.local" });
config();

/**
 * Creates or resets the single admin account from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Safe to re-run — it upserts.
 */
async function main() {
  const uri = process.env.MONGODB_URI;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!uri) throw new Error("MONGODB_URI is not set.");
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");

  await mongoose.connect(uri);

  const passwordHash = await bcrypt.hash(password, 12);
  await AdminUser.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), passwordHash, name: "Blacktivity" },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  console.log(`Admin ready: ${email}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
