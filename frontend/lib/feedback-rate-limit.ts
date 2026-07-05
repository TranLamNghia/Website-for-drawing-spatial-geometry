type RateBucket = {
  count: number
  resetAt: number
}

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 3

const buckets = new Map<string, RateBucket>()

export function checkFeedbackRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  buckets.set(key, existing)
  return { allowed: true, retryAfterSec: 0 }
}
