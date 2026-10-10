import { redirect } from 'next/navigation'
import { getPortalActor, listOrgBranches, listPendingBranchInvites, getOrgDefaults } from '@/lib/org-auth'
import { getOrgDashboardStats, getLifetimeTotals } from '@/lib/portal'
import { getApprovedCategories, getApprovedCities } from '@/lib/approved-data'
import { getSupabase } from '@/lib/supabase-server'
import OrgBranches from '@/components/portal/org-branches'
import AddBranchForm from '@/components/portal/add-branch-form'
import OrgDefaultsEditor from '@/components/portal/org-defaults'
import PendingBranchInvites, { type PendingInvite } from '@/components/portal/pending-branch-invites'
import type { BranchRow } from '@/components/portal/org-branches'

export const dynamic = 'force-dynamic'

export default async function PortalBranchesPage() {
  const actor = await getPortalActor()
  if (!actor) redirect('/login')
  // HQ-only page: branches must never see org-wide data. Deep-links fall
  // back to the ordinary overview.
  if (actor.role !== 'org-hq') redirect('/portal')

  const [branches, pending, approvedCategories, approvedCities, defaults] = await Promise.all([
    listOrgBranches(actor.orgId),
    listPendingBranchInvites(actor.orgId),
    getApprovedCategories(),
    getApprovedCities(),
    getOrgDefaults(actor.orgId),
  ])

  // Which pending branches already claimed their portal account? Resend only
  // makes sense for unclaimed ones, but we surface the state either way.
  const claimed = new Set<string>()
  if (pending.length > 0) {
    const { data: accounts } = await getSupabase()
      .from('business_accounts')
      .select('business_id')
      .in('business_id', pending.map(b => b.id))
    for (const a of accounts || []) claimed.add(a.business_id)
  }

  const { perBranch, orgTotals } = await getOrgDashboardStats(branches)

  // Lifetime views per branch for the table.
  const lifetimeRows = await Promise.all(
    branches.map(async b => {
      const totals = await getLifetimeTotals(b.id)
      return totals['profile_view'] || 0
    })
  )

  const rows: BranchRow[] = branches.map((b, i) => ({
    id: b.id,
    name: b.name,
    slug: b.slug || null,
    city: b.city || '',
    area: b.area || '',
    phone: b.phone || '',
    isHq: b.is_hq === true,
    branchLabel: b.branch_label || '',
    verified: b.verified === true,
    views7d: perBranch[b.id]?.views === undefined ? 0 : perBranch[b.id]!.views,
    chats7d: perBranch[b.id]?.chats === undefined ? 0 : perBranch[b.id]!.chats,
    lifetimeViews: lifetimeRows[i] || 0,
  }))

  const invites: PendingInvite[] = pending.map(b => ({
    id: b.id,
    name: b.name,
    phone: b.phone,
    branchLabel: b.branch_label || '',
    city: b.city || '',
    createdAt: String(b.created_at || ''),
    claimed: claimed.has(b.id),
  }))

  // Locations with no logo yet (drives the retrofill button count).
  const missingLogoCount = branches.filter(b => !b.logo_url).length

  return (
    <div className="space-y-6">
      <OrgDefaultsEditor
        orgName={actor.orgName}
        defaults={defaults}
        categoryOptions={approvedCategories.map(c => ({ value: c.name, label: `${c.icon} ${c.name}` }))}
        missingLogoCount={missingLogoCount}
      />

      <div className="flex items-start justify-between gap-3">
        <div />
        <AddBranchForm
          orgName={actor.orgName}
          categoryOptions={approvedCategories.map(c => ({ value: c.name, label: `${c.icon} ${c.name}` }))}
          cityOptions={approvedCities.map(c => c.name)}
          defaults={{
            defaultLogoUrl: defaults.defaultLogoUrl,
            defaultCategories: defaults.defaultCategories,
            bioTemplate: defaults.bioTemplate,
          }}
        />
      </div>

      <PendingBranchInvites invites={invites} />

      <OrgBranches
        orgName={actor.orgName}
        branches={rows}
        totals={orgTotals}
      />
    </div>
  )
}
