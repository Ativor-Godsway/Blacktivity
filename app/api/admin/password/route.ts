import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import AdminUser from "@/models/AdminUser";
import { passwordChangeSchema } from "@/lib/validation";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { BCRYPT_COST } from "@/lib/password";

// bcrypt and Mongoose — never Edge.
export const runtime = "nodejs";

/**
 * Change the admin password — Revision 25 §3.2.
 *
 * Neither password is ever logged, and the hash is never returned. On success
 * `passwordChangedAt` moves forward, which makes every session token issued
 * before now fail the server-side check in lib/session.ts — so other signed-in
 * devices are signed out — and this session gets a fresh cookie so the person
 * who made the change stays in.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return badRequest("Malformed request body.");
  }

  const parsed = passwordChangeSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error);

  // Same window as the login route, tighter count: without it a stolen session
  // could brute-force the current password through this endpoint.
  const limit = rateLimit(`password:${session.sub}:${getClientIp(req.headers)}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    await dbConnect();
    const user = await AdminUser.findById(session.sub);
    if (!user) return unauthorized();

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect.", fields: { currentPassword: "Current password is incorrect." } },
        { status: 400 },
      );
    }

    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
    user.passwordChangedAt = new Date();
    await user.save();

    const token = await createSessionToken({
      sub: String(user._id),
      email: user.email,
      name: user.name ?? "Admin",
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...sessionCookieOptions, value: token });
    return res;
  } catch {
    return serverError("Couldn't update the password. Try again.");
  }
}
