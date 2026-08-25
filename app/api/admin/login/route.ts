import { NextResponse } from 'next/server'
import { signAdminToken, verifyAdminPassword, ADMIN_COOKIE, ADMIN_MAX_AGE_MS } from '@/lib/admin-auth'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!process.env.ADMIN_PASSWORD || !process.env.BUSINESS_AUTH_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Server misconfigured' },
        { status: 500 }
      )
    }

    if (verifyAdminPassword(password)) {
      const response = NextResponse.json({ success: true })
      response.cookies.set(ADMIN_COOKIE, signAdminToken(), {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(ADMIN_MAX_AGE_MS / 1000),
      })
      return response
    }

    return NextResponse.json({ success: false })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    )
  }
}
