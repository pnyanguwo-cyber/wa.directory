import { NextResponse } from 'next/server'
import { getActingPortalBusiness } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'
import { slugify } from '@/lib/utils'

export async function GET() {
  const session = await getActingPortalBusiness()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  const businessId = session.business.id

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('business_items')
    .select('id, business_id, name, slug, price, is_active, created_at, updated_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const session = await getActingPortalBusiness()
    if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    const businessId = session.business.id

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const price = Number(body?.price)
    const is_active = body?.is_active !== false

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'Item name must be between 2 and 80 characters.' }, { status: 400 })
    }
    if (!Number.isFinite(price) || price < 0 || price > 999999) {
      return NextResponse.json({ error: 'Enter a valid price.' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('business_items')
      .insert({
        business_id: businessId,
        name,
        slug: slugify(name) || `item-${Date.now()}`,
        price,
        is_active,
      })
      .select('id, business_id, name, slug, price, is_active, created_at, updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
