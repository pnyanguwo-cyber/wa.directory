import { NextResponse } from 'next/server'

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'wa-directory-verify-2024'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  console.warn('Webhook verification failed', { mode, token })
  return new NextResponse('Verification failed', { status: 403 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (value?.messages) {
      for (const message of value.messages) {
        const from = message.from
        const text = message.text?.body?.toLowerCase() || ''

        console.log(`WhatsApp message from ${from}: ${text}`)

        if (text.includes('list me')) {
          await sendWhatsAppMessage(
            from,
            'To list your business on WA Directory, visit https://wadirectory.vercel.app/list or reply with your business name.'
          )
        } else if (text.includes('hello') || text.includes('hi')) {
          await sendWhatsAppMessage(
            from,
            'Hello! Welcome to WA Directory. Find any business on WhatsApp. Reply "LIST ME" to list your business.'
          )
        }
      }
    }

    if (value?.catalog_update) {
      console.log('Catalog update received:', JSON.stringify(value.catalog_update))
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

async function sendWhatsAppMessage(to: string, text: string) {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID
  const token = process.env.WA_ACCESS_TOKEN

  if (!phoneNumberId || !token) {
    console.warn('WA_PHONE_NUMBER_ID or WA_ACCESS_TOKEN not set')
    return
  }

  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      }
    )
  } catch (err) {
    console.error('Failed to send WhatsApp message:', err)
  }
}
