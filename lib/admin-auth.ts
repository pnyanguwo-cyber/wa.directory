import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual, createHash } from 'node:crypto'

const COOKIE = 'admin_token'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

// Fail closed: no hardcoded fallback. If the secret is unset, tokens can be
// neither issued nor verified, so admin access is denied rather than forgeable.
function secret(): string | null {
  return process.env.BUSINESS_AUTH_SECRET || null
}

// Signed, expiring admin session token. Domain-separated from business tokens
// by the `admin:` prefix in the signed message (and by having 2 dot-parts
// instead of 3), so an admin token can never validate as a business token or
// vice versa.
export function signAdminToken(): string {
  const s = secret()
  if (!s) throw new Error('BUSINESS_AUTH_SECRET is not set')
  const expiry = Date.now() + MAX_AGE_MS
  const sig = createHmac('sha256', s).update(`admin:${expiry}`).digest('base64url')
  return `${expiry}.${sig}`
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false
  const s = secret()
  if (!s) return false
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return false
    const [expiry, sig] = parts
    const expected = createHmac('sha256', s).update(`admin:${expiry}`).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
    const exp = Number(expiry)
    if (!Number.isFinite(exp) || exp < Date.now()) return false
    return true
  } catch {
    return false
  }
}

// Constant-time password check that does not leak length. Both sides are
// hashed to a fixed-width digest before comparison.
export function verifyAdminPassword(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  const a = createHash('sha256').update(String(input)).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export function isAdmin(): boolean {
  return verifyAdminToken(cookies().get(COOKIE)?.value)
}

export { COOKIE as ADMIN_COOKIE, MAX_AGE_MS as ADMIN_MAX_AGE_MS }
