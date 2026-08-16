import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public endpoint: businesses request a new category or area while listing/editing
export async function POST(request: Request) {
  try {
    const { type, name, city, business_id } = await request.json()

    if (!['category', 'area'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
      return NextResponse.json({ error: 'Name must be 2-60 characters' }, { status: 400 })
    }
    if (!business_id || typeof business_id !== 'string') {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }
    if (type === 'area' && (!city || typeof city !== 'string')) {
      return NextResponse.json({ error: 'City is required for area requests' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const cleanName = name.trim()
    const cleanCity = (city || '').trim()

    const { data: existing } = await supabase
      .from('feature_requests')
      .select('id, status')
      .eq('business_id', business_id)
      .eq('type', type)
      .ilike('name', cleanName)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, id: existing.id, status: existing.status })
    }

    const { data, error } = await supabase
      .from('feature_requests')
      .insert({ type, name: cleanName, city: cleanCity, business_id, status: 'pending' })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id, status: 'pending' })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
