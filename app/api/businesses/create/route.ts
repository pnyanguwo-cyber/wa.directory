import { NextResponse } from 'next/server'
import { createListing } from '@/lib/listing-create'

// Thin JSON wrapper around the shared listing engine (lib/listing-create.ts)
// so the webapp form and the WhatsApp bot follow the exact same DB rules.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await createListing({
      ...body,
      phoneType: body.phone_type,
      voicePhone: body.voice_phone,
      pendingCity: body.pending_city,
      isRemote: body.is_remote,
      catalogLink: body.catalog_link,
      logoUrl: body.logo_url,
      priceRange: body.price_range,
      addressVerified: body.address_verified,
      showLocation: body.show_location,
      generateSite: body.generate_site,
      siteContactEmail: body.site_contact_email,
      whatsappUsername: body.whatsapp_username,
      requestedUsername: body.username,
    })
    if ('error' in result) {
      return NextResponse.json(result, { status: result.error.startsWith('Could not create') ? 500 : 400 })
    }
    return NextResponse.json({
      id: result.id,
      slug: result.slug,
      edit_token: result.editToken,
      business_id: result.businessId,
      username: result.username,
      payment_status: result.pendingPayment ? 'pending' : 'active',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request. Please check your details and try again.' }, { status: 400 })
  }
}
