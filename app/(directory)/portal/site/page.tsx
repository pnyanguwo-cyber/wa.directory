import { redirect } from 'next/navigation'
import { getActingPortalBusiness } from '@/lib/portal'
import PortalSite from '@/components/portal/site'
import { WEBSITE_THEMES, type WebsiteThemeMeta } from '@/registry/websites'

export const dynamic = 'force-dynamic'

export default async function PortalSitePage({ searchParams }: { searchParams: { branch?: string } }) {
  const session = await getActingPortalBusiness(searchParams?.branch)
  if (!session) redirect('/login')
  const business = session.business
  const themeGallery: WebsiteThemeMeta[] = Object.values(WEBSITE_THEMES).map(entry => entry.meta)

  return (
    <PortalSite
      businessId={business.id}
      businessSlug={business.slug || business.id}
      businessName={business.name}
      generateSite={business.generate_site !== false}
      siteHero={business.site_hero || ''}
      siteServices={business.site_services || ''}
      siteContactEmail={business.site_contact_email || ''}
      siteTheme={business.site_theme || null}
      siteSocials={business.site_socials || null}
      siteContent={business.site_content || null}
      themeGallery={themeGallery}
    />
  )
}
