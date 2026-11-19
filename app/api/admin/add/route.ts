import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin-auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { digitsOnly } from '@/lib/phone'
import { slugify, dedupeCategories } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, category, phone, whatsapp_username, city, area, bio, price_range, whatsapp_link, catalog_link, logo_url, verified, address, show_location, featured_eligible, owner_phone, voice_phone, requested_category } = body

    if (!name || !category || !phone) {
      return NextResponse.json({ error: 'Name, category, and phone are required' }, { status: 400 })
    }

    // When an admin adds a business for someone else, that owner's number — not
    // the admin's — must be the listing's phone, so every cart and order reply
    // reaches the person who actually runs the business.
    const ownerDigits = digitsOnly(String(owner_phone || ''))
    const listingPhone = ownerDigits ? `+${ownerDigits}` : phone

    const slug = slugify(name)

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        name,
        slug,
        whatsapp_username: whatsapp_username || null,
        category: dedupeCategories(category),
        phone: listingPhone,
        voice_phone: digitsOnly(String(voice_phone || '')) ? `+${digitsOnly(String(voice_phone))}` : null,
        requested_category: requested_category || null,
        // Owners complete the portal setup themselves from this token.
        ...(ownerDigits ? { edit_token: crypto.randomUUID() } : {}),
        city: city || null,
        area: area || null,
        bio: bio || null,
        price_range: price_range || null,
        whatsapp_link: whatsapp_link || null,
        catalog_link: catalog_link || null,
        logo_url: logo_url || null,
        verified: verified ?? true,
        location: city || '',
        address: address || '',
        show_location: show_location !== false,
        featured_eligible: featured_eligible !== false,
      })
      .select('id, edit_token, slug')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Hand the listing to its owner: they finish the same stages (portal
    // password, details, site) from the links we send, and from then on the
    // cart and every order reply belong to their number.
    if (ownerDigits && data?.edit_token) {
      const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
      sendWhatsAppMessage(
        `+${ownerDigits}`,
        [
          `🏪 *${name}* has been added on WA Directory for you.`,
          '',
          'Finish the last steps so the listing is yours to control:',
          `Set your portal password: ${siteUrl}/account-setup?token=${data.edit_token}`,
          `Edit your details: ${siteUrl}/edit?token=${data.edit_token}`,
          '',
          'Customers\' cart and order replies will come to this number.',
        ].join('\n')
      ).catch(() => {})
    }

    return NextResponse.json({ success: true, id: data.id, owner_invited: Boolean(ownerDigits && data?.edit_token) })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
