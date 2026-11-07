import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getActingPortalBusiness } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'
import { slugify } from '@/lib/utils'
import { imageLuminanceFromUrl } from '@/lib/image-luminance'
import { validateProductInput } from '@/lib/products'
import { syncProductEmbedding } from '@/lib/embeddings'

const ITEM_COLUMNS =
  'id, business_id, name, slug, price, description, category, subcategory, brand, item_condition, ' +
  'currency_code, price_type, availability_status, status, stock_quantity, image_url, image_luminance, ' +
  'is_active, ai_generated, published_at, created_at, updated_at'

// Image URLs must be https links produced by /api/upload (or be empty).
function sanitizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!/^https:\/\/[^\s]+$/.test(trimmed) || trimmed.length > 2048) return ''
  return trimmed
}

function sanitizeImageList(body: Record<string, unknown>): string[] {
  if (!Array.isArray(body.images)) return []
  const seen = new Set<string>()
  const urls: string[] = []
  for (const entry of body.images) {
    const url = sanitizeImageUrl(entry)
    if (url && !seen.has(url)) {
      seen.add(url)
      urls.push(url)
    }
    if (urls.length >= 6) break
  }
  return urls
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
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const session = await getActingPortalBusiness()
    if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    // Seller identity is always derived from the signed cookie, never the body.
    const businessId = session.business.id

    const images = sanitizeImageList(body)
    const image_url = sanitizeImageUrl(body?.image_url) || images[0] || ''

    const validation = validateProductInput({
      name: typeof body?.name === 'string' ? body.name : '',
      description: typeof body?.description === 'string' ? body.description : '',
      price: Number(body?.price),
      currency_code: typeof body?.currency_code === 'string' ? body.currency_code : 'USD',
      price_type: typeof body?.price_type === 'string' ? body.price_type : 'fixed',
      availability_status: typeof body?.availability_status === 'string' ? body.availability_status : '',
      stock_quantity: (body?.stock_quantity as number | null) ?? null,
      category: typeof body?.category === 'string' ? body.category : '',
      subcategory: typeof body?.subcategory === 'string' ? body.subcategory : '',
      brand: typeof body?.brand === 'string' ? body.brand : '',
      item_condition: typeof body?.item_condition === 'string' ? body.item_condition : '',
      // Existing clients never sent a status: keep their "publish immediately"
      // behaviour instead of silently drafting their listing.
      status: typeof body?.status === 'string' ? body.status : 'active',
      image_url,
      ai_generated: body?.ai_generated === true,
    })
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
    const product = validation.value

    const supabase = getSupabase()
    // Luminance is computed at save-time so the site hero knows its scrim
    // tier instantly (never decoded at render time).
    const imageLuminance = image_url ? await imageLuminanceFromUrl(image_url) : null

    const { data, error } = await supabase
      .from('business_items')
      .insert({
        business_id: businessId,
        name: product.name,
        slug: slugify(product.name) || `item-${Date.now()}`,
        price: product.price,
        description: product.description,
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brand,
        item_condition: product.item_condition,
        currency_code: product.currency_code,
        price_type: product.price_type,
        availability_status: product.availability_status,
        stock_quantity: product.stock_quantity,
        status: product.status,
        ai_generated: product.ai_generated,
        image_url: product.image_url,
        image_luminance: imageLuminance,
      })
      .select(ITEM_COLUMNS)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Gallery rows mirror the ordered image list; image_url stays the primary.
    const insertedId = (data as { id?: string } | null)?.id
    if (images.length > 0 && insertedId) {
      await supabase.from('business_item_images').insert(
        images.map((url, index) => ({ item_id: insertedId, url, position: index }))
      )
    }

    // Embed the product so photo search can find it later. Best effort: a
    // failed embedding must never fail the seller's save.
    if (insertedId) {
      await syncProductEmbedding(insertedId).catch(() => false)
    }

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
