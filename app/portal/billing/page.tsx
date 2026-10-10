import { redirect } from 'next/navigation'
import { getActingPortalBusiness, getSubscription, getListingSubscription } from '@/lib/portal'
import PortalBilling from '@/components/portal/billing'

export const dynamic = 'force-dynamic'

export default async function PortalBillingPage({ searchParams }: { searchParams: { branch?: string } }) {
  // HQ can open a branch's billing via ?branch=<id> (org-scoped guard).
  const session = await getActingPortalBusiness(searchParams?.branch)
  if (!session) redirect('/login')
  const business = session.business

  const [sub, listingSub] = await Promise.all([
    getSubscription(business.id),
    getListingSubscription(business.id),
  ])

  return <PortalBilling businessId={business.id} businessName={business.name} sub={sub} listingSub={listingSub} />
}