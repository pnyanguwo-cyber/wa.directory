import { NextResponse } from 'next/server'
import { sniffImage, MAX_LOGO_BYTES } from '@/lib/image-storage'
import { analyseSearchReference, type SearchReference } from '@/lib/ai-listing'
import { searchProducts, searchProductsHybrid } from '@/lib/products'
import { categories } from '@/data/categories'
import { allow, clientKey } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SEARCH_LIMIT = 10
const SEARCH_WINDOW_MS = 60_000

/**
 * Visual product search (web + WhatsApp).
 *
 * The photo is a SEARCH REFERENCE. It is analysed in memory, never stored, and
 * never turned into a listing draft. Results are ordinary product search hits,
 * so the same eligibility gates apply as text search.
 *
 * Two passes: the vision query runs through text search first (exact recall),
 * then the photo description is embedded and similar products are appended
 * (see migration 034). Without an embedding key this is text search only.
 */

const MAX_RESULTS = 18

/** Embedding input: the recognised phrase plus what the camera actually saw. */
function semanticText(reference: SearchReference): string {
  return [
    reference.query,
    reference.category ? `Category: ${reference.category}` : '',
    reference.attributes.join(', '),
    reference.visual_description,
  ]
    .filter(Boolean)
    .join('. ')
}
export async function POST(request: Request) {
  if (!allow(clientKey(request, 'product-image-search'), SEARCH_LIMIT, SEARCH_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many photo searches. Please wait a minute and try again.' }, { status: 429 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No photo provided' }, { status: 400 })
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: 'Photo too large (max 2MB)' }, { status: 400 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!sniffImage(bytes)) {
    return NextResponse.json({ error: 'Only PNG, JPEG or WebP photos are allowed' }, { status: 400 })
  }

  const reference = await analyseSearchReference(bytes, categories.map((c) => c.name))
  if (!reference) {
    return NextResponse.json(
      {
        error: 'We could not read that photo. Try a clearer picture, or type what you are looking for.',
        code: 'vision_unavailable',
      },
      { status: 503 }
    )
  }

  if (!reference.query) {
    return NextResponse.json({
      interpretation: reference,
      products: [],
      total: 0,
      message: 'We could not recognise a product in that photo. Try a clearer picture, or search by name.',
    })
  }

  // Two passes in one call: keyword hits on the recognised phrase first, then
  // semantic neighbours of the photo description (migration 034). Exact matches
  // are never demoted below similar ones.
  const text = semanticText(reference)
  let { products, total, match_mode: matchMode } = await searchProductsHybrid(
    { q: reference.query, category: reference.category || undefined, limit: 12 },
    text
  )

  // Last resort when embeddings are unavailable (or found nothing): the phrase
  // may be too specific for a small catalogue, so use the visible attributes.
  if (products.length === 0 && (reference.category || reference.attributes.length)) {
    const fallback = await searchProducts({
      q: reference.attributes.join(' ') || undefined,
      category: reference.category || undefined,
      limit: 12,
    })
    products = fallback.products
    total = fallback.total
  }

  products = products.slice(0, MAX_RESULTS)
  total = products.length

  const message = products.length === 0
    ? 'No matching products yet. Try a different photo or search by name.'
    : matchMode === 'semantic'
      ? 'No exact match. These are the closest items local sellers have listed.'
      : undefined

  return NextResponse.json({ interpretation: reference, products, total, match_mode: matchMode, message })
}
