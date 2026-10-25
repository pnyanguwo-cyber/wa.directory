import { redirect } from 'next/navigation'
import { getActingPortalBusiness } from '@/lib/portal'
import PortalBrandCard from '@/components/portal/brand-card'
import { SITE_URL } from '@/lib/site-url'
import { digitsOnly } from '@/lib/phone'

export const dynamic = 'force-dynamic'

export default async function PortalCardPage({ searchParams }: { searchParams: { branch?: string } }) {
  const session = await getActingPortalBusiness(searchParams?.branch)
  if (!session) redirect('/login')
  const business = session.business

  const key = business.slug || business.id
  const profileUrl = `${SITE_URL}/business/${key}`
  const phoneClean = digitsOnly(business.phone || '')
  const voiceOnly = business.phone_type === 'voice'
  const chatMsg = encodeURIComponent(`Hi ${business.name}, I came to you through WA.Directory and I want to ask about your services.`)
  // Voice-only listings have no WhatsApp chat — the QR dials instead.
  const chatUrl = voiceOnly ? `tel:${business.phone}` : phoneClean ? `https://wa.me/${phoneClean}?text=${chatMsg}` : `${SITE_URL}/qr/${key}`

  return (
    <PortalBrandCard
      business={business}
      profileUrl={profileUrl}
      chatUrl={chatUrl}
      chatLabel={voiceOnly ? 'Tap-to-call QR' : 'Customer chat QR'}
    />
  )
}
