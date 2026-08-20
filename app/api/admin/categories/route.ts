import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { isAdmin } from '@/lib/admin-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function computeUsage(supabase: ReturnType<typeof getSupabase>): Promise<Map<string, number>> {
  const usage = new Map<string, number>()
  const { data } = await supabase.from('businesses').select('category')
  for (const b of data || []) {
    for (const c of (b as { category?: string[] }).category || []) {
      usage.set(c, (usage.get(c) || 0) + 1)
    }
  }
  return usage
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const usage = await computeUsage(supabase)
  const rows = (data || []).map(r => ({ ...r, business_count: usage.get(r.name) || 0 }))

  return NextResponse.json({ categories: rows })
}

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { names, icon } = await request.json()
    const list = (Array.isArray(names) ? names : [names])
      .map((n: unknown) => typeof n === 'string' ? n.trim() : '')
      .filter(n => n.length > 0 && n.length <= 60)

    if (list.length === 0) return NextResponse.json({ error: 'No valid names provided' }, { status: 400 })

    const supabase = getSupabase()
    const { data: existing } = await supabase.from('categories').select('name')

    const existingLower = new Set((existing || []).map(r => (r as { name: string }).name.toLowerCase()))
    const fresh = list.filter(n => !existingLower.has(n.toLowerCase()))

    if (fresh.length === 0) return NextResponse.json({ success: true, added: 0, skipped: list.length })

    const rows = fresh.map(n => ({ name: n, icon: icon || '📋', keywords: [], active: true }))
    const { error } = await supabase.from('categories').insert(rows)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidateTag('approved-data')
    return NextResponse.json({ success: true, added: fresh.length, skipped: list.length - fresh.length })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, name, icon, keywords, active } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const supabase = getSupabase()
    const { data: existing } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .single()

    const patch: Record<string, unknown> = {}
    if (name !== undefined) patch.name = name.trim()
    if (icon !== undefined) patch.icon = icon
    if (keywords !== undefined) patch.keywords = keywords
    if (active !== undefined) patch.active = active

    const { error } = await supabase.from('categories').update(patch).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Rename references in businesses (batched by resulting array)
    if (name !== undefined && existing && existing.name !== name.trim()) {
      const { data: businesses } = await supabase.from('businesses').select('id, category')
      const groups = new Map<string, string[]>()
      for (const b of businesses || []) {
        const arr = (b as { category?: string[] }).category || []
        if (arr.includes(existing.name)) {
          const next = JSON.stringify(arr.map((c: string) => (c === existing.name ? name.trim() : c)))
          groups.set(next, [...(groups.get(next) || []), b.id])
        }
      }
      for (const [next, ids] of groups) {
        const { error: updateError } = await supabase
          .from('businesses')
          .update({ category: JSON.parse(next) })
          .in('id', ids)
        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    revalidateTag('approved-data')
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
      .from('categories')
      .select('name')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    const { data: businesses } = await supabase.from('businesses').select('id, category')
    const groups = new Map<string, string[]>()
    for (const b of businesses || []) {
      const arr = (b as { category?: string[] }).category || []
      if (arr.includes(existing.name)) {
        const next = JSON.stringify(arr.filter((c: string) => c !== existing.name))
        groups.set(next, [...(groups.get(next) || []), b.id])
      }
    }
    for (const [next, ids] of groups) {
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ category: JSON.parse(next) })
        .in('id', ids)
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidateTag('approved-data')
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
