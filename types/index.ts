export interface Business {
  id: string
  name: string
  slug: string
  bio: string
  category: string[]
  location: string
  country_code?: string
  city: string
  area: string
  areas?: string[]
  phone: string
  // 'whatsapp' (default) = number is WhatsApp-reachable; 'voice' = landline or
  // hotline stored in national format — renders a Call button, not wa.me.
  phone_type?: 'whatsapp' | 'voice'
  // Secondary landline/hotline shown alongside WhatsApp for both-types listings.
  voice_phone?: string | null
  whatsapp_username?: string
  whatsapp_link?: string
  verified: boolean
  rating: number
  review_count: number
  catalog_link?: string
  logo_url: string
  price_range: string
  website?: string
  address?: string
  // Google-geocoded coordinates + whether the address was map-verified.
  lat?: number | null
  lng?: number | null
  address_verified?: boolean
  show_location?: boolean
  is_remote?: boolean
  featured_eligible?: boolean
  created_at: string
  edit_token?: string
  business_id?: string
  username?: string
  payment_status?: 'unpaid' | 'pending' | 'active' | 'expired'
  listing_activated_at?: string
  // Multi-branch organizations: org_id links a listing to its umbrella org;
  // is_hq marks the HQ listing; branch_label is the branch's display name
  // (e.g. "Chinhoyi"). Null org_id = an ordinary single-location business.
  org_id?: string | null
  is_hq?: boolean
  branch_label?: string | null
  // Auto-website controls + editable site sections.
  generate_site?: boolean
  site_hero?: string
  site_services?: string
  site_contact_email?: string
}

export interface BusinessItem {
  id: string
  business_id: string
  name: string
  slug: string
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
  business?: { name: string; slug: string; city?: string } | null
}

export interface Organization {
  id: string
  name: string
  slug: string | null
  bio: string
  logo_url: string
  verified: boolean
  created_at: string
  // Pre-fill values applied to branches created by the HQ portal.
  default_logo_url?: string
  default_categories?: string[]
  bio_template?: string
}

export type PlanType = '1m' | '6m' | '12m'

export const PLAN_CONFIG: Record<PlanType, { label: string; months: number; days: number; price: number; perMonth: number }> = {
  '1m': { label: '1 Month', months: 1, days: 30, price: 1.0, perMonth: 1.0 },
  '6m': { label: '6 Months', months: 6, days: 180, price: 5.0, perMonth: 0.83 },
  '12m': { label: '12 Months', months: 12, days: 360, price: 9.0, perMonth: 0.75 },
}

export const PRO_ASSISTANCE_PRICE = 2.0
