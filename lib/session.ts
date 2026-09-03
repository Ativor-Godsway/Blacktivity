import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifySessionToken, type SessionPayload } from "./auth";

/** Reads the verified session inside server components and route handlers. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Route-handler guard. Returns the session, or null for the caller to 401. */
export async function requireSession(): Promise<SessionPayload | null> {
  return getSession();
}
