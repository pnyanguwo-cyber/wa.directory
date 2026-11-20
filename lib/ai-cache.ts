import { getSupabase } from '@/lib/supabase-server'

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function getCached<T>(key: string, ttlMs = CACHE_TTL_MS): Promise<T | null> {
  try {
    const { data } = await getSupabase()
      .from('ai_cache')
      .select('result, created_at')
      .eq('cache_key', key)
      .maybeSingle()

    if (!data) return null

    const age = Date.now() - new Date(data.created_at).getTime()
    if (age > ttlMs) return null

    return data.result as T
  } catch {
    return null
  }
}

export async function setCached(key: string, value: unknown) {
  try {
    await getSupabase()
      .from('ai_cache')
      // created_at must be rewritten explicitly: an upsert that omits it keeps
      // the original timestamp, so an expired row would stay expired forever
      // and regenerate on every request instead of once every 7 days.
      .upsert(
        { cache_key: key, result: value, created_at: new Date().toISOString() },
        { onConflict: 'cache_key' }
      )
  } catch {
    // cache is best-effort; never block the request on it
  }
}

/** Reads a cache entry together with its age, for callers that treat fresh
 *  generated content and a stale fallback differently. */
export async function getCachedEntry<T>(key: string): Promise<{ value: T; ageMs: number } | null> {
  try {
    const { data } = await getSupabase()
      .from('ai_cache')
      .select('result, created_at')
      .eq('cache_key', key)
      .maybeSingle()

    if (!data) return null
    return {
      value: data.result as T,
      ageMs: Date.now() - new Date(data.created_at).getTime(),
    }
  } catch {
    return null
  }
}
