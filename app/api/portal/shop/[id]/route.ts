import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getActingPortalBusiness } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'
import { slugify } from '@/lib/utils'
import { imageLuminanceFromUrl } from '@/lib/image-luminance'
import { normalizeAvailability, normalizeCurrency } from '@/lib/products'
import { syncProductEmbedding } from '@/lib/embeddings'

// Image URLs must be https links produced by /api/upload (or be empty).
function sanitizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!/^https:\/\/[^\s]+$/.test(trimmed) || trimmed.length > 2048) return ''
  return trimmed
}

function sanitizeImageList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const urls: string[] = []
  for (const entry of value) {
    const url = sanitizeImageUrl(entry)
    if (url && !seen.has(url)) {
      seen.add(url)
      urls.push(url)
    }
    if (urls.length >= 6) break
  }
  return urls
}

const ALLOWED_STATUS = new Set(['draft', 'active', 'inactive', 'archived'])
const ALLOWED_CONDITION = new Set(['', 'new', 'used', 'refurbished'])
const ALLOWED_PRICE_TYPE = new Set(['fixed', 'on_request'])

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const session = await getActingPortalBusiness()
    if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    const businessId = session.business.id
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Item id is required' }, { status: 400 })

    const updates: Record<string, unknown> = {}

    if (typeof body?.name === 'string') {
      const name = body.name.trim()
      if (name.length < 2 || name.length > 80) {
        return NextResponse.json({ error: 'Item name must be between 2 and 80 characters.' }, { status: 400 })
      }
      updates.name = name
      // Keep the slug in sync when an item is renamed (search + site rendering use it).
      updates.slug = slugify(name) || `item-${Date.now()}`
    }

    if (body?.price_type !== undefined) {
      const priceType = String(body.price_type)
      if (!ALLOWED_PRICE_TYPE.has(priceType)) return NextResponse.json({ error: 'Invalid price type.' }, { status: 400 })
      updates.price_type = priceType
    }
    if (body?.price !== undefined) {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price < 0 || price > 9_999_999) {
        return NextResponse.json({ error: 'Enter a valid price.' }, { status: 400 })
      }
      updates.price = price
    }
    if (updates.price_type === 'on_request') updates.price = 0

    if (body?.currency_code !== undefined) updates.currency_code = normalizeCurrency(body.currency_code)
    if (body?.availability_status !== undefined) {
      updates.availability_status = normalizeAvailability(body.availability_status)
    }
    if (body?.status !== undefined) {
      const status = String(body.status)
      if (!ALLOWED_STATUS.has(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
      updates.status = status
    }
    if (typeof body?.is_active === 'boolean') updates.status = body.is_active ? 'active' : 'inactive'

    if (typeof body?.description === 'string') updates.description = body.description.trim().slice(0, 2000)
    if (typeof body?.category === 'string') updates.category = body.category.trim().slice(0, 60)
    if (typeof body?.subcategory === 'string') updates.subcategory = body.subcategory.trim().slice(0, 60)
    if (typeof body?.brand === 'string') updates.brand = body.brand.trim().slice(0, 60)
    if (typeof body?.item_condition === 'string') {
      const condition = body.item_condition.toLowerCase()
      if (!ALLOWED_CONDITION.has(condition)) return NextResponse.json({ error: 'Invalid condition.' }, { status: 400 })
      updates.item_condition = condition
    }
    if (body?.stock_quantity !== undefined) {
      if (body.stock_quantity === null || body.stock_quantity === '') {
        updates.stock_quantity = null
      } else {
        const qty = Number(body.stock_quantity)
        if (!Number.isInteger(qty) || qty < 0 || qty > 1_000_000) {
          return NextResponse.json({ error: 'Enter a valid stock quantity.' }, { status: 400 })
        }
        updates.stock_quantity = qty
      }
    }

    const images = body?.images !== undefined ? sanitizeImageList(body.images) : null
    if (body?.image_url !== undefined || images) {
      const primary = sanitizeImageUrl(body?.image_url) || images?.[0] || ''
      updates.image_url = primary
      // Clearing or replacing the photo drops/re-bases its luminance too.
      updates.image_luminance = primary ? await imageLuminanceFromUrl(primary) : null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { error } = await supabase.from('business_items').update(updates).eq('id', id).eq('business_id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (images) {
      await supabase.from('business_item_images').delete().eq('item_id', id)
      if (images.length > 0) {
        await supabase.from('business_item_images').insert(
          images.map((url, index) => ({ item_id: id, url, position: index }))
        )
      }
    }

    // Only the fields that build the embedding text trigger a re-embed; a price
    // or stock change must not churn the model call.
    const embeddingDirty = ['name', 'description', 'category', 'subcategory', 'brand', 'item_condition'].some(
      (field) => field in updates
    )
    if (embeddingDirty) {
      await syncProductEmbedding(id).catch(() => false)
    }

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
