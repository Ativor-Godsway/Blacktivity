import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import dbConnect from "./db";
import AdminUser from "@/models/AdminUser";
import { AUTH_COOKIE, issuedAfterPasswordChange, verifySessionToken, type SessionPayload } from "./auth";

/**
 * Verifies a session token AND checks it against the database — Node only.
 *
 * The Edge proxy can only verify the signature. This is the check that makes
 * a password change sign out every other device: a token issued before
 * `passwordChangedAt` is rejected, and so is one for an admin that no longer
 * exists. If the database can't be reached it fails closed.
 */
export async function verifySessionAgainstDb(token: string): Promise<SessionPayload | null> {
  const session = await verifySessionToken(token);
  if (!session) return null;

  try {
    await dbConnect();
    const user = await AdminUser.findById(session.sub).select("passwordChangedAt").lean();
    if (!user) return null;
    if (!issuedAfterPasswordChange(session.iat, user.passwordChangedAt)) return null;
    return session;
  } catch {
    return null;
  }
}

/** Reads the verified session inside server components and route handlers. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifySessionAgainstDb(token);
});

/** Route-handler guard. Returns the session, or null for the caller to 401. */
export async function requireSession(): Promise<SessionPayload | null> {
  return getSession();
}
