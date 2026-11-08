import { redirect } from 'next/navigation'
import { getPortalActor, listOrgBranches } from '@/lib/org-auth'
import { getOrgDashboardStats } from '@/lib/portal'
import PortalBusinesses from '@/components/portal/businesses'

export const dynamic = 'force-dynamic'

export default async function PortalBusinessesPage() {
  const actor = await getPortalActor()
  if (!actor) redirect('/login')

  // Only HQ can access the multi-business management page
  if (actor.role !== 'org-hq') redirect('/portal')

  const branches = await listOrgBranches(actor.orgId)
  const orgStats = await getOrgDashboardStats(branches)

  return (
    <PortalBusinesses
      orgName={actor.orgName}
      branches={branches}
      totals={orgStats}
      currentBusinessId={actor.business.id}
    />
  )
}