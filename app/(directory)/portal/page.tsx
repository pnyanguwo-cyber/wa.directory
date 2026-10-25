import { redirect } from 'next/navigation'
import { getActingPortalBusiness, getDailyStats, getLifetimeTotals, isPaidSubscriber, buildChartData } from '@/lib/portal'
import PortalOverview from '@/components/portal/overview'

export const dynamic = 'force-dynamic'

export default async function PortalPage({ searchParams }: { searchParams: { branch?: string } }) {
  const session = await getActingPortalBusiness(searchParams?.branch)
  if (!session) redirect('/login')
  const business = session.business

  const [paid, rows, lifetime] = await Promise.all([
    isPaidSubscriber(business.id),
    getDailyStats(business.id, 90),
    getLifetimeTotals(business.id),
  ])

  const chart = buildChartData(rows, [
    'profile_view', 'click_whatsapp', 'click_call', 'click_website',
    'impression', 'qr_scan', 'bot_search', 'bot_chat_open', 'share_bot', 'share_web',
  ])

  return (
    <>
      {session.actor.role === 'org-hq' && business.id !== session.actor.business.id && (
        <p className="text-[11px] font-semibold text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 -mt-2 mb-4">
          Viewing as <b>{business.name}</b> (branch of {session.actor.orgName}). Switch back from the Branches tab.
        </p>
      )}
      <PortalOverview businessId={business.id} businessName={business.name} businessSlug={business.slug || business.id} paid={paid} rows={chart} lifetime={lifetime} />
    </>
  )
}