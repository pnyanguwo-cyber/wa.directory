import { SITE_URL } from './site-url'
import type { InteractiveRow } from './whatsapp'

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
}

/** Readable phone display: +263 772 234 002. */
export function formatPhone(raw: string | null | undefined): string {
  const digits = (raw || '').replace(/[^0-9]/g, '')
  if (!digits) return ''
  const cc = digits.slice(0, 3)
  const rest = digits.slice(3).replace(/(\d{3})(?=\d)/g, '$1 ')
  return `+${cc} ${rest}`
}

/** The /go redirect: logs attribution + transcript marker, then opens the
 * business WhatsApp chat with the prefill text. */
export function chatCtaUrl(businessId: string, customerPhone: string): string {
  const base = `${SITE_URL}/go/${businessId}`
  const params = new URLSearchParams({ f: customerPhone || '', via: 'WhatsApp bot' })
  return `${base}?${params.toString()}`
}

/** Body for the native chat button that follows the detail card. */
export function renderChatPrompt(name: string): string {
  return `Tap below to start a WhatsApp chat with ${name}.`
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
    for (let i = 0; i < b.items.length; i++) {
      const it = b.items[i]
      lines.push(`${i + 1}. ${it.name}${it.price != null ? `: ${monoUSD(it.price)}` : ': Price not listed'}`)
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
  if (hasDigits) {
    lines.push(isVoice ? `📞 ${formatPhone(digits)} (voice line, no WhatsApp)` : `📞 ${formatPhone(digits)}`)
  } else {
    lines.push(`🔗 ${listingUrl(b)}`)
  }

  return [
    ...lines,
    '',
    '🔗 View full listing',
    listingUrl(b),
    '',
    'Reply *back* to go back, or send a new search.',
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
  return `That number is not on the current screen: tap a business, reply a visible row number (1 to ${Math.min(count, 20)}), or tap *More results* if it appears.`
}

// ── Interactive screens ───────────────────────────────────────────────────

/** Body for the native list-message version of the results screen. */
export function renderResultsListBody(
  termDisplay: string,
  cityLabel: string | null,
  count: number,
  page = 0
): string {
  const header = cityLabel
    ? `*${capFirst(termDisplay)} near ${cityLabel}*`
    : `*${capFirst(termDisplay)} (countrywide)*`
  const lines = [
    header,
    '',
    `I found ${count} matching listing${count === 1 ? '' : 's'} in the current directory.`,
  ]
  const shown = page * RESULTS_PER_PAGE
  if (page === 0 && count > RESULTS_PER_PAGE) {
    lines.push(`Showing 1 to ${RESULTS_PER_PAGE} — tap *More results* for the rest.`)
  } else if (page > 0) {
    lines.push(`Showing ${shown + 1} to ${Math.min(count, shown + RESULTS_PER_PAGE)} of ${count}.`)
  }
  lines.push('', 'Tap a business below, reply with a number, or send a new search.')
  return lines.join('\n')
}

/** Price segment for list rows: same logic as searchCardPriceLine, but rows
 * are plain text (no markdown), so backticks are stripped. */
function rowPriceLine(card: ResultCard): string {
  if (card.item) {
    return card.item.price != null
      ? `${card.item.name}: ${monoUSD(card.item.price).replace(/`/g, '')}`
      : `${card.item.name}: Price not listed`
  }
  const range = monoPrice(card.priceRange).replace(/`/g, '')
  return range ? `💰 ${range}` : ''
}

// One WhatsApp list message holds at most 10 rows; one slot is reserved for
// the status row, so a page shows 9 businesses.
export const RESULTS_PER_PAGE = 9

/** Tappable rows for one results page: up to 9 businesses numbered
 * absolutely (page 2 starts at 10.), plus a trailing status row —
 * "→ More results…" when a next page exists, "✔ End of list" otherwise. */
export function resultRows(cards: ResultCard[], page = 0): InteractiveRow[] {
  const start = Math.max(0, page) * RESULTS_PER_PAGE
  const rows: InteractiveRow[] = cards
    .slice(start, start + RESULTS_PER_PAGE)
    .map((c, i) => {
      const price = rowPriceLine(c)
      const abs = start + i + 1
      const desc = `📍 ${displayLocation(c.city, c.area)}${c.km != null ? ` ~${Math.round(c.km)} km` : ''}${price ? ` · ${price}` : ''}`
      return { id: `sel_${abs}`, title: `${abs}. ${c.name}`, description: desc }
    })
  const shown = start + RESULTS_PER_PAGE
  if (cards.length > shown) {
    rows.push({
      id: 'more',
      title: '→ More results…',
      description: `Matches ${shown + 1}–${Math.min(cards.length, shown + RESULTS_PER_PAGE)} of ${cards.length}`,
    })
  } else {
    rows.push({
      id: 'end_list',
      title: '✔ End of list',
      description: `All ${cards.length} match${cards.length === 1 ? '' : 'es'} shown`,
    })
  }
  return rows
}

/** Main menu (opened by menu / hi / hello). Rows are by convention in route. */
export function renderMainMenuBody(): string {
  return [
    '*WA Directory* 🤖',
    'Find any product or service on WhatsApp, near you.',
    '',
    'Tap an option:',
  ].join('\n')
}

/** Body for the nearby-towns results screen as a native list message. */
export function renderNearbyListBody(
  termDisplay: string,
  city: string,
  count: number,
  page = 0
): string {
  const lines = [`No ${termDisplay} in *${city}*. Nearest:`]
  if (page === 0 && count > RESULTS_PER_PAGE) {
    lines.push(`Showing 1 to ${RESULTS_PER_PAGE} of ${count} — tap *More results* for the rest.`)
  } else if (page > 0) {
    const shown = page * RESULTS_PER_PAGE
    lines.push(`Showing ${shown + 1} to ${Math.min(count, shown + RESULTS_PER_PAGE)} of ${count}.`)
  }
  lines.push('', `Tap a business below to view details, or try *whole country*.`)
  return lines.join('\n')
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
    '*Pay subscription:* send *pay*',
    '*Cancel:* send *cancel*',
    '*Help:* send *help*',
    '',
    `Website: ${siteUrl}`,
  ]
}
