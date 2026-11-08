import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage, sendInteractiveList, sendInteractiveButtons } from '@/lib/whatsapp'
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

async function handleMessages(value: any) {
  const contacts = value.contacts || []
  const messages = value.messages || []

  for (const msg of messages) {
    const phone = msg.from // already in international format (e.g. "263771234567")
    const text = msg.text?.body?.trim() || ''
    const msgId = msg.id

    if (!text) continue

    await logBotMessage(phone, 'in', msg.type, text)

    // 3. Route commands
    if (text.toLowerCase() === 'bid' || text.toLowerCase().startsWith('bid ')) {
      await handleBidCommand(phone, text)
    } else if (text.toLowerCase() === 'ranking' || text.toLowerCase() === 'my ranking') {
      await handleRankingCommand(phone)
    } else if (text.toLowerCase() === 'my bids') {
      await handleMyBidsCommand(phone)
    } else if (text.toLowerCase() === 'outbid') {
      await handleOutbidCommand(phone)
    } else if (text.toLowerCase().startsWith('bid_cat_')) {
      await handleBidCategorySelection(phone, text)
    } else if (text.toLowerCase().startsWith('bid_city_')) {
      await handleBidCitySelection(phone, text)
    } else if (text.toLowerCase().startsWith('bid_amt_')) {
      // Format: bid_amt_1.50
      const amountStr = text.replace('bid_amt_', '')
      const amount = parseFloat(amountStr)
      if (!isNaN(amount)) {
        // We need to get the business to find their pending bid context
        // For now, ask for confirmation with phone number
        await sendWhatsAppMessage(phone, `To confirm your bid of $${amount.toFixed(2)}/month, reply with:\n\`confirm ${amount.toFixed(2)} <your-ecocash-phone>\`\n\nExample: \`confirm 1.50 0771234567\``)
      }
    } else if (text.toLowerCase().startsWith('confirm ')) {
      await handleBidConfirm(phone, text)
    }
    // Existing commands will be handled by the external bot
  }
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
      .gte('period_end', new Date().toISOString().slice(0, 10))
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (spot) {
      const isMine = spot.business_id === business.id
      response += `*${cat}* ${city}\n`
      response += `#1 fee: $${Number(spot.monthly_fee).toFixed(2)}/mo ${isMine ? '👑 YOU' : ''}\n`
      response += `Until: ${new Date(spot.period_end).toLocaleDateString()}\n\n`
    } else {
      response += `*${cat}* ${city}\n`
      response += `#1 spot: OPEN (min bid $0.10)\n\n`
    }
  }

  response += 'Type `bid` to start bidding, or `bid <category> <city> <amount>` for a quick bid.'

  await sendWhatsAppMessage(phone, response)
}