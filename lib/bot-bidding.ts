import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage, sendInteractiveList, sendInteractiveButtons, sendCtaUrl } from '@/lib/whatsapp'
import { initiateEcoCashPayment, paynowConfigured } from '@/lib/paynow'
import { SITE_URL } from '@/lib/site-url'
import { digitsOnly } from '@/lib/phone'
import { logBotMessage } from '@/lib/bot-log'
import { logPaymentEvent } from '@/lib/payment-events'

// Minimum gap over the current #1 fee (10 cents).
const MIN_BID_GAP = 0.1

/**
 * Handle the main `bid` command.
 * Usage: `bid` or `bid <category> <city> <amount>`
 */
export async function handleBidCommand(phone: string, text: string) {
  const supabase = getSupabase()

  // Find business by owner's phone
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, business_id, category, city, is_remote')
    .eq('phone', phone)
    .maybeSingle()

  if (!business) {
    await sendWhatsAppMessage(phone, 'No business found for this WhatsApp number. Register first with `register`.')
    return
  }

  const categories = business.category || []
  if (categories.length === 0) {
    await sendWhatsAppMessage(phone, 'Your listing has no categories. Add categories via the portal to bid.')
    return
  }

  // Parse arguments: bid <category> <city> <amount>
  const parts = text.trim().split(/\s+/)
  if (parts.length >= 4) {
    // Quick bid: bid plumber harare 1.50
    const category = parts[1]
    const city = parts[2]
    const amount = parseFloat(parts[3])

    if (!categories.includes(category)) {
      await sendWhatsAppMessage(phone, `Category "${category}" not found on your listing. Your categories: ${categories.join(', ')}`)
      return
    }

    if (!business.is_remote && city !== business.city) {
      await sendWhatsAppMessage(phone, `You can only bid in your listing's city (${business.city}).`)
      return
    }

    await handleBidAmount(phone, business.id, category, city || '', amount)
    return
  }

  // Interactive flow: show categories to pick from
  const rows = categories.map((c: string) => ({
    id: `bid_cat_${c}`,
    title: c,
    description: business.is_remote ? 'Nationwide — pick city next' : business.city || 'N/A'
  }))

  await sendInteractiveList(
    phone,
    `*Bid for #1 Spot* 🏆\nYour business: *${business.name}* (${business.business_id})\nPick a category:`,
    rows,
    'Choose category'
  )
}

/**
 * Handle category selection from interactive list.
 * Callback ID format: bid_cat_<category>
 */
export async function handleBidCategorySelection(phone: string, selectionId: string) {
  const supabase = getSupabase()

  const category = selectionId.replace('bid_cat_', '')

  // Find business by owner's phone
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, business_id, category, city, is_remote')
    .eq('phone', phone)
    .maybeSingle()

  if (!business) {
    await sendWhatsAppMessage(phone, 'No business found for this WhatsApp number.')
    return
  }

  if (!business.category?.includes(category)) {
    await sendWhatsAppMessage(phone, `Category "${category}" not found on your listing.`)
    return
  }

  // If nationwide, ask for city
  if (business.is_remote) {
    // Get cities where this category has spots or bids
    const { data: spots } = await supabase
      .from('rank_spots')
      .select('city')
      .eq('category', category)
      .eq('position', 1)
      .eq('status', 'active')

    const cities = [...new Set((spots || []).map(s => s.city).filter(Boolean))]
    if (cities.length === 0) {
      cities.push('Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Chinhoyi')
    }

    const rows = cities.map(c => ({
      id: `bid_city_${category}_${c}`,
      title: c,
      description: 'Select city to bid in'
    }))

    await sendInteractiveList(
      phone,
      `*Bid for #1 in ${category}* 📍\nPick a city:`,
      rows,
      'Choose city'
    )
    return
  }

  // Not nationwide - go straight to amount selection
  await showBidAmountOptions(phone, business.id, category, business.city || '')
}

/**
 * Handle city selection for nationwide businesses.
 * Callback ID format: bid_city_<category>_<city>
 */
export async function handleBidCitySelection(phone: string, selectionId: string) {
  const supabase = getSupabase()

  const parts = selectionId.replace('bid_city_', '').split('_')
  const category = parts[0]
  const city = parts.slice(1).join(' ')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  if (!business) {
    await sendWhatsAppMessage(phone, 'Business not found.')
    return
  }

  await showBidAmountOptions(phone, business.id, category, city)
}

/**
 * Show current #1 fee and bid amount options.
 */
async function showBidAmountOptions(phone: string, businessId: string, category: string, city: string) {
  const supabase = getSupabase()

  // Get current #1 holder (no period filter - bids are indefinite until outbid)
  const { data: spot } = await supabase
    .from('rank_spots')
    .select('monthly_fee, business_id')
    .eq('category', category)
    .eq('city', city)
    .eq('position', 1)
    .eq('status', 'active')
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentFee = spot ? Number(spot.monthly_fee || 0) : 0
  const minBid = currentFee > 0 ? currentFee + MIN_BID_GAP : MIN_BID_GAP

  // Get business name for display
  const { data: business } = await supabase
    .from('businesses')
    .select('name, business_id')
    .eq('id', businessId)
    .maybeSingle()

  let message = `*Bid for #1: ${category}* ${city ? `in ${city}` : '(nationwide)'}\n`
  message += `Business: *${business?.name || 'Your business'}* (${business?.business_id})\n\n`

  if (spot) {
    const isMine = spot.business_id === businessId
    message += `Current #1: ${isMine ? 'YOU 👑' : 'Another business'}\n`
    message += `Current fee paid: $${currentFee.toFixed(2)} (one-time)\n\n`
  } else {
    message += `Current #1: *OPEN* 🟢\n\n`
  }

  message += `Minimum bid: *$${minBid.toFixed(2)}* (must beat current #1 by at least $${MIN_BID_GAP.toFixed(2)})\n`
  message += `Select an amount or type a custom amount:`

  // Quick amount buttons (minBid, minBid+0.50, minBid+1.00, minBid+2.00)
  const amounts = [
    minBid,
    Math.round((minBid + 0.5) * 100) / 100,
    Math.round((minBid + 1.0) * 100) / 100,
    Math.round((minBid + 2.0) * 100) / 100,
  ]

  const buttons = amounts.map(a => ({
    id: `bid_amt_${a.toFixed(2)}`,
    title: `$${a.toFixed(2)}`
  }))

  buttons.push({ id: 'bid_amt_custom', title: 'Custom…' })

  await sendInteractiveButtons(phone, message, buttons)
}

/**
 * Handle bid amount selection.
 * Callback ID format: bid_amt_<amount> or bid_amt_custom
 */
export async function handleBidAmount(phone: string, businessId: string, category: string, city: string, amount: number) {
  const supabase = getSupabase()

  // Get current #1 holder
  const { data: spot } = await supabase
    .from('rank_spots')
    .select('monthly_fee, business_id')
    .eq('category', category)
    .eq('city', city)
    .eq('position', 1)
    .eq('status', 'active')
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentFee = spot ? Number(spot.monthly_fee || 0) : 0
  const minBid = currentFee > 0 ? currentFee + MIN_BID_GAP : MIN_BID_GAP

  if (amount < minBid) {
    await sendWhatsAppMessage(phone, `Your bid of $${amount.toFixed(2)} is below the minimum of $${minBid.toFixed(2)}. You must beat the current #1 by at least $${MIN_BID_GAP.toFixed(2)}.`)
    return
  }

  // Check for existing pending bid (no period filter)
  const { data: existing } = await supabase
    .from('bids')
    .select('id, amount')
    .eq('business_id', businessId)
    .eq('category', category)
    .eq('city', city)
    .eq('position', 1)
    .eq('status', 'pending')
    .maybeSingle()

  // If Paynow not configured, inform user
  if (!paynowConfigured()) {
    await sendWhatsAppMessage(
      phone,
      `Online payments are not enabled yet. Your bid of $${amount.toFixed(2)} for *${category}* ${city ? `in ${city}` : ''} has been recorded. An admin will contact you to confirm payment.`
    )
    return
  }

  // Ask for EcoCash phone number
  await sendWhatsAppMessage(
    phone,
    `*Confirm Bid* ✅\n\n` +
    `Category: *${category}*\n` +
    `Location: ${city || 'Nationwide'}\n` +
    `Bid amount: *$${amount.toFixed(2)}* (one-time payment)\n` +
    `${currentFee > 0 ? `Beats current #1 ($${currentFee.toFixed(2)}) by $${(amount - currentFee).toFixed(2)}` : 'Spot is open!'}\n\n` +
    `Reply with your EcoCash phone number (e.g. 0771234567) to proceed with payment.\n` +
    `You'll receive a PIN prompt on that number — approve it to confirm your bid.`
  )

  // Store the pending bid info in a temporary way - we'll use the chat session
  // For now, we'll ask them to reply with the amount and phone in one message
  // Format: "confirm 1.50 0771234567"
}

/**
 * Handle bid confirmation with phone number.
 * Expected format: "confirm <amount> <phone>"
 */
export async function handleBidConfirm(phone: string, text: string) {
  const supabase = getSupabase()

  // Parse: confirm 1.50 0771234567
  const parts = text.trim().split(/\s+/)
  if (parts.length < 3) {
    await sendWhatsAppMessage(phone, 'Usage: `confirm <amount> <phone>` (e.g. `confirm 1.50 0771234567`)')
    return
  }

  const amount = parseFloat(parts[1])
  const payerPhone = parts[2]

  if (isNaN(amount) || amount <= 0) {
    await sendWhatsAppMessage(phone, 'Invalid amount.')
    return
  }

  const payerClean = digitsOnly(payerPhone)
  if (payerClean.length < 9) {
    await sendWhatsAppMessage(phone, 'Invalid EcoCash phone number.')
    return
  }

  // Find business by owner's phone
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, business_id, category, city, is_remote')
    .eq('phone', phone)
    .maybeSingle()

  if (!business) {
    await sendWhatsAppMessage(phone, 'Business not found.')
    return
  }

  // For simplicity, assume first category + city
  const category = business.category?.[0]
  const city = business.is_remote ? '' : business.city || ''

  if (!category) {
    await sendWhatsAppMessage(phone, 'No categories on your listing.')
    return
  }

  // Get current #1 fee for validation
  const { data: spot } = await supabase
    .from('rank_spots')
    .select('monthly_fee')
    .eq('category', category)
    .eq('city', city)
    .eq('position', 1)
    .eq('status', 'active')
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentFee = spot ? Number(spot.monthly_fee || 0) : 0
  const minBid = currentFee > 0 ? currentFee + MIN_BID_GAP : MIN_BID_GAP

  if (amount < minBid) {
    await sendWhatsAppMessage(phone, `Bid must be at least $${minBid.toFixed(2)}.`)
    return
  }

  // Check for existing pending bid (no period filter)
  const { data: existing } = await supabase
    .from('bids')
    .select('id')
    .eq('business_id', business.id)
    .eq('category', category)
    .eq('city', city)
    .eq('position', 1)
    .eq('status', 'pending')
    .maybeSingle()

  let bidId = existing?.id

  if (bidId) {
    // Update existing bid
    const { error } = await supabase
      .from('bids')
      .update({ amount, payer_phone: payerClean })
      .eq('id', bidId)
    if (error) {
      await sendWhatsAppMessage(phone, 'Failed to update bid. Please try again.')
      return
    }
  } else {
    // Create new bid (period can be current month for tracking, but spot is indefinite)
    const period = new Date().toISOString().slice(0, 7) // YYYY-MM
    const { data: inserted, error } = await supabase
      .from('bids')
      .insert({
        business_id: business.id,
        category,
        city: city || '',
        position: 1,
        amount,
        period,
        status: 'pending',
        payer_phone: payerClean,
      })
      .select('id')
    if (error || !inserted?.[0]?.id) {
      await sendWhatsAppMessage(phone, 'Failed to create bid. Please try again.')
      return
    }
    bidId = inserted[0].id
  }

  // Initiate EcoCash payment
  const init = await initiateEcoCashPayment({
    reference: `BID-${bidId}`,
    amount,
    phone: payerClean,
    additionalInfo: `Ranking bid: ${category}${city ? ` in ${city}` : ''}`,
    resultUrl: `${SITE_URL}/api/paynow/result`,
    returnUrl: `${SITE_URL}/portal/ranking`,
  })

  if (!init.ok || !init.pollUrl) {
    await sendWhatsAppMessage(phone, `Could not start EcoCash payment: ${init.error || 'Unknown error'}`)
    return
  }

  // Store poll URL
  await supabase
    .from('bids')
    .update({ paynow_poll_url: init.pollUrl, paynow_reference: init.paynowReference || null })
    .eq('id', bidId)

  await logPaymentEvent({
    eventType: 'payment_initiated',
    businessId: business.id,
    bidId,
    detail: { amount, category, city: city || '', payer: payerClean, paynowRef: init.paynowReference || null },
    request: new Request('internal'),
  })

  // Send payment instructions
  await sendWhatsAppMessage(phone, init.instructions || `EcoCash prompt sent to +${payerClean}. Enter your PIN to confirm the bid of $${amount.toFixed(2)} for *${category}*${city ? ` in ${city}` : ''}.`)

  // Tell them to wait
  await sendWhatsAppMessage(phone, 'Your bid will activate automatically once the payment is confirmed. You\'ll receive a confirmation here.')
}

/**
 * Handle "my bids" command - show user's active/pending bids.
 */
export async function handleMyBidsCommand(phone: string) {
  const supabase = getSupabase()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, business_id')
    .eq('phone', phone)
    .maybeSingle()

  if (!business) {
    await sendWhatsAppMessage(phone, 'No business found for this WhatsApp number.')
    return
  }

  // Show all bids (no period filter)
  const { data: bids } = await supabase
    .from('bids')
    .select('id, category, city, amount, status, paynow_paid_at, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  if (!bids || bids.length === 0) {
    await sendWhatsAppMessage(phone, `*Your Bids*\nBusiness: *${business.name}* (${business.business_id})\n\nNo bids yet. Type \`bid\` to start.`)
    return
  }

  let message = `*Your Bids*\nBusiness: *${business.name}* (${business.business_id})\n\n`

  for (const bid of bids) {
    const statusEmoji = bid.status === 'approved' ? '👑' : bid.status === 'paid' ? '✅' : bid.status === 'pending' ? '⏳' : bid.status === 'outbid' ? '❌' : '📋'
    message += `${statusEmoji} *${bid.category}* ${bid.city ? `in ${bid.city}` : '(nationwide)'}\n`
    message += `  Bid: $${Number(bid.amount).toFixed(2)} (one-time) | Status: ${bid.status}\n`
    if (bid.paynow_paid_at) {
      message += `  Paid: ${new Date(bid.paynow_paid_at).toLocaleString()}\n`
    }
    message += '\n'
  }

  message += 'Type `bid` to place a new bid.'

  await sendWhatsAppMessage(phone, message)
}

/**
 * Handle "outbid" command - show what's needed to beat current #1.
 */
export async function handleOutbidCommand(phone: string) {
  const supabase = getSupabase()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, business_id, category, city, is_remote')
    .eq('phone', phone)
    .maybeSingle()

  if (!business) {
    await sendWhatsAppMessage(phone, 'No business found for this WhatsApp number.')
    return
  }

  const categories = business.category || []
  if (categories.length === 0) {
    await sendWhatsAppMessage(phone, 'Your listing has no categories.')
    return
  }

  let message = `*Outbid Requirements* 🎯\nBusiness: *${business.name}*\n\n`

  for (const cat of categories) {
    const city = business.is_remote ? '(nationwide - pick city)' : business.city || 'N/A'

    const { data: spot } = await supabase
      .from('rank_spots')
      .select('monthly_fee, business_id')
      .eq('category', cat)
      .eq('city', business.city || '')
      .eq('position', 1)
      .eq('status', 'active')
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (spot) {
      const currentFee = Number(spot.monthly_fee || 0)
      const minBid = currentFee + MIN_BID_GAP
      const isMine = spot.business_id === business.id

      message += `*${cat}* ${city}\n`
      message += `Current #1: ${isMine ? 'YOU 👑' : 'Another business'}\n`
      message += `Current fee paid: $${currentFee.toFixed(2)} (one-time)\n`
      message += `To take/keep #1: bid at least *$${minBid.toFixed(2)}*\n\n`
    } else {
      message += `*${cat}* ${city}\n`
      message += `#1 spot: OPEN — min bid $${MIN_BID_GAP.toFixed(2)}\n\n`
    }
  }

  message += 'Type `bid <category> <city> <amount>` for a quick bid, or `bid` for interactive.'

  await sendWhatsAppMessage(phone, message)
}