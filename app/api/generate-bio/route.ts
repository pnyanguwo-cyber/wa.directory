import { NextResponse } from 'next/server'
import { callGemini } from '@/lib/gemini'

export async function POST(request: Request) {
  try {
    const { description } = await request.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    // With the key present, callGemini's null → the empty-result fallback;
    // with no key configured, keep the richer template fallback.
    const bio =
      process.env.GEMINI_API_KEY
        ? (await callGemini(
            `Write a 1-2 sentence professional bio for a business that does: ${description}. Be concise, direct, no fluff. Just the bio, no introduction. Do not use em-dashes (—), use commas or colons instead.`
          )) || `Professional ${description} services. Contact us today.`
        : `Professional ${description} services. Contact us today for reliable and affordable service.`

    return NextResponse.json({ bio })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
