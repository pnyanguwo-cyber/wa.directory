import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BUSINESS_COOKIE = 'business_session'
const ADMIN_COOKIE = 'admin_token'

async function hmacBase64Url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function verifyBusinessToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.BUSINESS_AUTH_SECRET
    if (!secret) return false
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [businessId, expiry, sig] = parts
    const expected = await hmacBase64Url(secret, `${businessId}.${expiry}`)
    if (sig !== expected) return false
    return Number(expiry) > Date.now()
  } catch {
    return false
  }
}

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.BUSINESS_AUTH_SECRET
    if (!secret) return false
    const parts = token.split('.')
    if (parts.length !== 2) return false
    const [expiry, sig] = parts
    const expected = await hmacBase64Url(secret, `admin:${expiry}`)
    if (sig !== expected) return false
    return Number(expiry) > Date.now()
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/admin')) {
    const token = request.cookies.get(ADMIN_COOKIE)
    if (!token || !(await verifyAdminToken(token.value))) {
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