/**
 * Minimal in-memory rate limiter.
 *
 * Adequate for a single-instance deployment. If TicketGate is deployed
 * across multiple server instances, replace this with a shared store
 * (e.g. Redis / Upstash) so limits are enforced globally rather than
 * per-instance — the function signature below is designed to make that a
 * drop-in swap.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}
