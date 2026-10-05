import bcrypt from "bcryptjs";
import type { Model } from "mongoose";
import type { AdminUserDoc } from "@/models/AdminUser";
import { BCRYPT_COST } from "./password";

/**
 * Creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD only if there is no admin
 * yet — Revision 25 §3.4.
 *
 * It used to upsert, which meant every re-run of the seed quietly reset the
 * password to the bootstrap value and undid any change made in the admin.
 * Once an admin exists, ADMIN_PASSWORD stops mattering: the password is
 * changed at /admin/account, or recovered with scripts/reset-admin-password.ts.
 */
export async function ensureAdmin(
  AdminUser: Model<AdminUserDoc>,
  { email, password }: { email: string; password: string },
): Promise<"created" | "exists"> {
  if (await AdminUser.exists({})) return "exists";

  await AdminUser.create({
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, BCRYPT_COST),
    name: "Blacktivity",
  });
  return "created";
}
