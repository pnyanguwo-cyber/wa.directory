import { redirect } from 'next/navigation'
import { getActingPortalBusiness } from '@/lib/portal'
import { getApprovedCities } from '@/lib/approved-data'
import PortalRanking from '@/components/portal/ranking'

export const dynamic = 'force-dynamic'

export default async function PortalRankingPage({ searchParams }: { searchParams: { branch?: string } }) {
  // HQ with ?branch=<id> bids on that branch's behalf; the scoping guard in
  // getActingPortalBusiness only honors ids inside the HQ's own org.
  const session = await getActingPortalBusiness(searchParams?.branch)
  if (!session) redirect('/login')
  const business = session.business

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
      actingAs={session.actor.role === 'org-hq' && business.id !== session.actor.business.id ? business.name : null}
    />
  )
}