import { NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

let lastCall = 0

export async function POST(request: Request) {
  const now = Date.now()
  if (now - lastCall < 5000) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }
  lastCall = now

  try {
    const { business } = await request.json()
    const adminPhone = process.env.ADMIN_WHATSAPP

    if (!adminPhone) {
      console.warn('[notify] ADMIN_WHATSAPP not set')
      return NextResponse.json({ success: false })
    }

    const message = [
      '🆕 NEW BUSINESS PENDING VERIFICATION',
      '',
      `Name: ${business.name}`,
      `Category: ${business.category}`,
      `Location: ${business.city}`,
      `Phone: ${business.phone}`,
      `Link: https://wadirectory.co.zw/admin`,
      '',
      `Reply to verify: https://wa.me/${business.phone}`,
    ].join('\n')

    await sendWhatsAppMessage(adminPhone, message)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[notify] Error:', err)
    return NextResponse.json({ success: false })
  }
}
