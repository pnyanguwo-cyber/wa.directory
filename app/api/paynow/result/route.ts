import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { pollTransactionStatus } from '@/lib/paynow'
import { activateBidAsNumberOne, markBidPaid, notifyAdminTakeover } from '@/lib/bid-activation'

// Paynow server-to-server result update (configured as the integration's
// "result url"). Paynow POSTs an application/x-www-form-urlencoded body here
// whenever a transaction's status changes, e.g.:
//   reference=BID-<bidId>&paynowreference=...&amount=...&status=Paid&pollurl=...&hash=...
// Security model:
//   1. Verify the SHA512 hash over the posted values + integration key.
//   2. Never trust the posted status alone — re-confirm by POSTing to the
//      poll URL (hash-verified response) before flipping anything.
//   3. The reference (BID-<bidId>) is matched against the stored poll URL so
//      a forged reference can't touch an unrelated bid.

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verifyPaynowHash(values: Record<string, string>, integrationKey: string): boolean {
  let string = ''
  for (const key of Object.keys(values)) {
    if (key === 'hash') continue
    string += values[key]
  }
  string += integrationKey.toLowerCase()
  return values.hash === createHash('sha512').update(string).digest('hex').toUpperCase()
}

function parseUrlencoded(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pair of body.split('&')) {
    const idx = pair.indexOf('=')
    if (idx < 0) continue
    const k = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, '%20'))
    const v = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, '%20'))
    out[k] = v
  }
  return out
}

export async function POST(request: Request) {
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY
  if (!integrationKey) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
  }

  const body = await request.text()
  const values = parseUrlencoded(body)
  if (!values.hash || !verifyPaynowHash(values, integrationKey)) {
    return NextResponse.json({ error: 'Invalid hash' }, { status: 401 })
  }

  const reference = values.reference || ''
  if (!reference.startsWith('BID-')) {
    // Not a ranking bid (e.g. future other product) — acknowledge and ignore.
    return NextResponse.json({ ok: true, ignored: true })
  }
  const bidId = reference.slice(4)

  const supabase = getSupabase()

  const { data: bid } = await supabase
    .from('bids')
    .select('id, business_id, status, paynow_poll_url, paynow_paid_at, paynow_reference, amount')
    .eq('id', bidId)
    .maybeSingle()

  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 })

  // Match the stored poll URL against the one Paynow posted (defence in depth:
  // a hash-valid but replayed update for a different transaction won't match).
  if (bid.paynow_poll_url && values.pollurl && bid.paynow_poll_url !== values.pollurl) {
    return NextResponse.json({ error: 'Poll URL mismatch' }, { status: 409 })
  }

  // Idempotency: nothing left to do for an activated bid.
  if (bid.status === 'approved') {
    return NextResponse.json({ ok: true, status: 'approved' })
  }

  // Confirm status with Paynow directly (never trust the posted status).
  const pollUrl = values.pollurl || bid.paynow_poll_url
  if (!pollUrl) return NextResponse.json({ error: 'No poll URL available' }, { status: 400 })

  const poll = await pollTransactionStatus(pollUrl)
  if (!poll.ok) {
    // Ask Paynow to retry later rather than failing permanently.
    return NextResponse.json({ error: 'Status check failed' }, { status: 503 })
  }

  if (!poll.paid) {
    // Sent / Cancelled / Failed / Disputed etc. — acknowledge, don't activate.
    return NextResponse.json({ ok: true, paynow_status: poll.status })
  }

  const flipped = await markBidPaid(supabase, bidId)
  if (flipped.error) return NextResponse.json({ error: flipped.error }, { status: 500 })

  const result = await activateBidAsNumberOne(supabase, bidId)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })

  if (flipped.flipped) await notifyAdminTakeover(bid)

  return NextResponse.json({ ok: true, status: 'approved', activated: result.activated })
}
