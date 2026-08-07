import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Server-side curator auth.
 *
 * The PIN must never reach the browser. The client posts a typed PIN to
 * /api/ada-login, the server checks it here and hands back an httpOnly cookie;
 * every subsequent write is authorized by that cookie alone. Nothing secret is
 * compiled into the client bundle.
 *
 * The session token is self-contained — `<expiry>.<hmac>` — so it verifies with
 * no session store. ADA_PIN doubles as the signing key, which means rotating the
 * PIN also invalidates every outstanding session. That is the behaviour you want
 * from a rotation.
 */

export const ADA_COOKIE = 'kk_ada'
export const SESSION_MS = 12 * 60 * 60 * 1000 // 12 hours

/** Throws when ADA_PIN is unset, so callers fail closed instead of open. */
function secret(): string {
  const s = process.env.ADA_PIN
  if (!s) throw new Error('ADA_PIN is not set')
  return s
}

/** Fixed-width digest so comparisons never leak length via timing. */
function digest(value: string, key: string): Buffer {
  return createHmac('sha256', key).update(value).digest()
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b)
}

export function isConfigured(): boolean {
  return Boolean(process.env.ADA_PIN)
}

/** Constant-time PIN check. Both sides are hashed first, so length never leaks. */
export function checkPin(candidate: string): boolean {
  return safeEqual(digest(candidate, 'ada-pin-compare'), digest(secret(), 'ada-pin-compare'))
}

export function mintToken(now: number = Date.now()): string {
  const exp = String(now + SESSION_MS)
  return `${exp}.${digest(exp, secret()).toString('hex')}`
}

export function verifyToken(token: string | undefined, now: number = Date.now()): boolean {
  if (!token) return false

  const split = token.lastIndexOf('.')
  if (split <= 0) return false

  const exp = token.slice(0, split)
  const mac = token.slice(split + 1)

  let expected: Buffer
  try {
    expected = digest(exp, secret())
  } catch {
    return false // ADA_PIN unset — fail closed
  }

  // Verify the signature before trusting the expiry it protects.
  let provided: Buffer
  try {
    provided = Buffer.from(mac, 'hex')
  } catch {
    return false
  }
  if (!safeEqual(provided, expected)) return false

  const expMs = Number(exp)
  return Number.isFinite(expMs) && expMs > now
}
