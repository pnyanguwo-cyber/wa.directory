import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .order('city', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ areas: data || [] })
}

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { city, names } = await request.json()
    if (!city || typeof city !== 'string') {
      return NextResponse.json({ error: 'City is required' }, { status: 400 })
    }
    const cleanCity = city.trim()

    const list = (Array.isArray(names) ? names : [names])
      .map((n: unknown) => typeof n === 'string' ? n.trim() : '')
      .filter(n => n.length > 0 && n.length <= 60)

    if (list.length === 0) return NextResponse.json({ error: 'No valid names provided' }, { status: 400 })

    const supabase = getSupabase()
    const { data: existing } = await supabase
      .from('areas')
      .select('name')
      .eq('city', cleanCity)

    const existingLower = new Set((existing || []).map(r => (r as { name: string }).name.toLowerCase()))
    const fresh = list.filter(n => !existingLower.has(n.toLowerCase()))

    if (fresh.length === 0) return NextResponse.json({ success: true, added: 0, skipped: list.length })

    const rows = fresh.map(n => ({ city: cleanCity, name: n, active: true }))
    const { error } = await supabase.from('areas').insert(rows)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, added: fresh.length, skipped: list.length - fresh.length })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, city, name, active } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const supabase = getSupabase()
    const { data: existing } = await supabase
      .from('areas')
      .select('city, name')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Area not found' }, { status: 404 })

    const patch: Record<string, unknown> = {}
    if (city !== undefined) patch.city = city.trim()
    if (name !== undefined) patch.name = name.trim()
    if (active !== undefined) patch.active = active

    const { error } = await supabase.from('areas').update(patch).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Rename references in businesses' areas arrays (scoped to the old city)
    if (name !== undefined && existing.name !== name.trim()) {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, city, areas')
        .eq('city', existing.city)

      for (const b of businesses || []) {
        const arr = (b as { areas?: string[] }).areas || []
        if (arr.includes(existing.name)) {
          await supabase
            .from('businesses')
            .update({ areas: arr.map((a: string) => (a === existing.name ? name.trim() : a)) })
            .eq('id', b.id)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const supabase = getSupabase()
    const { data: existing } = await supabase
      .from('areas')
      .select('city, name')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Area not found' }, { status: 404 })

    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, city, areas')
      .eq('city', existing.city)

    for (const b of businesses || []) {
      const arr = (b as { areas?: string[] }).areas || []
      if (arr.includes(existing.name)) {
        await supabase
          .from('businesses')
          .update({ areas: arr.filter((a: string) => a !== existing.name) })
          .eq('id', b.id)
      }
    }

    const { error } = await supabase.from('areas').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
