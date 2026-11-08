// Portal access lines for owner WhatsApp messages.
//
// Businesses that register through the WhatsApp bot never pick a password, so
// a bare "log in with @username" line leaves them locked out of
// /portal. When no account exists yet, send the account-setup link (same
// edit_token flow the web listing form uses) instead of a login reminder.
// Used by both go-live paths: admin approval and payment activation.

import type { getSupabase } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/site-url'

type Supabase = NonNullable<ReturnType<typeof getSupabase>>

export async function portalAccessLines(
  supabase: Supabase,
  biz: { id: string; username?: string | null; editToken?: string | null }
): Promise<string[]> {
  const usernameLine = biz.username
    ? `🔑 Portal: ${SITE_URL}/portal (log in with @${biz.username})`
    : `🔑 Portal: ${SITE_URL}/portal`

  try {
    const { data: account } = await supabase
      .from('business_accounts')
      .select('id')
      .eq('business_id', biz.id)
      .maybeSingle()
    if (account) return [usernameLine]

    let editToken = biz.editToken || ''
    if (!editToken) {
      const { data: row } = await supabase
        .from('businesses')
        .select('edit_token')
        .eq('id', biz.id)
        .maybeSingle()
      editToken = (row as { edit_token?: string | null } | null)?.edit_token || ''
    }
    if (!editToken) return [usernameLine]

    return [
      `🔐 Create your portal password (stats, conversations, ranking): ${SITE_URL}/account-setup?token=${editToken}`,
      `✏️ Edit your listing: ${SITE_URL}/edit?token=${editToken}`,
    ]
  } catch {
    return [usernameLine]
  }
}
