import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { username: string } }
) {
  const { data: business } = await getSupabase()
    .from('businesses')
    .select('slug')
    .eq('username', params.username)
    .maybeSingle()

  if (!business) {
    return new Response(null, { status: 404 })
  }

  redirect(`/business/${business.slug}`)
}