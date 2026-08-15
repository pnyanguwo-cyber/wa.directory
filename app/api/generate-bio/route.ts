import { NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

export async function POST(request: Request) {
  try {
    const { description } = await request.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      const fallback = `Professional ${description} services. Contact us today for reliable and affordable service.`
      return NextResponse.json({ bio: fallback })
    }

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Write a 1-2 sentence professional bio for a business that does: ${description}. Be concise, direct, no fluff. Just the bio, no introduction.`,
              },
            ],
          },
        ],
      }),
    })

    const data = await res.json()

    const bio =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      `Professional ${description} services. Contact us today.`

    return NextResponse.json({ bio })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
