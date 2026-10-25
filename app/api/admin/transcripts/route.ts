import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { transcriptCallers, transcriptFor } from '@/lib/bot-log'

export async function GET(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  const phone = new URL(request.url).searchParams.get('phone') || ''
  if (phone) {
    const messages = await transcriptFor(phone)
    return NextResponse.json({ phone, messages })
  }
  const callers = await transcriptCallers(14)
  return NextResponse.json({ callers })
}
