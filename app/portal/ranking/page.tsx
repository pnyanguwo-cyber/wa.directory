import { redirect } from 'next/navigation'
import { getPortalBusiness } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'
import PortalRanking from '@/components/portal/ranking'

export const dynamic = 'force-dynamic'

export default async function PortalRankingPage() {
  const business = await getPortalBusiness()
  if (!business) redirect('/login')

  const categories = (business.category || []).filter(Boolean)
  const mainCategory = categories[0] || 'Other'
  const city = business.city || ''

  const { data: activeSpots } = await getSupabase()
    .from('rank_spots')
    .select('business_id, category, city, position, monthly_fee, period_start, period_end, status')
    .eq('category', mainCategory)
    .eq('city', city)
    .eq('status', 'active')
    .order('position', { ascending: true })

  const spotIds = (activeSpots || []).map(s => s.business_id)
  const { data: spotBusinesses } = spotIds.length
    ? await getSupabase().from('businesses').select('id, name, slug').in('id', spotIds)
    : { data: [] }

  const businessById = new Map((spotBusinesses || []).map(b => [b.id, b]))

  return (
    <PortalRanking
      businessId={business.id}
      category={mainCategory}
      city={city}
      spots={(activeSpots || []).map(s => ({
        position: s.position,
        businessId: s.business_id,
        businessName: businessById.get(s.business_id)?.name || 'Business',
        businessSlug: businessById.get(s.business_id)?.slug || '',
        monthlyFee: Number(s.monthly_fee || 0),
        periodStart: s.period_start,
        periodEnd: s.period_end,
        mine: s.business_id === business.id,
      }))}
    />
  )
}