import { NextResponse } from 'next/server'
import { getActingPortalBusiness } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}))
    const session = await getActingPortalBusiness()
    if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    const businessId = session.business.id
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Item id is required' }, { status: 400 })

    const updates: { name?: string; price?: number; is_active?: boolean } = {}
    if (typeof body?.name === 'string') {
      const name = body.name.trim()
      if (name.length < 2 || name.length > 80) {
        return NextResponse.json({ error: 'Item name must be between 2 and 80 characters.' }, { status: 400 })
      }
      updates.name = name
    }
    if (body?.price !== undefined) {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price < 0 || price > 999999) {
        return NextResponse.json({ error: 'Enter a valid price.' }, { status: 400 })
      }
      updates.price = price
    }
    if (typeof body?.is_active === 'boolean') updates.is_active = body.is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { error } = await supabase.from('business_items').update(updates).eq('id', id).eq('business_id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getActingPortalBusiness()
    if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    const businessId = session.business.id
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Item id is required' }, { status: 400 })

    const supabase = getSupabase()
    const { error } = await supabase.from('business_items').delete().eq('id', id).eq('business_id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
