import { redirect } from 'next/navigation'
import { getPortalBusiness } from '@/lib/portal'
import { getApprovedCities } from '@/lib/approved-data'
import PortalRanking from '@/components/portal/ranking'

export const dynamic = 'force-dynamic'

export default async function PortalRankingPage() {
  const business = await getPortalBusiness()
  if (!business) redirect('/login')

  const categories = (business.category || []).filter(Boolean)
  const isRemote = business.is_remote === true

  // Nationwide businesses can view and bid in every city, one at a time.
  const cities = isRemote ? (await getApprovedCities()).map(c => c.name) : []

  return (
    <PortalRanking
      businessId={business.id}
      myCategories={categories}
      myCity={business.city || ''}
      isRemote={isRemote}
      cities={cities}
    />
  )
}