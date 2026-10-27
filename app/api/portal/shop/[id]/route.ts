import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getActingPortalBusiness } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'
import { slugify } from '@/lib/utils'
import { imageLuminanceFromUrl } from '@/lib/image-luminance'

// Image URLs must be https links produced by /api/upload (or be empty).
function sanitizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!/^https:\/\/[^\s]+$/.test(trimmed) || trimmed.length > 2048) return ''
  return trimmed
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}))
    const session = await getActingPortalBusiness()
    if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    const businessId = session.business.id
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Item id is required' }, { status: 400 })

    const updates: { name?: string; price?: number; slug?: string; image_url?: string; image_luminance?: number | null; is_active?: boolean } = {}
    if (typeof body?.name === 'string') {
      const name = body.name.trim()
      if (name.length < 2 || name.length > 80) {
        return NextResponse.json({ error: 'Item name must be between 2 and 80 characters.' }, { status: 400 })
      }
      updates.name = name
      // Keep the slug in sync when an item is renamed (search + site rendering use it).
      updates.slug = slugify(name) || `item-${Date.now()}`
    }
    if (body?.price !== undefined) {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price < 0 || price > 999999) {
        return NextResponse.json({ error: 'Enter a valid price.' }, { status: 400 })
      }
      updates.price = price
    }
    if (body?.image_url !== undefined) {
      updates.image_url = sanitizeImageUrl(body.image_url)
      // Clearing or replacing the photo drops/re-bases its luminance too.
      updates.image_luminance = updates.image_url ? await imageLuminanceFromUrl(updates.image_url) : null
    }
    if (typeof body?.is_active === 'boolean') updates.is_active = body.is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { error } = await supabase.from('business_items').update(updates).eq('id', id).eq('business_id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Shop items render on the profile + auto-site (both ISR) — refresh them now.
    const slug = session.business.slug
    if (slug) {
      revalidatePath(`/business/${slug}`)
      revalidatePath(`/site/${slug}`)
    }

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

    // Shop items render on the profile + auto-site (both ISR) — refresh them now.
    const slug = session.business.slug
    if (slug) {
      revalidatePath(`/business/${slug}`)
      revalidatePath(`/site/${slug}`)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
