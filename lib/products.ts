import { getSupabase } from '@/lib/supabase-server'
import { matchCategory } from '@/data/categories'
import { matchProductsByText } from '@/lib/embeddings'
import type { Business, BusinessItem } from '@/types'

// Shared product service.
//
// Products are the existing `business_items` rows with the 033 additions. This
// module is the single place that decides what a *discoverable* product is, so
// the web routes, the product map and the WhatsApp bot (which imports
// @wa-directory/shared) cannot drift apart.

export * from './product-format'

import {
  ITEM_CONDITIONS,
  normalizeCurrency,
  normalizeAvailability,
  normalizeProductStatus,
  sanitizeSearchTerm,
} from './product-format'

export const PRODUCT_COLUMNS =
  'id, business_id, name, slug, price, description, category, subcategory, brand, item_condition, ' +
  'currency_code, price_type, availability_status, status, stock_quantity, image_url, image_luminance, ' +
  'is_active, ai_generated, created_at, updated_at, published_at'

export const PRODUCT_WITH_SELLER_COLUMNS =
  PRODUCT_COLUMNS +
  ', businesses!inner(id, name, slug, city, area, phone, phone_type, voice_phone, whatsapp_username, ' +
  'verified, logo_url, lat, lng, payment_status, category)'

// Public discovery gate. A product is discoverable when it is published, its
// parent business is live, and its parent business is verified-equivalent
// (payment_status active is what the rest of the app treats as "live").
export const DISCOVERABLE_PRODUCT_FILTERS = {
  status: 'active',
  'businesses.payment_status': 'active',
}

export function isDiscoverable(product: Pick<BusinessItem, 'status' | 'is_active'>): boolean {
  return product.status === 'active' || (product.status === undefined && product.is_active === true)
}


/**
 * Maps an AI-suggested category string onto the existing controlled taxonomy
 * (data/categories.ts). Returns '' when nothing matches with confidence, which
 * forces the seller to choose instead of persisting a made-up category.
 */
export function resolveProductCategory(suggested: unknown, fallbackText = ''): string {
  const raw = String(suggested || '').trim()
  if (!raw && !fallbackText) return ''
  const matched = matchCategory(raw || fallbackText)
  if (matched !== 'Other') return matched
  const byText = matchCategory(fallbackText)
  return byText !== 'Other' ? byText : ''
}

export interface ProductSearchFilters {
  q?: string
  category?: string
  availability?: string
  city?: string
  maxPrice?: number
  limit?: number
  offset?: number
  includeOutOfStock?: boolean
}

export interface ProductSearchResult {
  products: BusinessItem[]
  total: number
  /** How the result set was assembled, so the UI can be honest about it. */
  match_mode?: 'keyword' | 'semantic' | 'hybrid'
}

/**
 * Text search over discoverable products. Used by Products mode on /search,
 * by the image-search fallback and by the bot's product search.
 */
export async function searchProducts(filters: ProductSearchFilters = {}): Promise<ProductSearchResult> {
  const supabase = getSupabase()
  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 60)
  const offset = Math.max(filters.offset ?? 0, 0)

  let query = supabase
    .from('business_items')
    .select(PRODUCT_WITH_SELLER_COLUMNS, { count: 'exact' })
    .eq('status', 'active')
    .eq('businesses.payment_status', 'active')

  if (!filters.includeOutOfStock) {
    query = query.neq('availability_status', 'out_of_stock')
  }

  const term = sanitizeSearchTerm(filters.q || '')
  const category = filters.category && filters.category !== 'All' ? filters.category : ''

  if (term) {
    // Name and description are the relevance surface. A category guess from the
    // keyword taxonomy broadens recall without letting the term become SQL.
    const guessed = matchCategory(term)
    const clauses = [`name.ilike.%${term}%`, `description.ilike.%${term}%`, `brand.ilike.%${term}%`]
    if (guessed !== 'Other') clauses.push(`category.eq.${guessed}`)
    query = query.or(clauses.join(','))
  }

  if (category) query = query.eq('category', category)
  if (filters.availability) query = query.eq('availability_status', filters.availability)
  if (typeof filters.maxPrice === 'number' && Number.isFinite(filters.maxPrice)) {
    query = query.lte('price', filters.maxPrice)
  }
  if (filters.city) query = query.eq('businesses.city', filters.city)

  // In-stock first, then newest. Availability is a gate, not a paid placement.
  query = query
    .order('availability_status', { ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) {
    console.error('[products] search failed:', error.message)
    return { products: [], total: 0 }
  }

  return { products: (data as unknown as BusinessItem[]) || [], total: count ?? 0 }
}

/**
 * Hydrates ids from a similarity search in the order they were ranked. Uses the
 * same discoverability gate as text search, so a semantic hit cannot surface a
 * draft product or a seller that is not live.
 */
export async function getProductsByIds(ids: string[]): Promise<BusinessItem[]> {
  const unique = Array.from(new Set(ids.filter(Boolean))).slice(0, 100)
  if (unique.length === 0) return []

  const { data, error } = await getSupabase()
    .from('business_items')
    .select(PRODUCT_WITH_SELLER_COLUMNS)
    .in('id', unique)
    .eq('status', 'active')
    .eq('businesses.payment_status', 'active')

  if (error) {
    console.error('[products] hydrate failed:', error.message)
    return []
  }

  const byId = new Map((data as unknown as BusinessItem[]).map((p) => [String(p.id), p]))
  return unique.map((id) => byId.get(id)).filter(Boolean) as BusinessItem[]
}

/**
 * Keyword search plus semantic neighbours.
 *
 * Exact matches always come first: a customer who types a model number must not
 * be pushed onto "similar" items. Semantic hits are appended only when they are
 * not already present, which is what makes a photo of a handbag find a listing
 * named "Ladies tote". Falls back to plain keyword results whenever embeddings
 * are unavailable.
 */
export async function searchProductsHybrid(
  filters: ProductSearchFilters,
  semanticText?: string
): Promise<ProductSearchResult> {
  const keyword = await searchProducts(filters)
  const text = (semanticText || filters.q || '').trim()
  if (!text) return { ...keyword, match_mode: 'keyword' }

  const matches = await matchProductsByText(text, {
    limit: 24,
    category: filters.category && filters.category !== 'All' ? filters.category : undefined,
  })
  if (!matches || matches.length === 0) {
    return { ...keyword, match_mode: 'keyword' }
  }

  const seen = new Set(keyword.products.map((p) => String(p.id)))
  const extraIds = matches.map((m) => String(m.id)).filter((id) => !seen.has(id))
  const extra = extraIds.length > 0 ? await getProductsByIds(extraIds) : []
  if (extra.length === 0) {
    return { ...keyword, match_mode: keyword.products.length > 0 ? 'keyword' : 'semantic' }
  }

  const products = [...keyword.products, ...extra]
  return {
    products,
    total: products.length,
    match_mode: keyword.products.length > 0 ? 'hybrid' : 'semantic',
  }
}

export interface SellerWithProducts extends Business {
  products: BusinessItem[]
  productCount: number
}

/**
 * Groups matching products by seller location for the map. One marker per
 * seller, never one per item.
 */
export async function searchSellersWithProducts(filters: ProductSearchFilters = {}): Promise<SellerWithProducts[]> {
  const { products } = await searchProducts({ ...filters, limit: Math.min(filters.limit ?? 200, 300) })
  const bySeller = new Map<string, SellerWithProducts>()

  for (const product of products) {
    const seller = (product as unknown as { businesses?: Record<string, unknown> }).businesses
    if (!seller) continue
    const businessId = String(product.business_id)
    let entry = bySeller.get(businessId)
    if (!entry) {
      entry = {
        ...(seller as unknown as Business),
        id: businessId,
        products: [],
        productCount: 0,
      } as SellerWithProducts
      bySeller.set(businessId, entry)
    }
    entry.productCount += 1
    if (entry.products.length < 4) entry.products.push(product)
  }

  return Array.from(bySeller.values())
}

/** All discoverable products for one seller, for the catalogue view. */
export async function getSellerProducts(businessId: string, limit = 50): Promise<BusinessItem[]> {
  const { data } = await getSupabase()
    .from('business_items')
    .select(PRODUCT_COLUMNS)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('availability_status', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100))
  return (data as unknown as BusinessItem[]) || []
}

export interface ProductInput {
  name: string
  description?: string
  price?: number
  currency_code?: string
  price_type?: string
  availability_status?: string
  stock_quantity?: number | null
  category?: string
  subcategory?: string
  brand?: string
  item_condition?: string
  status?: string
  image_url?: string
  ai_generated?: boolean
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

/**
 * Server-side product validation. Runs on every write path, so the WhatsApp
 * bot and the web form cannot publish different shapes of product.
 */
export function validateProductInput(input: ProductInput): ValidationResult<ProductInput> {
  const name = (input.name || '').trim()
  if (name.length < 2 || name.length > 80) return { ok: false, error: 'Product name must be between 2 and 80 characters.' }

  const priceType = input.price_type === 'on_request' ? 'on_request' : 'fixed'
  const price = Number(input.price ?? 0)
  if (priceType === 'fixed' && (!Number.isFinite(price) || price < 0 || price > 9_999_999)) {
    return { ok: false, error: 'Enter a valid price.' }
  }

  let stock: number | null = null
  if (input.stock_quantity !== null && input.stock_quantity !== undefined && String(input.stock_quantity) !== '') {
    stock = Number(input.stock_quantity)
    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return { ok: false, error: 'Enter a valid stock quantity.' }
  }

  const condition = (input.item_condition || '').toLowerCase()
  return {
    ok: true,
    value: {
      name,
      description: (input.description || '').trim().slice(0, 2000),
      price: priceType === 'on_request' ? 0 : Math.round(price * 100) / 100,
      currency_code: normalizeCurrency(input.currency_code),
      price_type: priceType,
      availability_status: normalizeAvailability(input.availability_status),
      stock_quantity: stock,
      category: input.category ? resolveProductCategory(input.category, name) : '',
      subcategory: (input.subcategory || '').trim().slice(0, 60),
      brand: (input.brand || '').trim().slice(0, 60),
      item_condition: (ITEM_CONDITIONS as readonly string[]).includes(condition) ? condition : '',
      status: normalizeProductStatus(input.status),
      image_url: (input.image_url || '').trim(),
      ai_generated: !!input.ai_generated,
    },
  }
}
