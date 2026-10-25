import { getSupabase } from '@/lib/supabase-server'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import { categories as staticCategories } from '@/data/categories'
import { toFullPhone, normalizeVoicePhone } from '@/lib/phone'
import { generateBusinessId } from '@/lib/business-id'
import { normalizeUsername, suggestUsername } from '@/lib/username'
import { generateSiteContent } from '@/lib/site-generation'
import { SITE_URL } from '@/lib/site-url'
import { slugify } from '@/lib/utils'

// Yellow Pages (special public-service) categories get a priority admin alert
// so councils/police/fire listings are verified fast.
const SPECIAL_CATEGORIES = new Set(staticCategories.filter(c => c.special).map(c => c.name))

const WA_MSG = 'Hi%2C%20I%20found%20you%20on%20WA%20Directory'

export interface ListingInput {
  name: string
  countryCode?: string
  phone: string
  phoneType?: string
  voicePhone?: string
  categories: string[]
  city?: string
  pendingCity?: boolean
  areas?: string[]
  isRemote?: boolean
  catalogLink?: string
  logoUrl?: string
  priceRange?: string
  website?: string
  address?: string
  showLocation?: boolean
  lat?: number
  lng?: number
  addressVerified?: boolean
  generateSite?: boolean
  siteContactEmail?: string
  whatsappUsername?: string
  requestedUsername?: string
  /** Up to 3 social links (personal contacts): handles or plain URLs. */
  socials?: string[]
  bio?: string
  description?: string
  notify?: boolean
}

export interface ListingResult {
  id: string
  slug: string
  name: string
  businessId: string
  username: string
  editToken: string
  categories: string[]
  city: string
  isYellowPages: boolean
  pendingPayment: boolean
}

export interface ListingError {
  error: string
}

// Core listing creation shared by the webapp (/api/businesses/create) and the
// WhatsApp bot: identical validation, identical DB rules (service role,
// verified: false until an admin approves), identical confirmations.
export async function createListing(body: Partial<ListingInput>): Promise<ListingResult | ListingError> {
  const { name } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    return { error: 'A business name between 2 and 80 characters is required.' }
  }

  if (!Array.isArray(body.categories) || body.categories.length === 0 || body.categories.length > 4 ||
      !body.categories.every((c: unknown) => typeof c === 'string')) {
    return { error: 'Select at least one category.' }
  }

  if (!body.phone || typeof body.phone !== 'string') {
    return { error: 'A WhatsApp phone number is required.' }
  }
  const code = typeof body.countryCode === 'string' && body.countryCode.startsWith('+') ? body.countryCode : '+263'
  const isVoice = body.phoneType === 'voice'
  const fullPhone = isVoice ? normalizeVoicePhone(body.phone) : toFullPhone(code, body.phone)
  if (fullPhone.length < (isVoice ? 3 : 10) || fullPhone.length > 15) {
    return { error: 'That phone number looks invalid for the selected country code.' }
  }

  const validCityNames = new Set(zimbabweCities.map(c => c.name))
  const isRemote = body.isRemote === true || (typeof body.city === 'string' && (body.city === 'remote' || body.city === '*'))
  const isPendingCity = body.pendingCity === true && typeof body.city === 'string' && body.city.trim().length > 0 && body.city !== 'remote' && body.city !== '*'
  const cleanCity = typeof body.city === 'string'
    ? (isRemote ? '' : validCityNames.has(body.city) ? body.city : isPendingCity ? body.city.trim() : '')
    : ''

  const voicePhoneInput = typeof body.voicePhone === 'string' ? body.voicePhone.trim() : ''
  const cleanVoicePhone = voicePhoneInput && !isVoice ? normalizeVoicePhone(voicePhoneInput) : null

  const supabase = getSupabase()

  const { data: catRows } = await supabase
    .from('categories')
    .select('name')
    .eq('active', true)
  const approvedCategories = new Set((catRows || []).map((r: { name: string }) => r.name))

  const cleanCategories = [...new Set(body.categories.map((c: string) => c.trim()))]
    .filter(c => approvedCategories.has(c))
  if (cleanCategories.length === 0) {
    return { error: 'Selected categories are not on the approved list.' }
  }

  // Social links (personal contacts): portal handles or URLs, max 3, plain
  // strings — presentation renders them verbatim, so never allow control
  // characters or whitespace runs.
  const cleanSocials = (Array.isArray(body.socials) ? body.socials : [])
    .filter((s: unknown): s is string => typeof s === 'string')
    .map((s: string) => s.trim().replace(/\s+/g, ' ').replace(/[`*_]/g, '').slice(0, 100))
    .filter(Boolean)
    .slice(0, 3)

  let cleanAreas: string[] = []
  if (Array.isArray(body.areas)) {
    cleanAreas = [...new Set(body.areas)]
      .filter((a: unknown): a is string => typeof a === 'string' && a.trim().length > 0)
      .map(a => a.trim())
      .slice(0, 8)
  }
  if (typeof body.city === 'string' && (body.city === '*' || body.city === 'remote')) cleanAreas = []
  if (isRemote && !cleanCity && typeof body.city === 'string' && body.city === '*') cleanAreas = []

  const location = isRemote && !cleanCity
    ? 'Zimbabwe'
    : [cleanAreas.join(', '), cleanCity, 'Zimbabwe'].filter(Boolean).join(', ')

  const price = typeof body.priceRange === 'string' ? body.priceRange.trim() : ''
  const normalizedPrice = price ? (price.startsWith('$') ? price : `$${price}`) : null

  const editToken = crypto.randomUUID()

  let businessId = generateBusinessId()
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle()
    if (!existing) break
    businessId = generateBusinessId()
  }

  let normalizedUsername = body.requestedUsername
    ? normalizeUsername(body.requestedUsername)
    : suggestUsername(name.trim())
  for (let i = 0; i < 10; i++) {
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('username', normalizedUsername)
      .maybeSingle()
    if (!existing) break
    normalizedUsername = normalizedUsername.replace(/_\d+$/, '') + '_' + (i + 2)
  }

  let inserted: { id: string; slug: string | null } | null = null
  let lastError: string | null = null

  function generateSlug(name: string): string {
    const base = slugify(name, 50) || 'business'
    return `${base}-${Math.random().toString(36).slice(2, 8)}`
  }

  const generateSite = body.generateSite !== false

  const isYellowPages = cleanCategories.some(c => SPECIAL_CATEGORIES.has(c))

  for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
    const slug = generateSlug(name)
    const { data, error } = await supabase
      .from('businesses')
      .insert({
        name: name.trim(),
        slug,
        business_id: businessId,
        username: normalizedUsername,
        whatsapp_username: typeof body.whatsappUsername === 'string' ? body.whatsappUsername.trim() : '',
        bio: (typeof body.bio === 'string' && body.bio.trim()) ||
          `Professional ${typeof body.description === 'string' ? body.description.trim() : ''} services.`.replace('Professional  ', 'Professional '),
        category: cleanCategories,
        location,
        country_code: code,
        city: cleanCity,
        area: cleanAreas.length === 0 ? '' : cleanAreas[0],
        areas: cleanAreas,
        is_remote: isRemote,
        phone: fullPhone,
        phone_type: isVoice ? 'voice' : 'whatsapp',
        whatsapp_link: isVoice ? null : `https://wa.me/${fullPhone}?text=${WA_MSG}`,
        voice_phone: cleanVoicePhone,
        catalog_link: typeof body.catalogLink === 'string' && body.catalogLink.trim() ? body.catalogLink.trim() : null,
        logo_url: typeof body.logoUrl === 'string' && body.logoUrl.trim() ? body.logoUrl.trim() : null,
        price_range: normalizedPrice,
        website: typeof body.website === 'string' && body.website.trim() ? body.website.trim() : null,
        socials: cleanSocials,
        address: typeof body.address === 'string' ? body.address.trim() : '',
        lat: typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : null,
        lng: typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : null,
        address_verified: body.addressVerified === true,
        show_location: body.showLocation !== false,
        edit_token: editToken,
        generate_site: generateSite === true,
        site_contact_email: typeof body.siteContactEmail === 'string' && body.siteContactEmail.trim() ? body.siteContactEmail.trim() : '',
        verified: false,
        rating: 0,
        review_count: 0,
        payment_status: isYellowPages ? 'active' : 'pending',
      })
      .select('id, slug')
      .single()
    if (!error) inserted = data
    else lastError = error.message
  }

  if (!inserted) {
    return { error: lastError || 'Could not create the listing. Please try again.' }
  }

  if (generateSite) {
    try {
      const content = await generateSiteContent({
        businessName: name.trim(),
        category: cleanCategories[0] || '',
        bio: typeof body.bio === 'string' ? body.bio.trim() : '',
        city: cleanCity,
      })
      await supabase
        .from('businesses')
        .update({ site_hero: content.hero, site_services: content.services })
        .eq('id', inserted.id)
    } catch {
      // Non-blocking: the site falls back to template copy when generation fails.
    }
  }

  const siteUrl = SITE_URL
  const editLink = `${siteUrl}/edit?token=${editToken}`
  const payLink = `${siteUrl}/pay`
  const notify = body.notify !== false

  if (notify) {
    if (isYellowPages && process.env.ADMIN_WHATSAPP) {
      const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
      sendWhatsAppMessage(
        process.env.ADMIN_WHATSAPP,
        [
          '🚨 *YELLOW PAGES SUBMISSION: VERIFY FAST*',
          '',
          'A public-service listing was just submitted and needs priority verification.',
          '',
          `Name: ${name.trim()}`,
          `Category: ${cleanCategories.join(', ')}`,
          `Location: ${location}`,
          `Phone: ${fullPhone}`,
          '',
          `Profile: ${siteUrl}/business/${inserted.slug || inserted.id}`,
          `Review: ${siteUrl}/admin`,
          '',
          'Verify ASAP so it appears in the Emergency & Essential Services strip and /yellow-pages.',
        ].join('\n')
      ).catch(() => {})
    }

    const { sendWhatsAppMessage, sendWhatsAppTemplate } = await import('@/lib/whatsapp')

    if (isYellowPages) {
      const statusText = 'received: public-service listings get priority review'
      const tpl = process.env.WHATSAPP_TEMPLATE_SUBMITTED
      if (tpl) {
        sendWhatsAppTemplate(fullPhone, tpl, [name.trim(), statusText, editLink]).catch(() => {})
      } else {
        sendWhatsAppMessage(
          fullPhone,
          [
            `✅ *LISTING RECEIVED: ${name.trim()}*`,
            '',
            `Your listing on WA Directory is ${statusText}.`,
            '',
            'Verification status: ⏳ Pending review',
            'Public-service listings are prioritized by our team.',
            '',
            'Edit your listing anytime with your private link:',
            editLink,
            '',
            'Keep this link safe: anyone with it can edit your listing.',
          ].join('\n')
        ).catch(() => {})
      }
    } else {
      sendWhatsAppMessage(
        fullPhone,
        [
          `✅ *LISTING CREATED: ${name.trim()}*`,
          '',
          `Business ID: ${businessId}`,
          `Username: @${normalizedUsername}`,
          '',
          `Pay USD 1 via EcoCash to go live.`,
          `Anyone can pay for you at: ${payLink}`,
          '',
          'Your listing will appear once admin confirms the payment.',
          '',
          'Edit your listing anytime with your private link:',
          editLink,
        ].join('\n')
      ).catch(() => {})
    }
  }

  return {
    id: inserted.id,
    slug: inserted.slug || '',
    name: name.trim(),
    businessId,
    username: normalizedUsername,
    editToken,
    categories: cleanCategories,
    city: cleanCity,
    isYellowPages,
    pendingPayment: !isYellowPages,
  }
}
