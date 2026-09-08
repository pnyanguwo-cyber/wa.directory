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
}

export type PlanType = '1m' | '6m' | '12m'

export const PLAN_CONFIG: Record<PlanType, { label: string; months: number; days: number; price: number; perMonth: number }> = {
  '1m': { label: '1 Month', months: 1, days: 30, price: 1.0, perMonth: 1.0 },
  '6m': { label: '6 Months', months: 6, days: 180, price: 5.0, perMonth: 0.83 },
  '12m': { label: '12 Months', months: 12, days: 360, price: 9.0, perMonth: 0.75 },
}

export const PRO_ASSISTANCE_PRICE = 2.0
