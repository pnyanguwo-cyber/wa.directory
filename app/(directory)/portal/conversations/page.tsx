import { redirect } from 'next/navigation'
import { getActingPortalBusiness, isPaidSubscriber } from '@/lib/portal'
import PortalConversations from '@/components/portal/conversations'

export const dynamic = 'force-dynamic'

export default async function PortalConversationsPage({
  searchParams,
}: {
  searchParams: { branch?: string; chat?: string }
}) {
  // HQ can read a branch's conversations via ?branch=<id> (org-scoped guard).
  const session = await getActingPortalBusiness(searchParams?.branch)
  if (!session) redirect('/login')

  const paid = await isPaidSubscriber(session.business.id)
  if (!paid) redirect('/portal/billing')

  return <PortalConversations branchId={searchParams?.branch} initialPhone={searchParams?.chat} />
}
