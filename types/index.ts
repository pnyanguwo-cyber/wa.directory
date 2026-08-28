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
  show_location?: boolean
  is_remote?: boolean
  featured_eligible?: boolean
  created_at: string
  edit_token?: string
}
