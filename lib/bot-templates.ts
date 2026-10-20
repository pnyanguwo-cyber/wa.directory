import { SITE_URL } from './site-url'

// The literal phrase that ties a customer chat to our attribution message:
// written by /go/[id] when a customer opens a business chat, and matched by
// the bot's transcript + rating flows. Both sides must import this constant
// so a copy edit can never silently break transcript logging or prompts.
export const CHAT_OPEN_MARKER = 'opened your chat'

/**
 * WhatsApp inline-code price: `$1.50` renders monospace in the client.
 */
export function monoUSD(price: number): string {
  const s = price.toFixed(2)
  return `\`$${s.endsWith('.00') ? s.slice(0, -3) : s}\``
}

/**
 * Wraps a free-form database price string ("$5–$40", "From $10") in the same
 * monospace price treatment. Empty input renders as nothing.
 */
export function monoPrice(raw: string | null | undefined): string {
  const s = (raw || '').trim().replace(/`/g, '')
  return s ? `\`${s}\`` : ''
}

export interface ResultCard {
  id: string
  name: string
  city: string | null
  area: string | null
  km?: number | null
  // Exact product match the customer searched for (may be unpriced).
  item: { name: string; price: number | null } | null
  // Business-level price range, only shown when there is no exact product.
  priceRange: string | null
}

export function displayLocation(city: string | null, area?: string | null): string {
  return [area, city || 'Zimbabwe'].filter(Boolean).join(', ')
}

function searchCardPriceLine(card: ResultCard): string | null {
  if (card.item) {
    return card.item.price != null
      ? `${card.item.name}: ${monoUSD(card.item.price)}`
      : `${card.item.name}: Price not listed`
  }
  const range = monoPrice(card.priceRange)
  return range ? `💰 ${range}` : null
}

function searchCardLines(card: ResultCard, i: number): string[] {
  const lines = [`${i + 1}. *${card.name}*`]
  lines.push(`📍 ${displayLocation(card.city, card.area)}${card.km != null ? ` (~${Math.round(card.km)} km)` : ''}`)
  const priceLine = searchCardPriceLine(card)
  if (priceLine) lines.push(priceLine)
  return lines
}

function capFirst(term: string): string {
  return term.length > 0 ? term[0].toUpperCase() + term.slice(1) : term
}

/**
 * Search results message. `cityLabel` null means the search was nationwide.
 */
export function renderResultsMessage(
  termDisplay: string,
  cityLabel: string | null,
  cards: ResultCard[]
): string {
  const header = cityLabel
    ? `*${capFirst(termDisplay)} near ${cityLabel}*`
    : `*${capFirst(termDisplay)} (countrywide)*`
  const reply = cards.length === 1 ? '*1*' : `*1* to *${cards.length}*`
  return [
    header,
    '',
    `I found ${cards.length} matching listing${cards.length === 1 ? '' : 's'} in the current directory.`,
    '',
    cards.map((c, i) => searchCardLines(c, i)).join('\n\n'),
    '',
    `Reply with ${reply} to view business details.`,
    'You can also change your location or start a new search.',
  ].join('\n')
}

/**
 * Nearby-town results message (the requested town had no verified matches).
 */
export function renderNearbyMessage(
  termDisplay: string,
  city: string,
  cards: ResultCard[]
): string {
  const reply = cards.length === 1 ? '*1*' : `*1* to *${cards.length}*`
  return [
    `No ${termDisplay} in *${city}*. Nearest:`,
    '',
    cards.map((c, i) => searchCardLines(c, i)).join('\n\n'),
    '',
    `Reply with ${reply} to view business details, or try *whole country*.`,
  ].join('\n')
}

export interface DetailData {
  name: string
  slug: string | null
  city: string | null
  area: string | null
  rating: number
  reviewCount: number | null
  /** Up to 3 active items for this business. */
  items: { name: string; price: number | null }[]
  phone: string | null
  /** 'whatsapp' | 'voice' | null */
  phoneType: string | null
  chatLink: string | null
}

function chatNowLink(name: string, phoneDigits: string, stored: string | null): string {
  if (stored) return stored
  const text = encodeURIComponent(`Hi ${name}, I found you on WA Directory`)
  return `https://wa.me/${phoneDigits}?text=${text}`
}

/**
 * Business details card. Omits fields that are not available; contact lines
 * adapt to the listing (voice-only numbers get a call line, missing numbers
 * fall back to the listing page).
 */
export function renderDetailCard(b: DetailData): string {
  const lines = [b.name ? `*${b.name}*` : 'Business details']
  lines.push(`📍 ${displayLocation(b.city, b.area)}`)
  lines.push('')

  const count = b.reviewCount || 0
  if (b.rating > 0) {
    lines.push(`⭐ ${b.rating.toFixed(1)} (${count} review${count === 1 ? '' : 's'})`)
  }

  if (b.items.length > 0) {
    lines.push('')
    lines.push('*Products and prices*')
    for (const it of b.items) {
      lines.push(`• ${it.name}${it.price != null ? `: ${monoUSD(it.price)}` : ': Price not listed'}`)
    }
    if (b.items.every(it => it.price == null)) {
      // All items unpriced, keep the note honest without inventing prices
      lines.push('(prices not listed, chat for a quote)')
    }
  }

  const digits = (b.phone || '').replace(/[^0-9]/g, '')
  const isVoice = b.phoneType === 'voice'
  const hasDigits = digits.length > 0
  lines.push('')
  lines.push('*Contact*')
  if (isVoice) {
    lines.push(hasDigits ? `📞 +${digits} (voice line, no WhatsApp)` : `🔗 ${listingUrl(b)}`)
  } else if (hasDigits) {
    lines.push(`📞 +${digits}`)
    lines.push(`💬 ${chatNowLink(b.name, digits, b.chatLink)}`)
  } else {
    lines.push(`🔗 ${listingUrl(b)}`)
  }

  return [
    ...lines,
    '',
    '🔗 View full listing',
    listingUrl(b),
  ].join('\n')
}

function listingUrl(b: { slug: string | null }): string {
  return `${SITE_URL}/business/${b.slug || 'listing'}`
}

/** Empty results / no supply message. */
export function renderEmptyResults(term: string): string {
  return [
    `No results for *${term}*.`,
    '',
    'Try: "plumber harare", "bread chinhoyi", "salon bulawayo".',
    'Send *help* for tips.',
  ].join('\n')
}

export function renderInvalidSelection(count: number): string {
  return `That number is not on the list: reply *1* to *${count}* to view business details, or send a new search.`
}

/** Safe outbound error note shown to customers (rare; nothing is exposed). */
export function renderErrorCard(): string {
  return [
    '*We hit a problem on our side.*',
    '',
    'Please send your search again in a moment, or reply *help* for tips.',
  ].join('\n')
}

export function FALLBACK_HELP_LINES(siteUrl: string): string[] {
  return [
    '*WA Directory Bot* 🤖',
    'Find any product or service on WhatsApp, near you.',
    '',
    '*Search:* what you need + your town',
    'e.g. "bread chinhoyi", "plumber in bulawayo"',
    'Or just send "plumber" and I will ask your town.',
    '',
    'Reply *1* to *5* after results for contact details',
    '',
    '*List your business:* send *register*',
    '*Cancel:* send *cancel*',
    '*Help:* send *help*',
    '',
    `Website: ${siteUrl}`,
  ]
}
