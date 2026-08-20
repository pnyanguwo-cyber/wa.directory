import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'business_session'

function secret(): string {
  const s = process.env.BUSINESS_AUTH_SECRET
  if (!s) throw new Error('BUSINESS_AUTH_SECRET is not set')
  return s
}

function normalizePhone(phone: string): string {
  return '+' + phone.replace(/\D/g, '')
}

export function signBusinessToken(businessId: string): string {
  const payload = `${businessId}.${Date.now() + 30 * 24 * 60 * 60 * 1000}`
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyBusinessToken(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [businessId, expiry, sig] = parts
    const expected = createHmac('sha256', secret()).update(`${businessId}.${expiry}`).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    if (Number(expiry) < Date.now()) return null
    return businessId
  } catch {
    return null
  }
}

export function setBusinessSession(businessId: string): void {
  cookies().set(COOKIE, signBusinessToken(businessId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
}

export function clearBusinessSession(): void {
  cookies().delete(COOKIE)
}

export function getBusinessId(): string | null {
  const token = cookies().get(COOKIE)?.value
  if (!token) return null
  return verifyBusinessToken(token)
}

export { normalizePhone }