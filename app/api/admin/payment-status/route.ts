import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { adminGuard } from '@/lib/admin-auth'

const ALLOWED = new Set(['active', 'pending', 'expired', 'unpaid'])

export async function POST(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const { id, payment_status } = await request.json()

    if (!id || typeof payment_status !== 'string' || !ALLOWED.has(payment_status)) {
      return NextResponse.json({ error: 'Valid id and payment_status (active/pending/expired/unpaid) are required.' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { error } = await supabase
      .from('businesses')
      .update({ payment_status })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
