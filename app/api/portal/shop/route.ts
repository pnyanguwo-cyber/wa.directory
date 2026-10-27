import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getActingPortalBusiness } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'
import { slugify } from '@/lib/utils'
import { imageLuminanceFromUrl } from '@/lib/image-luminance'

const ITEM_COLUMNS = 'id, business_id, name, slug, price, image_url, image_luminance, is_active, created_at, updated_at'

// Image URLs must be https links produced by /api/upload (or be empty).
function sanitizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!/^https:\/\/[^\s]+$/.test(trimmed) || trimmed.length > 2048) return ''
  return trimmed
}

export async function GET() {
  const session = await getActingPortalBusiness()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  const businessId = session.business.id

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('business_items')
    .select(ITEM_COLUMNS)
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
    const image_url = sanitizeImageUrl(body?.image_url)

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'Item name must be between 2 and 80 characters.' }, { status: 400 })
    }
    if (!Number.isFinite(price) || price < 0 || price > 999999) {
      return NextResponse.json({ error: 'Enter a valid price.' }, { status: 400 })
    }

    const supabase = getSupabase()
    // Luminance is computed at save-time so the site hero knows its scrim
    // tier instantly (never decoded at render time).
    const imageLuminance = image_url ? await imageLuminanceFromUrl(image_url) : null
    const { data, error } = await supabase
      .from('business_items')
      .insert({
        business_id: businessId,
        name,
        slug: slugify(name) || `item-${Date.now()}`,
        price,
        image_url,
        image_luminance: imageLuminance,
        is_active,
      })
      .select(ITEM_COLUMNS)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Shop items render on the profile + auto-site (both ISR) — refresh them now.
    const slug = session.business.slug
    if (slug) {
      revalidatePath(`/business/${slug}`)
      revalidatePath(`/site/${slug}`)
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
