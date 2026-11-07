import { NextResponse } from 'next/server'
import { getActingPortalBusiness } from '@/lib/portal'
import { sniffImage, uploadLogoImage, MAX_LOGO_BYTES } from '@/lib/image-storage'
import { analyseListingImage, saveProductDraft } from '@/lib/ai-listing'
import { categories } from '@/data/categories'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * AI Listing Assistant (web).
 *
 * The seller's photo is stored first and analysed second, so an AI failure
 * never loses their upload — the form keeps the image and falls back to manual
 * entry. Nothing is written to `business_items`; the suggestion is a private
 * draft until the seller submits the product form.
 */
export async function POST(request: Request) {
  const session = await getActingPortalBusiness()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

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

  // Keep the upload even if analysis fails or is unavailable.
  const imageUrl = await uploadLogoImage(bytes)
  if (!imageUrl) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  const result = await analyseListingImage({
    bytes,
    sellerName: session.business.name,
    categories: categories.map((c) => c.name),
  })

  if (!result.ok) {
    return NextResponse.json({
      analysed: false,
      reason: result.reason,
      imageUrl,
      suggestion: null,
      draftId: null,
      message:
        result.reason === 'no_key'
          ? 'AI photo reading is not configured. Fill in the details below.'
          : 'We could not read this photo. Fill in the details below.',
    })
  }

  const draftId = await saveProductDraft({
    businessId: session.business.id,
    suggestion: result.suggestion,
    sourceImageUrls: [imageUrl],
    channel: 'web',
  })

  return NextResponse.json({
    analysed: true,
    imageUrl,
    suggestion: result.suggestion,
    draftId,
  })
}
