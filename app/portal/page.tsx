import { redirect } from 'next/navigation'
import { getPortalBusiness, getDailyStats, getLifetimeTotals, isPaidSubscriber, buildChartData } from '@/lib/portal'
import PortalOverview from '@/components/portal/overview'

export const dynamic = 'force-dynamic'

export default async function PortalPage() {
  const business = await getPortalBusiness()
  if (!business) redirect('/login')

  const paid = await isPaidSubscriber(business.id)

  const [rows, lifetime] = await Promise.all([
    getDailyStats(business.id, 90),
    getLifetimeTotals(business.id),
  ])

  const chart = buildChartData(rows, [
    'profile_view', 'click_whatsapp', 'click_call', 'click_website',
    'impression', 'qr_scan', 'bot_search', 'bot_chat_open', 'share_bot', 'share_web',
  ])

  return <PortalOverview businessId={business.id} businessName={business.name} businessSlug={business.slug || business.id} paid={paid} rows={chart} lifetime={lifetime} />
}