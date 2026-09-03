import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import AdminUser from "@/models/AdminUser";
import { loginSchema } from "@/lib/validation";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { badRequest, serverError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return badRequest("Malformed request body.");
  }

  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error);

  const ip = getClientIp(req.headers);
  const limit = rateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    await dbConnect();
    const user = await AdminUser.findOne({ email: parsed.data.email.toLowerCase() }).lean();

    // Same message and comparable timing whether the user exists or not.
    const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduO";
    const valid = await bcrypt.compare(parsed.data.password, hash);

    if (!user || !valid) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    const token = await createSessionToken({
      sub: String(user._id),
      email: user.email,
      name: user.name ?? "Admin",
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...sessionCookieOptions, value: token });
    return res;
  } catch {
    return serverError("Couldn't sign you in. Try again.");
  }
}
