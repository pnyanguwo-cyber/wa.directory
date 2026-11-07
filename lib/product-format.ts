/**
 * Pure product presentation helpers.
 *
 * Kept separate from `lib/products.ts` on purpose: that module talks to
 * Supabase (service role) and must never be pulled into a client bundle, while
 * product cards need the currency/availability formatting on the client.
 */

export const PRODUCT_CURRENCIES = ['USD', 'ZAR', 'GBP', 'EUR'] as const
export type ProductCurrency = (typeof PRODUCT_CURRENCIES)[number]

export const AVAILABILITY_STATES = [
  'in_stock',
  'available_on_order',
  'out_of_stock',
  'availability_unknown',
] as const
export type AvailabilityStatus = (typeof AVAILABILITY_STATES)[number]

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  in_stock: 'In stock',
  available_on_order: 'Available on order',
  out_of_stock: 'Out of stock',
  availability_unknown: 'Availability unknown',
}

export const PRODUCT_STATUSES = ['draft', 'active', 'inactive', 'archived'] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const PRICE_TYPES = ['fixed', 'on_request'] as const
export type PriceType = (typeof PRICE_TYPES)[number]

export const ITEM_CONDITIONS = ['', 'new', 'used', 'refurbished'] as const

/**
 * Price display. `on_request` is an explicit seller choice, not missing data,
 * so it must never render as $0.00.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency?: string | null,
  priceType?: string | null
): string {
  if (priceType === 'on_request') return 'Price on request'
  const code = (currency || 'USD').toUpperCase()
  const n = Number(amount ?? 0)
  const safe = Number.isFinite(n) ? n : 0
  const symbol = code === 'USD' ? '$' : code === 'GBP' ? '£' : code === 'EUR' ? '€' : 'R'
  return `${symbol}${safe.toFixed(2)}`
}

export function availabilityLabel(state?: string | null): string {
  return (
    AVAILABILITY_LABELS[(state as AvailabilityStatus) || 'availability_unknown'] ||
    AVAILABILITY_LABELS.availability_unknown
  )
}

export function normalizeCurrency(value: unknown): ProductCurrency {
  const code = String(value || 'USD').toUpperCase()
  return (PRODUCT_CURRENCIES as readonly string[]).includes(code) ? (code as ProductCurrency) : 'USD'
}

export function normalizeAvailability(value: unknown): AvailabilityStatus {
  const state = String(value || '').toLowerCase()
  if ((AVAILABILITY_STATES as readonly string[]).includes(state)) return state as AvailabilityStatus
  // Tolerate the labels an AI or a bot may echo back.
  if (state === 'in stock' || state === 'instock') return 'in_stock'
  if (state === 'out of stock' || state === 'outofstock') return 'out_of_stock'
  if (state === 'on order' || state === 'order') return 'available_on_order'
  return 'availability_unknown'
}

export function normalizeProductStatus(value: unknown): ProductStatus {
  const state = String(value || '').toLowerCase()
  return ((PRODUCT_STATUSES as readonly string[]).includes(state) ? state : 'draft') as ProductStatus
}

/** PostgREST `.or()` is a comma-separated filter list, so user text must not be
 * able to inject structure. Strip the delimiters and the LIKE wildcards. */
export function sanitizeSearchTerm(input: string, maxLength = 80): string {
  return (input || '')
    .replace(/[,()*%\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}
