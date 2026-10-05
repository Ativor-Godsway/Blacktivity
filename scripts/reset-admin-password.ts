/**
 * Forgotten-password recovery — Revision 25 §3.5. Run from your own machine:
 *
 *   MONGODB_URI="<production URI>" npx tsx scripts/reset-admin-password.ts
 *
 * Prompts twice with hidden input. The password is never taken as an argument,
 * so it never lands in shell history. Setting passwordChangedAt signs out every
 * existing session.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import AdminUser from "../models/AdminUser";
import { BCRYPT_COST, PASSWORD_MAX, PASSWORD_MIN } from "../lib/password";

/** Reads one line from the TTY without echoing it. */
function promptHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) throw new Error("Run this in an interactive terminal.");

  return new Promise((resolve, reject) => {
    let value = "";
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const done = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      stdout.write("\n");
    };

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          done();
          return resolve(value);
        }
        if (ch === "\u0003") {
          done();
          return reject(new Error("Cancelled."));
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else if (ch >= " ") value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI for the database to update.");

  await mongoose.connect(uri);
  const admins = await AdminUser.find().select("email").lean();
  if (admins.length === 0) throw new Error("No admin exists. Run npm run seed:admin first.");

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const target = email ? admins.find((a) => a.email === email) : admins.length === 1 ? admins[0] : null;
  if (!target) {
    throw new Error(
      email
        ? `No admin with email ${email}.`
        : `${admins.length} admins exist — set ADMIN_EMAIL to choose one.`,
    );
  }

  console.log(`Resetting the password for ${target.email}`);
  const first = await promptHidden("New password: ");
  if (first.length < PASSWORD_MIN || first.length > PASSWORD_MAX) {
    throw new Error(`The password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`);
  }
  const second = await promptHidden("Repeat it:    ");
  if (first !== second) throw new Error("The two entries don't match. Nothing changed.");

  await AdminUser.updateOne(
    { _id: target._id },
    { passwordHash: await bcrypt.hash(first, BCRYPT_COST), passwordChangedAt: new Date() },
  );
  console.log("Password updated. Every existing session is signed out.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
