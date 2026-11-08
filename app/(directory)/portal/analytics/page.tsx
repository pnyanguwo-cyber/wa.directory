import { redirect } from 'next/navigation'
import { getActingPortalBusiness, isPaidSubscriber } from '@/lib/portal'
import AnalyticsPanel from '@/components/portal/analytics-view'

export const dynamic = 'force-dynamic'

export default async function PortalAnalyticsPage({
  searchParams,
}: {
  searchParams: { branch?: string }
}) {
  const session = await getActingPortalBusiness(searchParams?.branch)
  if (!session) redirect('/login')

  const paid = await isPaidSubscriber(session.business.id)
  if (!paid) redirect('/portal/billing')

  return (
    <AnalyticsPanel
      endpoint="/api/portal/analytics"
      branchId={searchParams?.branch}
      title="Analytics"
      subtitle="How customers reach you, what they ask, and how quickly the bot replies."
    />
  )
}
