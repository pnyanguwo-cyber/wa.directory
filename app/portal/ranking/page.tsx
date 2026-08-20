import { redirect } from 'next/navigation'
import { getPortalBusiness, getRankingData } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'
import PortalRanking from '@/components/portal/ranking'

export const dynamic = 'force-dynamic'

export default async function PortalRankingPage() {
  const business = await getPortalBusiness()
  if (!business) redirect('/login')

  const categories = (business.category || []).filter(Boolean)
  const mainCategory = categories[0] || 'Other'
  const city = business.city || ''

  const ranking = await getRankingData(business.id, mainCategory, city)

  const spotIds = (ranking.spots || []).map(s => s.business_id)
  const { data: spotBusinesses } = spotIds.length
    ? await getSupabase().from('businesses').select('id, name, slug').in('id', spotIds)
    : { data: [] }

  const businessById = new Map((spotBusinesses || []).map(b => [b.id, b]))

  return (
    <PortalRanking
      businessId={business.id}
      category={mainCategory}
      city={city}
      spots={(ranking.spots || []).map(s => ({
        position: s.position,
        businessId: s.business_id,
        businessName: businessById.get(s.business_id)?.name || 'Business',
        businessSlug: businessById.get(s.business_id)?.slug || '',
        monthlyFee: Number(s.monthly_fee || 0),
        periodStart: s.period_start,
        periodEnd: s.period_end,
        mine: s.business_id === business.id,
      }))}
      bids={ranking.bids}
      currentFees={ranking.currentFees}
    />
  )
}