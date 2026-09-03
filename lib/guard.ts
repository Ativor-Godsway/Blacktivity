import "server-only";
import { getSession } from "./session";
import { unauthorized } from "./api";
import type { SessionPayload } from "./auth";

/**
 * Route-handler guard. Middleware already blocks /admin pages, but API routes
 * are hit directly, so every one of them re-checks the token here.
 */
export async function withAuth<T>(
  handler: (session: SessionPayload) => Promise<T>,
): Promise<T | ReturnType<typeof unauthorized>> {
  const session = await getSession();
  if (!session) return unauthorized();
  return handler(session);
}
