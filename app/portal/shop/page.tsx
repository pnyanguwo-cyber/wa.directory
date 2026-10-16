import { redirect } from 'next/navigation'
import { getActingPortalBusiness } from '@/lib/portal'
import PortalShop from '@/components/portal/shop'

export const dynamic = 'force-dynamic'

export default async function PortalShopPage({ searchParams }: { searchParams: { branch?: string } }) {
  const session = await getActingPortalBusiness(searchParams?.branch)
  if (!session) redirect('/login')
  const business = session.business

  return <PortalShop businessId={business.id} businessName={business.name} />
}
