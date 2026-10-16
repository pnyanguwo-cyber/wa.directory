import { redirect } from 'next/navigation'
import { getActingPortalBusiness } from '@/lib/portal'
import PortalSite from '@/components/portal/site'

export const dynamic = 'force-dynamic'

export default async function PortalSitePage({ searchParams }: { searchParams: { branch?: string } }) {
  const session = await getActingPortalBusiness(searchParams?.branch)
  if (!session) redirect('/login')
  const business = session.business

  return (
    <PortalSite
      businessId={business.id}
      businessName={business.name}
      generateSite={business.generate_site !== false}
      siteHero={business.site_hero || ''}
      siteServices={business.site_services || ''}
      siteContactEmail={business.site_contact_email || ''}
    />
  )
}
