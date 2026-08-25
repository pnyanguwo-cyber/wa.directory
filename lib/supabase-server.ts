import { createClient } from '@supabase/supabase-js'

// Fail closed: the service-role key is required for every server-side
// Supabase operation. Silently falling back to the (public) anon key would
// break under the RLS lockdown and mask misconfiguration in production.
export function getSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey || serviceKey.includes('PASTE_')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing or still a placeholder. ' +
      'Set it in your environment (.env.local locally, Vercel env vars in production).'
    )
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceKey
  )
}
