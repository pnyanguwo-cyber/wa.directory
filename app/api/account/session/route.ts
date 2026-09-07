import { NextResponse } from 'next/server'
import { getBusinessId } from '@/lib/business-auth'
import { getSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const businessId = getBusinessId()
  if (!businessId) return NextResponse.json({ loggedIn: false })

  // The cookie alone is not proof of an account: if the listing was deleted,
  // every portal page bounces to /login while the navbar still said
  // "My Portal + Logout". Verify the business actually exists (fail closed).
  try {
    const { data } = await getSupabase()
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .maybeSingle()
    return NextResponse.json({ loggedIn: !!data })
  } catch {
    // DB unavailable — don't claim logged-in on a stale cookie
    return NextResponse.json({ loggedIn: false })
  }
}
