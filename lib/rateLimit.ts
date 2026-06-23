export interface RateLimitResult {
  ok: boolean
  retryAfter: number // seconds until the window resets
  remaining: number
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Fixed-window in-memory rate limiter. Per-instance only (good enough to stop
// casual abuse / runaway loops; a multi-instance deployment should layer a
// shared store like Upstash on top). `now` is injectable for tests.
export function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
  now: number = Date.now()
): RateLimitResult {
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0, remaining: limit - 1 }
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000), remaining: 0 }
  }

  bucket.count += 1
  return { ok: true, retryAfter: 0, remaining: limit - bucket.count }
}

// Test helper.
export function resetRateLimits(): void {
  buckets.clear()
}
