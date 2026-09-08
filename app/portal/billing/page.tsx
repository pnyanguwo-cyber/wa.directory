import { redirect } from 'next/navigation'
import { getPortalBusiness, getSubscription, getListingSubscription } from '@/lib/portal'
import PortalBilling from '@/components/portal/billing'

export const dynamic = 'force-dynamic'

export default async function PortalBillingPage() {
  const business = await getPortalBusiness()
  if (!business) redirect('/login')

  const [sub, listingSub] = await Promise.all([
    getSubscription(business.id),
    getListingSubscription(business.id),
  ])

  return <PortalBilling businessId={business.id} businessName={business.name} sub={sub} listingSub={listingSub} />
}