import { createClient } from '@supabase/supabase-js'

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function cacheClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getCached<T>(key: string, ttlMs = CACHE_TTL_MS): Promise<T | null> {
  try {
    const { data } = await cacheClient()
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
    await cacheClient()
      .from('ai_cache')
      .upsert({ cache_key: key, result: value }, { onConflict: 'cache_key' })
  } catch {
    // cache is best-effort; never block the request on it
  }
}
