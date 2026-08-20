import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BUSINESS_COOKIE = 'business_session'

async function verifyBusinessToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [businessId, expiry, sig] = parts
    const secret = process.env.BUSINESS_AUTH_SECRET || 'wa-directory-dev-secret-change-me'
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const expected = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${businessId}.${expiry}`)
    )
    const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expected)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    if (sig !== expectedB64) return false
    return Number(expiry) > Date.now()
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/admin')) {
    const token = request.cookies.get('admin_token')
    if (!token || token.value !== 'true') {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
  }

  if (path.startsWith('/portal')) {
    const session = request.cookies.get(BUSINESS_COOKIE)
    if (!session || !(await verifyBusinessToken(session.value))) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*'],
}