import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const key =
    serviceKey && !serviceKey.includes('PASTE_')
      ? serviceKey
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    key
  )
}

