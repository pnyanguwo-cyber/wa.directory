import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Server misconfigured' },
        { status: 500 }
      )
    }

    if (password === process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    )
  }
}
