/**
 * Best-effort in-memory rate limiter for the expensive AI endpoints.
 *
 * Serverless caveat: each warm instance has its own map, so this throttles
 * bursts (the realistic abuse pattern for an image-analysis endpoint) rather
 * than guaranteeing a global quota. A durable limiter belongs in Postgres or
 * the edge config; this keeps the cost surface bounded until that decision is
 * made (recorded as an open item in the handover).
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_KEYS = 5_000

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  const ip = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  return `${scope}:${ip}`
}

/** Returns false when the caller has exhausted its window. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    if (buckets.size > MAX_KEYS) {
      // Cheap eviction of expired buckets; never let the map grow unbounded.
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (existing.count >= limit) return false
  existing.count += 1
  return true
}
