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
