/**
 * Fixed-window rate limiter held in lambda memory.
 *
 * This is deliberately simple: it survives as long as a warm lambda does, which
 * on Hobby is long enough to stop the bulk-spam that actually shows up. If the
 * site ever needs guarantees across instances, swap the Map for Upstash Redis —
 * the call signature will not change.
 */
type Entry = { count: number; resetAt: number };

const globalWithBuckets = globalThis as typeof globalThis & {
  _rateLimitBuckets?: Map<string, Entry>;
};

const buckets = globalWithBuckets._rateLimitBuckets ?? new Map<string, Entry>();
globalWithBuckets._rateLimitBuckets = buckets;

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60 * 60 * 1000 }: { limit?: number; windowMs?: number } = {},
): { ok: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { ok: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
}

/** Best-effort client IP from the proxy chain. Never stored raw. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "0.0.0.0";
}
