import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * `jose` is used rather than `jsonwebtoken` because it runs in the Edge
 * runtime, which is where the middleware verifies the token. bcrypt hashing
 * happens only in Node route handlers.
 */
export const AUTH_COOKIE = "blacktivity_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = JWTPayload & {
  sub: string;
  email: string;
  name: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: {
  sub: string;
  email: string;
  name: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  name: AUTH_COOKIE,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

/**
 * True when a token was issued at or after the last password change.
 *
 * `iat` is whole seconds, so the change time is compared at second
 * resolution: the fresh cookie issued in the same second as the change must
 * still count as current.
 */
export function issuedAfterPasswordChange(
  iat: number | undefined,
  passwordChangedAt: Date | null | undefined,
): boolean {
  if (!passwordChangedAt) return true;
  if (typeof iat !== "number") return false;
  return iat >= Math.floor(passwordChangedAt.getTime() / 1000);
}

/**
 * Where a server-side check sends a rejected session. The proxy clears the
 * cookie on this URL — without that, a token rejected here but still valid as
 * a JWT would bounce between /admin and /admin/login forever.
 */
export const LOGIN_EXPIRED_PATH = "/admin/login?expired=1";
