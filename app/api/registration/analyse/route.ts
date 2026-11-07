import { NextResponse } from 'next/server'
import { sniffImage, uploadLogoImage, MAX_LOGO_BYTES } from '@/lib/image-storage'
import {
  analyseBusinessMaterial,
  findDuplicateCandidates,
  saveRegistrationDraft,
  toPrefill,
} from '@/lib/ai-registration'
import { categories } from '@/data/categories'
import { allow, clientKey } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_IMAGES = 4
const ANALYSE_LIMIT = 8
const ANALYSE_WINDOW_MS = 60_000

/**
 * AI-assisted business registration (web).
 *
 * Public by necessity — registration is public — and rate limited. The result
 * is a *prefill*, never a business: the owner still reviews the form and
 * submits through /api/businesses/create, which keeps the existing
 * verification, payment and activation gates authoritative.
 *
 * Multiple images (front/back of a card, banner + flyer) are analysed as one
 * draft so fields are combined rather than duplicated.
 */
export async function POST(request: Request) {
  if (!allow(clientKey(request, 'registration-analyse'), ANALYSE_LIMIT, ANALYSE_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a minute, or continue without an image.' },
      { status: 429 }
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const files = form.getAll('file').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Upload up to ${MAX_IMAGES} images.` }, { status: 400 })
  }

  const accepted: File[] = []
  for (const file of files) {
    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ error: 'Each image must be 2MB or smaller.' }, { status: 400 })
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!sniffImage(bytes)) {
      return NextResponse.json({ error: 'Only PNG, JPEG or WebP images are allowed.' }, { status: 400 })
    }
    accepted.push(file)
  }

  const imageBytes: Uint8Array[] = []
  for (const file of accepted) imageBytes.push(new Uint8Array(await file.arrayBuffer()))

  const outcome = await analyseBusinessMaterial(imageBytes, categories.map((c) => c.name))
  if (!outcome.ok) {
    return NextResponse.json({
      analysed: false,
      reason: outcome.reason,
      message:
        outcome.reason === 'no_key'
          ? 'AI reading is not configured right now. Continue with the questions.'
          : 'We could not read that image. Continue with the questions, or try a clearer picture.',
      prefill: null,
    })
  }

  // Keep the uploaded material (the owner may want to reuse the logo/banner)
  // and record it against the draft rather than a published profile.
  const uploadedUrls: string[] = []
  for (let index = 0; index < imageBytes.length; index += 1) {
    const url = await uploadLogoImage(imageBytes[index])
    if (url) uploadedUrls.push(url)
  }

  const duplicates = await findDuplicateCandidates({
    name: outcome.draft.fields.business_name.value,
    phone: outcome.draft.fields.phone.value,
    city: outcome.draft.fields.city.value,
  })

  const draftId = await saveRegistrationDraft({
    draft: outcome.draft,
    sourceImageUrls: uploadedUrls,
    duplicateCandidates: duplicates,
    channel: 'web',
  })

  return NextResponse.json({
    analysed: true,
    draftId,
    prefill: toPrefill(outcome.draft),
    fields: outcome.draft.fields,
    missing_required_fields: outcome.draft.missing_required_fields,
    next_questions: outcome.draft.next_questions,
    warnings: outcome.draft.warnings,
    duplicates,
    imageUrls: uploadedUrls,
  })
}
