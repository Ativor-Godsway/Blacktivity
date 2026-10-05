import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * The admin auth guard. Renamed from `middleware.ts` by
 * `@next/codemod middleware-to-proxy` — Next 16 deprecates the middleware file
 * convention in favour of this one.
 *
 * It only VERIFIES the JWT: this runs on the Edge runtime, which cannot run
 * Mongoose or bcrypt. Anything needing the database happens in Node route
 * handlers.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname === "/admin/login") {
    // A server-side check rejected this token (the password changed since it
    // was issued). Its signature is still fine, so without clearing it here
    // this branch would send it straight back to /admin — a redirect loop.
    if (req.nextUrl.searchParams.has("expired")) {
      const res = NextResponse.next();
      res.cookies.delete(AUTH_COOKIE);
      return res;
    }
    // Already signed in — skip the login screen.
    if (session) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/admin/login", req.url);
    if (pathname !== "/admin") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
