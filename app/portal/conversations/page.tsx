import { redirect } from 'next/navigation'
import { getPortalBusiness, isPaidSubscriber } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'
import PortalConversations from '@/components/portal/conversations'

export const dynamic = 'force-dynamic'

export default async function PortalConversationsPage() {
  const business = await getPortalBusiness()
  if (!business) redirect('/login')

  const paid = await isPaidSubscriber(business.id)
  if (!paid) redirect('/portal/billing')

  const { data: logs } = await getSupabase()
    .from('chat_logs')
    .select('id, customer_phone, messages, found_via, created_at, updated_at')
    .eq('business_id', business.id)
    .order('updated_at', { ascending: false })
    .limit(200)

  const customers = (logs || []).map(log => {
    const messages = Array.isArray(log.messages) ? log.messages : []
    const last = messages.length ? messages[messages.length - 1] : null
    return {
      id: log.id,
      phone: log.customer_phone,
      foundVia: log.found_via || '',
      messages,
      lastText: last && typeof last === 'object' ? String((last as any).text || '') : '',
      lastAt: log.updated_at,
      startedAt: log.created_at,
    }
  })

  return <PortalConversations customers={customers} />
}