import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage, sendInteractiveList, sendInteractiveButtons, fetchMediaUrl } from '@/lib/whatsapp'
import { logBotMessage } from '@/lib/bot-log'
import {
  handleBidCommand,
  handleBidCategorySelection,
  handleBidCitySelection,
  handleBidAmount,
  handleBidConfirm,
  handleMyBidsCommand,
  handleOutbidCommand
} from '@/lib/bot-bidding'
import {
  startRegistrationFlow,
  handleRegistrationMessage,
  handleRegistrationImage
} from '@/lib/bot-registration'
import { formatHarareDate, getHarareStartOfDay } from '@/lib/date-utils'
import {
  getConversationState,
  hasActiveOnboardingState,
  isInPaymentFlow,
  setConversationState,
  updateConversationContext,
  clearConversationState,
  ConversationState,
} from '@/lib/bot-state'
import {
  routeHelpSelection,
  handleHelpCommand,
} from '@/lib/bot-help'
import { SITE_URL } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN!
const APP_SECRET = process.env.WHATSAPP_APP_SECRET!

// GET: Meta verification challenge
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST: Incoming messages
export async function POST(request: NextRequest) {
  // 1. Verify HMAC signature
  const signature = request.headers.get('x-hub-signature-256')?.replace('sha256=', '')
  const body = await request.text()

  if (!signature || !APP_SECRET) {
    console.warn('[webhook] Missing signature or APP_SECRET')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expected = crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex')

  if (signature !== expected) {
    console.warn('[webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 2. Process each entry
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages') {
        await handleMessages(change.value)
      }
    }
  }

  return NextResponse.json({ status: 'ok' })
}

/**
 * Transcript logging for inbound media: Meta sends only a media id, so we
 * resolve it to a short-lived public URL and store that (or a friendly
 * placeholder when resolution fails). Returns true when the message was
 * media and has been logged.
 */
async function inboundMediaLog(phone: string, msg: any, text: string): Promise<boolean> {
  const type: string = msg.type || ''
  if (type === 'image' || type === 'sticker' || type === 'video') {
    const media = msg[type]
    const url = media?.id ? await fetchMediaUrl(media.id) : null
    const caption = (media?.caption || text || '').trim()
    // Body is the URL when we have one (the workspace renders it as an
    // image); otherwise keep the caption so the transcript still reads.
    await logBotMessage(phone, 'in', type, url || caption || (type === 'image' ? 'Photo' : type))
    return true
  }
  if (type === 'audio' || type === 'voice' || type === 'ptt') {
    const media = msg[type]
    const url = media?.id ? await fetchMediaUrl(media.id) : null
    await logBotMessage(phone, 'in', 'voice', url || 'Voice message')
    return true
  }
  if (type === 'document') {
    const media = msg.document
    const url = media?.id ? await fetchMediaUrl(media.id) : null
    const name = media?.filename || 'Document'
    await logBotMessage(phone, 'in', 'document', url || `${name} (${media?.mime_type || 'file'})`)
    return true
  }
  if (type === 'location' && msg.location) {
    const { latitude, longitude, name, address } = msg.location
    const coords = latitude != null && longitude != null ? `${latitude}, ${longitude}` : 'Shared location'
    await logBotMessage(phone, 'in', 'location', [name || address, coords].filter(Boolean).join(' · '))
    return true
  }
  return false
}

async function handleMessages(value: any) {
  const contacts = value.contacts || []
  const messages = value.messages || []

  for (const msg of messages) {
    const phone = msg.from // already in international format (e.g. "263771234567")
    const text = msg.text?.body?.trim() || ''
    const msgId = msg.id

    // Inbound media must reach the transcript too, not just text: without
    // this, admin/business chat views show numbers and references for
    // anything the customer sent as a photo, voice note or location.
    const media = await inboundMediaLog(phone, msg, text)
    if (media) {
      const stateData = await getConversationState(phone)
      if (stateData?.state === 'REGISTRATION_AWAITING_IMAGE' && msg.type === 'image') {
        const url = await fetchMediaUrl(msg.image.id)
        if (url) {
          const res = await fetch(url)
          const bytes = new Uint8Array(await res.arrayBuffer())
          await handleRegistrationImage(phone, bytes, text)
        }
      }
      continue
    }

    // Handle interactive messages (button_reply, list_reply) - these have no text body
    if (msg.type === 'interactive' && msg.interactive) {
      const interactive = msg.interactive
      const interactiveType = interactive.type // 'button_reply' or 'list_reply'
      const replyId = interactive.button_reply?.id || interactive.list_reply?.id
      const replyTitle = interactive.button_reply?.title || interactive.list_reply?.title

      if (replyId) {
        await logBotMessage(phone, 'in', 'interactive', `${interactiveType}: ${replyId} (${replyTitle || ''})`)
        // Route interactive reply based on ID
        await handleInteractiveReply(phone, replyId, replyTitle)
        continue
      }
    }

    if (!text) continue

    await logBotMessage(phone, 'in', msg.type, text)

    // 2.5 CHECK CONVERSATION STATE FIRST - before any command routing
    // This prevents payment responses (EcoCash numbers, package selections)
    // from being interpreted as searches or bid commands
    const stateData = await getConversationState(phone)
    if (stateData) {
      const { state, context } = stateData

      // Route to onboarding/payment flow handlers based on state
      if (state === 'APPROVED_AWAITING_PACKAGE') {
        await handlePackageSelection(phone, text, context)
        continue
      }
      if (state === 'APPROVED_TRIAL_SELECTION') {
        await handleTrialSelectionState(phone, text, context)
        continue
      }
      if (state === 'AWAITING_ECOCASH_NUMBER') {
        await handleEcoCashNumber(phone, text, context)
        continue
      }
      if (state === 'PAYMENT_PENDING') {
        await handlePaymentPending(phone, text, context)
        continue
      }
      if (state === 'TRIAL_ACTIVE') {
        await handleTrialActiveState(phone, text, context)
        continue
      }
      if (state === 'TRIAL_EXPIRING') {
        await handleTrialExpiringState(phone, text, context)
        continue
      }
      if (state === 'TRIAL_EXPIRED') {
        await handleTrialExpiredState(phone, text, context)
        continue
      }
      if (state === 'REJECTED') {
        await handleRejectedFlow(phone, text, context)
        continue
      }
      if (state.startsWith('REGISTRATION_')) {
        // REGISTRATION_FLOW_ACTIVE is handled by the Flow endpoint
        // Only handle chat-based registration states
        if (state !== 'REGISTRATION_FLOW_ACTIVE') {
          await handleRegistrationMessage(phone, text, context)
        }
        continue
      }
      if (state === 'ACTIVE') {
        // Business is active - allow normal commands but log for analytics
        // Fall through to normal command handling
      }
      // For LISTING_SUBMITTED, AWAITING_ADMIN_REVIEW - just log, don't process commands
      // These are waiting for admin action
    }

    // 3. Route commands (only if no active onboarding/payment state intercepting)
    // Check if we should process normal commands
    const shouldProcessCommands = !stateData ||
      ['ACTIVE', 'REJECTED', 'CANCELLED', 'PAYMENT_FAILED', 'EXPIRED'].includes(stateData.state)

    if (shouldProcessCommands) {
      const lowerText = text.toLowerCase()

      // Help and menu commands - show the new interactive help menu
      if (lowerText === 'help' || lowerText === 'menu') {
        await handleHelpCommand(phone)
      } else if (lowerText === 'register' || lowerText === 'register business') {
        await startRegistrationFlow(phone)
        continue
      }
      // Help-related interactive selections from buttons/lists
      else if (lowerText.startsWith('help_') || lowerText.startsWith('bid_cat_') ||
               lowerText.startsWith('bid_city_') || lowerText.startsWith('bid_amt_')) {
        // Route help selections to the help router
        if (lowerText.startsWith('help_')) {
          await routeHelpSelection(phone, text)
          continue
        }
        // Bid callbacks are handled below
      }

      // Bid commands
      if (lowerText === 'bid' || lowerText.startsWith('bid ')) {
        await handleBidCommand(phone, text)
      } else if (lowerText === 'ranking' || lowerText === 'my ranking') {
        await handleRankingCommand(phone)
      } else if (lowerText === 'my bids') {
        await handleMyBidsCommand(phone)
      } else if (lowerText === 'outbid') {
        await handleOutbidCommand(phone)
      } else if (lowerText.startsWith('bid_cat_')) {
        await handleBidCategorySelection(phone, text)
      } else if (lowerText.startsWith('bid_city_')) {
        await handleBidCitySelection(phone, text)
      } else if (lowerText.startsWith('bid_amt_')) {
        // Format: bid_amt_1.50
        const amountStr = text.replace('bid_amt_', '')
        const amount = parseFloat(amountStr)
        if (!isNaN(amount)) {
          // We need to get the business to find their pending bid context
          // For now, ask for confirmation with phone number
          await sendWhatsAppMessage(phone, `To confirm your bid of $${amount.toFixed(2)}/month, reply with:\n\`confirm ${amount.toFixed(2)} <your-ecocash-phone>\`\n\nExample: \`confirm 1.50 0771234567\``)
        }
      } else if (lowerText.startsWith('confirm ')) {
        await handleBidConfirm(phone, text)
      }
      // Existing commands will be handled by the external bot
    }
  }
}

/**
 * Handle interactive message replies (button_reply, list_reply)
 * Routes based on reply ID to the appropriate handler
 */
async function handleInteractiveReply(phone: string, replyId: string, replyTitle?: string) {
  const lower = replyId.toLowerCase().trim()

  // Help menu selections
  if (lower.startsWith('help_')) {
    await routeHelpSelection(phone, replyId)
    return
  }

  // Trial or package selection for payment flow
  if (lower.startsWith('trial_') || lower.startsWith('pkg_')) {
    const stateData = await getConversationState(phone)
    if (stateData?.state === 'APPROVED_TRIAL_SELECTION') {
      if (lower === 'trial_free') {
        await handleTrialSelection(phone, stateData.context)
      } else {
        // Convert pkg_1m -> 1m, etc.
        const planKey = lower.replace('pkg_', '')
        await handlePackageSelection(phone, planKey, stateData.context)
      }
    }
    return
  }

  // Bid-related interactive selections
  if (lower.startsWith('bid_cat_') || lower.startsWith('bid_city_') || lower.startsWith('bid_amt_')) {
    const stateData = await getConversationState(phone)
    if (stateData) {
      // Route to bid handlers - these will need to handle both text and interactive
      const { handleBidCategorySelection, handleBidCitySelection, handleBidAmount } = await import('@/lib/bot-bidding')
      if (lower.startsWith('bid_cat_')) {
        await handleBidCategorySelection(phone, replyId)
      } else if (lower.startsWith('bid_city_')) {
        await handleBidCitySelection(phone, replyId)
      } else if (lower.startsWith('bid_amt_')) {
        // bid_amt_<amount> - need businessId, category, city from state
        const context = stateData.context || {}
        const businessId = context.businessId
        const category = context.bidCategory
        const city = context.bidCity
        const amount = parseFloat(replyId.replace('bid_amt_', ''))
        if (businessId && category && city && !isNaN(amount)) {
          await handleBidAmount(phone, businessId, category, city, amount)
        }
      }
    }
    return
  }

  // Registration type selection from help menu
  if (lower === 'register' || lower === 'register_another' || lower === 'register_business') {
    await startRegistrationFlow(phone)
    return
  }

  // Unknown interactive reply - log but don't crash
  console.warn('[webhook] Unknown interactive reply:', replyId, 'from', phone)
}

async function handleRankingCommand(phone: string) {
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

  // For each category, get current #1 fee
  let response = `*Your Ranking Status* 📊\nBusiness: *${business.name}* (${business.business_id})\n\n`

  for (const cat of categories) {
    const city = business.is_remote ? '(nationwide)' : business.city || 'N/A'

    const { data: spot } = await supabase
      .from('rank_spots')
      .select('monthly_fee, business_id, period_end')
      .eq('category', cat)
      .eq('city', business.city || '')
      .eq('position', 1)
      .eq('status', 'active')
      .gte('period_end', getHarareStartOfDay().slice(0, 10))
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (spot) {
      const isMine = spot.business_id === business.id
      response += `*${cat}* ${city}\n`
      response += `#1 fee: $${Number(spot.monthly_fee).toFixed(2)}/mo ${isMine ? '👑 YOU' : ''}\n`
      response += `Until: ${formatHarareDate(spot.period_end)}\n\n`
    } else {
      response += `*${cat}* ${city}\n`
      response += `#1 spot: OPEN (min bid $0.10)\n\n`
    }
  }

  response += 'Type `bid` to start bidding, or `bid <category> <city> <amount>` for a quick bid.'

  await sendWhatsAppMessage(phone, response)
}

/**
 * ONBOARDING FLOW HANDLERS
 * ==========================
 * These handle the 5-stage sequential flow:
 * 1. LISTING_SUBMITTED -> AWAITING_ADMIN_REVIEW (admin action)
 * 2. AWAITING_ADMIN_REVIEW -> APPROVED_AWAITING_PACKAGE (admin approves, sends package list)
 * 3. APPROVED_AWAITING_PACKAGE -> AWAITING_ECOCASH_NUMBER (user selects package)
 * 4. AWAITING_ECOCASH_NUMBER -> PAYMENT_PENDING (user provides EcoCash, payment initiated)
 * 5. PAYMENT_PENDING -> ACTIVE (webhook confirms payment, activates)
 *
 * Terminal states: REJECTED, CANCELLED, PAYMENT_FAILED, EXPIRED
 */

const PLAN_CONFIG = {
  '1m': { price: 2.0, days: 30, label: '1 Month — $2.00' },
  '6m': { price: 10.0, days: 180, label: '6 Months — $10.00 (save $2)' },
  '12m': { price: 20.0, days: 360, label: '12 Months — $20.00 (save $4)' },
} as const

type PlanType = keyof typeof PLAN_CONFIG

async function handlePackageSelection(phone: string, text: string, context: any) {
  const lower = text.toLowerCase().trim()

  // Handle package selection: "1m", "6m", "12m" or "1", "2", "3"
  let selectedPlan: PlanType | null = null

  if (lower === '1m' || lower === '1' || lower === 'one') selectedPlan = '1m'
  else if (lower === '6m' || lower === '6' || lower === 'six') selectedPlan = '6m'
  else if (lower === '12m' || lower === '12' || lower === 'twelve') selectedPlan = '12m'

  if (selectedPlan) {
    const plan = PLAN_CONFIG[selectedPlan]

    // Store selected package and prompt for EcoCash number
    await updateConversationContext(phone, { selectedPackage: selectedPlan })
    await setConversationState(phone, 'AWAITING_ECOCASH_NUMBER', { ...context, selectedPackage: selectedPlan })

    await sendWhatsAppMessage(
      phone,
      `✅ *Package Selected: ${plan.label}*\n\n` +
      `Now please provide your *EcoCash number* (must be an Econet number starting with 077, 078, or 073) to proceed with payment.\n\n` +
      `Example: 0771234567`
    )
    return
  }

  // If not a valid selection, re-show the package list
  await sendPackageSelectionList(phone, context)
}

async function sendPackageSelectionList(phone: string, context: any) {
  const businessName = context.businessName || 'your business'

  const rows = Object.entries(PLAN_CONFIG).map(([key, plan]) => ({
    id: `pkg_${key}`,
    title: plan.label,
    description: `${plan.days} days of verified listing`,
  }))

  await sendInteractiveList(
    phone,
    `📦 *Choose a Plan for ${businessName}*\n\nSelect a subscription plan to activate your listing:`,
    rows,
    'Choose Plan'
  )
}

/**
 * Handle trial selection from APPROVED_TRIAL_SELECTION state.
 * If trial is accepted, activate the 90-day free trial.
 */
async function handleTrialSelection(phone: string, context: any) {
  const { getSupabaseAdmin } = await import('@/lib/supabase-server')
  const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
  const { setConversationState } = await import('@/lib/bot-state')

  const supabase = getSupabaseAdmin()
  const businessId = context.businessId

  if (!businessId) {
    await sendWhatsAppMessage(phone, '❌ Session error: business ID missing. Please contact support.')
    return
  }

  const now = new Date()
  const trialExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  // Update subscription with trial details
  const { error: subError } = await supabase
    .from('listing_subscriptions')
    .update({
      status: 'active',
      amount: 0,
      plan: '1m',
      trial_eligible: false,
      trial_activated_at: now.toISOString(),
      trial_expires_at: trialExpiresAt.toISOString(),
    })
    .eq('business_id', businessId)
    .eq('trial_eligible', true)

  if (subError) {
    console.error('[webhook] Trial activation error:', subError)
    await sendWhatsAppMessage(phone, '❌ Failed to activate trial. Please try again.')
    return
  }

  // Update business status
  await supabase
    .from('businesses')
    .update({
      payment_status: 'active',
      verified: true,
      listing_activated_at: now.toISOString(),
    })
    .eq('id', businessId)

  // Set conversation state
  await setConversationState(phone, 'TRIAL_ACTIVE', {
    ...context,
    trialActivatedAt: now.toISOString(),
    trialExpiresAt: trialExpiresAt.toISOString(),
    subscriptionType: 'trial',
  })

  // Send confirmation
  await sendWhatsAppMessage(
    phone,
    `🎉 *90-Day FREE Trial Activated!*

Your business *${context.businessName}* is now live on WA Directory!

⏰ Trial period: ${now.toISOString().slice(0, 10)} to ${trialExpiresAt.toISOString().slice(0, 10)}

No payment required. At the end of 90 days, you'll receive a reminder to renew.

• Profile: ${SITE_URL}/business/${context.businessSlug || context.businessName}
• QR codes available when you log in

Reply *help* anytime.`
  )
}

/**
 * Handle text messages during trial selection state.
 */
async function handleTrialSelectionState(phone: string, text: string, context: any) {
  const lower = text.toLowerCase().trim()

  // "cancel" or "payment" or "paid" means they want to skip trial and pay
  if (lower === 'cancel' || lower === 'payment' || lower === 'paid') {
    await sendWhatsAppMessage(
      phone,
      `📦 *Choose Your Plan*\n\nSelect a subscription plan to activate your listing:\n\n` +
      `1m — 1 Month — $2.00\n` +
      `6m — 6 Months — $10.00 (save $2)\n` +
      `12m — 12 Months — $20.00 (save $4)\n\n` +
      `Reply with 1, 6, 12 or the full code (1m, 6m, 12m).`
    )
    return
  }

  // Treat any number as package selection
  if (/^[1-6]$/.test(lower)) {
    const planMap: Record<string, string> = {
      '1': '1m',
      'one': '1m',
      '6': '6m',
      'six': '6m',
      '12': '12m',
      'twelve': '12m',
    }
    const planKey = planMap[lower] || lower
    await handlePackageSelection(phone, planKey, context)
    return
  }

  await sendWhatsAppMessage(
    phone,
    `Reply with:\n` +
    `• *trial* — Start your 90-day free trial\n` +
    `• *1* or *1m* — Pay $2 for 1 month\n` +
    `• *6* or *6m* — Pay $10 for 6 months\n` +
    `• *12* or *12m* — Pay $20 for 12 months\n` +
    `• *cancel* — Start over`
  )
}

/**
 * Handle messages during active trial period.
 */
async function handleTrialActiveState(phone: string, text: string, context: any) {
  const lower = text.toLowerCase().trim()

  if (lower === 'help' || lower === 'menu') {
    await sendTrialHelpMessage(phone, context)
    return
  }

  if (lower === 'paid' || lower === 'subscription') {
    await sendTrialStatusMessage(phone, context)
    return
  }

  // For active trial, allow normal business commands
  // Just acknowledge and provide help
  await sendWhatsAppMessage(
    phone,
    `Your 90-day free trial is active until *${context.trialExpiresAt?.slice(0, 10) || 'TBD'}*.\n\n` +
    `Type *paid* for subscription status, or *help* for commands.`
  )
}

/**
 * Handle messages during trial expiry (within 3 days).
 */
async function handleTrialExpiringState(phone: string, text: string, context: any) {
  await sendWhatsAppMessage(
    phone,
    `⏳ *Trial Expiring Soon*\n\n` +
    `Your 90-day free trial expires in 3 days.\n\n` +
    `Type *paid* to renew now or *help* to see options.`
  )
}

/**
 * Handle messages after trial has expired.
 */
async function handleTrialExpiredState(phone: string, text: string, context: any) {
  await sendWhatsAppMessage(
    phone,
    `⏰ *Trial Expired*\n\n` +
    `Your 90-day free trial has ended.\n\n` +
    `Your listing is now inactive.\n\n` +
    `Type *paid* to renew your subscription and go live again.\n\n` +
    `Contact support if you need assistance.`
  )
}

/**
 * Send help message for trial businesses.
 */
async function sendTrialHelpMessage(phone: string, context: any) {
  const daysRem = context.trialExpiresAt
    ? Math.ceil((new Date(context.trialExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : 0

  await sendWhatsAppMessage(
    phone,
    `🤖 *WA Directory Help*\n\n` +
    `📊 Trial ends in ${daysRem > 0 ? `${daysRem} days` : 'soon'}\n\n` +
    `*Commands:*\n` +
    `• *paid* — Check subscription status\n` +
    `• *pay* — Renew subscription\n` +
    `• *help* — This menu\n\n` +
    `Your listing: ${SITE_URL}/business/${context.businessSlug || context.businessName || 'your-listing'}`
  )
}

/**
 * Send trial status message.
 */
async function sendTrialStatusMessage(phone: string, context: any) {
  const daysRem = context.trialExpiresAt
    ? Math.ceil((new Date(context.trialExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : 0

  await sendWhatsAppMessage(
    phone,
    `📊 *Subscription Status*\n\n` +
    `Type: FREE TRIAL\n` +
    `Expires: ${context.trialExpiresAt?.slice(0, 10)}\n` +
    `Days remaining: ${daysRem > 0 ? `${daysRem} days` : 'Expired'}\n\n` +
    `When trial ends, renew with \`pay\` for your preferred plan.`
  )
}

async function handleEcoCashNumber(phone: string, text: string, context: any) {
  const cleaned = text.replace(/[^0-9]/g, '')

  // Validate Zimbabwe mobile number format
  if (!cleaned.match(/^(?:263|0)?(77|78|73)\d{7}$/)) {
    await sendWhatsAppMessage(
      phone,
      '❌ *Invalid EcoCash Number*\n\n' +
      'Please enter a valid Econet number (starts with 077, 078, or 073).\n\n' +
      'Example: 0771234567 or 263771234567'
    )
    return
  }

  // Normalize to international format (263XXXXXXXXX)
  let normalized = cleaned
  if (normalized.startsWith('0')) {
    normalized = '263' + normalized.slice(1)
  } else if (!normalized.startsWith('263')) {
    normalized = '263' + normalized
  }

  // Verify it's an Econet number (for EcoCash)
  const prefix = normalized.slice(3, 5)
  if (!['77', '78', '73'].includes(prefix)) {
    await sendWhatsAppMessage(
      phone,
      '❌ *EcoCash requires an Econet number*\n\n' +
      'Please provide a number starting with 077, 078, or 073.\n\n' +
      'Other networks (NetOne, Telecel) are not supported for EcoCash payments.'
    )
    return
  }

  // Store EcoCash number and initiate payment
  const selectedPlan = context.selectedPackage as PlanType
  if (!selectedPlan) {
    await sendWhatsAppMessage(phone, '❌ Session error: no package selected. Please start over.')
    await setConversationState(phone, 'APPROVED_AWAITING_PACKAGE', context)
    await sendPackageSelectionList(phone, context)
    return
  }

  const plan = PLAN_CONFIG[selectedPlan]
  const businessId = context.businessId || context.listingId

  if (!businessId) {
    await sendWhatsAppMessage(phone, '❌ Session error: business ID missing. Please contact support.')
    return
  }

  // Import paynow dynamically to avoid circular deps
  const { initiateEcoCashPayment } = await import('@/lib/paynow')

  const supabase = getSupabase()

  // Create or get subscription record
  let subscriptionId = context.subscriptionId
  if (!subscriptionId) {
    const { data: sub, error } = await supabase
      .from('listing_subscriptions')
      .insert({
        business_id: businessId,
        plan: selectedPlan,
        amount: plan.price,
        status: 'pending',
        payment_method: 'ecocash',
        paynow_reference: `LISTING-${businessId}-${Date.now()}`,
      })
      .select('id')
      .single()

    if (error || !sub) {
      console.error('[webhook] Failed to create subscription:', error)
      await sendWhatsAppMessage(phone, '❌ Failed to create payment record. Please try again.')
      return
    }
    subscriptionId = sub.id
    await updateConversationContext(phone, { subscriptionId })
  }

  // Initiate EcoCash payment
  const paynowRef = `LISTING-${subscriptionId}`
  const result = await initiateEcoCashPayment({
    phone: normalized,
    amount: plan.price,
    reference: paynowRef,
    additionalInfo: `WA Directory - ${plan.label} subscription for ${context.businessName || 'your business'}`,
  })

  if (!result.ok) {
    await sendWhatsAppMessage(
      phone,
      `❌ *Payment Initiation Failed*\n\n${result.error || 'Could not start EcoCash payment. Please try again.'}`
    )
    await setConversationState(phone, 'PAYMENT_FAILED', { ...context, lastError: result.error })
    return
  }

  // Update state to PAYMENT_PENDING with paynow details
  await setConversationState(phone, 'PAYMENT_PENDING', {
    ...context,
    ecocashNumber: normalized,
    paynowReference: paynowRef,
    paynowPollUrl: result.pollUrl,
  })

  await sendWhatsAppMessage(
    phone,
    `✅ *EcoCash Payment Initiated*\n\n` +
    `A payment request for *$${plan.price.toFixed(2)}* has been sent to *${formatPhone(normalized)}*.\n\n` +
    `📱 *Action Required:*\n` +
    `1. Check your phone for the EcoCash prompt\n` +
    `2. Enter your EcoCash PIN to authorize\n` +
    `3. You'll receive a confirmation SMS\n\n` +
    `⏳ This will complete automatically. Do not send another number.\n\n` +
    `*Reference:* ${paynowRef}`
  )
}

function formatPhone(num: string): string {
  if (num.startsWith('263')) {
    return `+263 ${num.slice(3).replace(/(\d{3})(?=\d)/g, '$1 ')}`
  }
  return num
}

async function handlePaymentPending(phone: string, text: string, context: any) {
  // User might be asking for status or there's a delay
  const lower = text.toLowerCase().trim()

  if (lower === 'status' || lower === 'check' || lower === 'pending') {
    await sendWhatsAppMessage(
      phone,
      `⏳ *Payment Still Pending*\n\n` +
      `Your EcoCash payment is being processed. This usually takes 1-2 minutes.\n\n` +
      `Reference: ${context.paynowReference || 'N/A'}\n\n` +
      `If you authorized the payment but it's not completing, type *retry* or wait a moment.`
    )
    return
  }

  if (lower === 'retry' || lower === 'resend') {
    // Re-initiate payment
    await handleEcoCashNumber(phone, context.ecocashNumber || '', context)
    return
  }

  // Default: remind them payment is pending
  await sendWhatsAppMessage(
    phone,
    `⏳ Your payment is still processing. Please wait for the EcoCash confirmation SMS.\n\n` +
    `Type *status* to check, or *retry* to resend the payment prompt.`
  )
}

async function handleRejectedFlow(phone: string, text: string, context: any) {
  const lower = text.toLowerCase().trim()
  const reason = context.rejectionReason || 'No reason provided'

  if (lower === 'resubmit' || lower === 'retry' || lower === 'again') {
    // Clear state and let them start fresh
    await clearConversationState(phone)
    await sendWhatsAppMessage(
      phone,
      `🔄 *Resubmit Your Listing*\n\n` +
      `Your previous listing was rejected: ${reason}\n\n` +
      `To submit a new listing, send *register* and follow the prompts.`
    )
    return
  }

  await sendWhatsAppMessage(
    phone,
    `❌ *Listing Rejected*\n\n` +
    `Reason: ${reason}\n\n` +
    `You can:\n` +
    `• Type *resubmit* to start a new listing\n` +
    `• Contact support if you believe this was an error`
  )
}

// Export for admin approval trigger
export async function notifyAdminApproval(
  businessId: string,
  adminNote?: string,
  offerTrial: boolean = false
) {
  const { getSupabaseAdmin } = await import('@/lib/supabase-server')
  const { sendWhatsAppMessage, sendInteractiveList } = await import('@/lib/whatsapp')
  const { setConversationState, updateConversationContext } = await import('@/lib/bot-state')

  const supabase = getSupabaseAdmin()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone, category, city')
    .eq('id', businessId)
    .single()

  if (!business?.phone) return false

  const phone = business.phone

  // Update business status to approved
  await supabase
    .from('businesses')
    .update({ verified: true, payment_status: 'pending', admin_note: adminNote })
    .eq('id', businessId)

  // Check trial eligibility and set trial_eligible flag on subscription record
  const { data: trialCheck } = await supabase
    .from('businesses')
    .select('id, category, payment_status')
    .eq('id', businessId)
    .single()

  const { data: specialCats } = await supabase
    .from('categories')
    .select('name')
    .eq('special', true)
    .in('name', trialCheck?.category || [])

  const isEligibleForTrial = (offerTrial || !specialCats || specialCats.length === 0) &&
    !(trialCheck?.payment_status === 'active')

  // Create subscription record with trial eligibility
  const { data: subRecord } = await supabase
    .from('listing_subscriptions')
    .insert({
      business_id: businessId,
      status: isEligibleForTrial ? 'pending' : 'pending',
      amount: isEligibleForTrial ? 0 : 2,
      trial_eligible: isEligibleForTrial,
    })
    .select('id')
    .single()

  // Set conversation state - include trial_offered flag
  await setConversationState(phone, 'APPROVED_TRIAL_SELECTION', {
    businessId: business.id,
    businessName: business.name,
    category: business.category?.[0],
    city: business.city,
    trialOffered: isEligibleForTrial,
    subscriptionId: subRecord?.id,
  })

  // Send trial vs payment selection
  await sendTrialOrPackageSelection(phone, {
    businessName: business.name,
    trialOffered: isEligibleForTrial,
  })

  // Send category-specific educational image after verification confirmation
  const { sendCategoryEducationalImage } = await import('@/lib/category-education')
  await sendCategoryEducationalImage(phone, business.category).catch(() => {})

  return true
}

/**
 * Send trial or package selection to the business owner.
 * Shows free trial option if eligible, otherwise shows package selection.
 */
async function sendTrialOrPackageSelection(
  phone: string,
  context: { businessName: string; trialOffered: boolean }
) {
  const { sendInteractiveList, sendWhatsAppMessage } = await import('@/lib/whatsapp')
  const { setConversationState } = await import('@/lib/bot-state')
  const supabase = getSupabase()

  const businessName = context.businessName

  if (context.trialOffered) {
    // Show trial option
    const rows = [
      {
        id: 'trial_free',
        title: '90-Day Free Trial',
        description: 'Go live for 90 days free — no payment required',
      },
      {
        id: 'pkg_1m',
        title: '1 Month — $2.00',
        description: 'Quick activation, best for testing',
      },
      {
        id: 'pkg_6m',
        title: '6 Months — $10.00',
        description: 'Save $2 with the most popular plan',
      },
      {
        id: 'pkg_12m',
        title: '12 Months — $20.00',
        description: 'Save $4, annual commitment',
      },
    ]

    await sendInteractiveList(
      phone,
      `🎉 *Welcome, ${businessName}!*\n\nYour listing is verified. Choose how to activate:`,
      rows,
      'Activate Listing'
    )
  } else {
    // Not eligible for trial - show package selection only
    await sendPackageSelectionList(phone, { businessName })
  }
}

/**
 * Activate a trial for a business.
 */
export async function notifyTrialActivation(
  businessId: string,
  adminNote?: string
): Promise<boolean> {
  const { getSupabaseAdmin } = await import('@/lib/supabase-server')
  const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
  const { setConversationState, clearConversationState } = await import('@/lib/bot-state')

  const supabase = getSupabaseAdmin()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone, slug, username, edit_token, category')
    .eq('id', businessId)
    .single()

  if (!business?.phone) return false

  const phone = business.phone
  const now = new Date()
  const trialExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  // Update subscription with trial details
  await supabase
    .from('listing_subscriptions')
    .upsert({
      business_id: businessId,
      status: 'active',
      amount: 0,
      plan: '1m', // Trial uses 1m plan key
      trial_eligible: false,
      trial_activated_at: now.toISOString(),
      trial_expires_at: trialExpiresAt.toISOString(),
    })

  // Update business status
  await supabase
    .from('businesses')
    .update({
      payment_status: 'active',
      verified: true,
      listing_activated_at: now.toISOString(),
      admin_note: adminNote || '90-day free trial activated',
    })
    .eq('id', businessId)

  // Set conversation state with trial info
  await setConversationState(phone, 'TRIAL_ACTIVE', {
    businessId: business.id,
    businessName: business.name,
    category: business.category?.[0],
    trialActivatedAt: now.toISOString(),
    trialExpiresAt: trialExpiresAt.toISOString(),
    subscriptionType: 'trial',
  })

  // Send confirmation message
  await sendWhatsAppMessage(
    phone,
    `🎉 *90-Day FREE Trial Activated!*

Your business *${business.name}* is now live on WA Directory!

⏰ Trial period: ${now.toISOString().slice(0, 10)} to ${trialExpiresAt.toISOString().slice(0, 10)}

No payment required. At the end of 90 days, you'll receive a reminder to renew.

*Your links:*
• Profile: ${SITE_URL}/business/${business.slug || business.username}
• QR codes: ${SITE_URL}/my-qr/${business.slug || business.username}

Reply *help* anytime.`
  )

  return true
}

export async function notifyRejection(businessId: string, reason: string) {
  const { getSupabaseAdmin } = await import('@/lib/supabase-server')
  const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
  const { setConversationState } = await import('@/lib/bot-state')

  const supabase = getSupabaseAdmin()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone')
    .eq('id', businessId)
    .single()

  if (!business?.phone) return false

  await supabase
    .from('businesses')
    .update({ verified: false, payment_status: 'rejected', rejection_reason: reason })
    .eq('id', businessId)

  await setConversationState(business.phone, 'REJECTED', {
    businessId: business.id,
    businessName: business.name,
    rejectionReason: reason,
  })

  await sendWhatsAppMessage(
    business.phone,
    `❌ *Listing Not Approved*\n\n` +
    `We couldn't approve your listing for *${business.name}* at this time.\n\n` +
    `Reason: ${reason}\n\n` +
    `You can type *resubmit* to submit a corrected listing, or contact support for help.`
  )

  return true
}