import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import bcrypt from 'bcryptjs'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { data: accounts } = await supabase
    .from('business_accounts')
    .select('id, business_id, disabled, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  const ids = [...new Set((accounts || []).map(a => a.business_id))]
  const { data: businesses } = ids.length
    ? await supabase.from('businesses').select('id, name, slug, phone').in('id', ids)
    : { data: [] }

  const bizById = new Map((businesses || []).map(b => [b.id, b]))

  return NextResponse.json({
    accounts: (accounts || []).map(a => ({ ...a, business: bizById.get(a.business_id) || null })),
  })
}

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const supabase = getSupabase()

    if (body.action === 'reset') {
      const { account_id, new_password } = body
      if (!account_id) return NextResponse.json({ error: 'account_id is required' }, { status: 400 })
      if (!new_password || new_password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }

      const password_hash = await bcrypt.hash(new_password, 10)
      const { error } = await supabase
        .from('business_accounts')
        .update({ password_hash, otp_hash: '', otp_expires_at: null, disabled: false })
        .eq('id', account_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const { data: account } = await supabase
        .from('business_accounts')
        .select('business_id')
        .eq('id', account_id)
        .maybeSingle()
      if (account) {
        const { data: business } = await supabase
          .from('businesses')
          .select('phone')
          .eq('id', account.business_id)
          .maybeSingle()
        if (business?.phone) {
          sendWhatsAppMessage(
            business.phone,
            [
              '🔑 *Your WA Directory password was reset*',
              '',
              `New password: ${new_password}`,
              'Log in at ' + (process.env.SITE_URL || 'https://wadirectory.co.zw') + '/login and change it if you wish.',
            ].join('\n')
          ).catch(() => {})
        }
      }
      return NextResponse.json({ success: true })
    }

    if (body.action === 'toggle') {
      const { account_id, disabled } = body
      if (!account_id) return NextResponse.json({ error: 'account_id is required' }, { status: 400 })
      const { error } = await supabase
        .from('business_accounts')
        .update({ disabled: !!disabled })
        .eq('id', account_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}