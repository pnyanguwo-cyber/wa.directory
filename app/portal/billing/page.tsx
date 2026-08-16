import { redirect } from 'next/navigation'
import { getPortalBusiness, getSubscription } from '@/lib/portal'
import PortalBilling from '@/components/portal/billing'

export const dynamic = 'force-dynamic'

export default async function PortalBillingPage() {
  const business = await getPortalBusiness()
  if (!business) redirect('/login')

  const sub = await getSubscription(business.id)

  return <PortalBilling businessId={business.id} businessName={business.name} sub={sub} />
}