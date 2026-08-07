import { NextResponse, type NextRequest } from 'next/server'
import { ADA_COOKIE, SESSION_MS, checkPin, isConfigured, mintToken, verifyToken } from '@/lib/ada-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}

// GET — is the caller's session still valid? Lets the client restore Ada mode on
// reload without trusting its own localStorage flag.
export async function GET(req: NextRequest) {
  return noStore({ authorized: verifyToken(req.cookies.get(ADA_COOKIE)?.value) })
}

// POST — exchange a correct PIN for an httpOnly session cookie.
export async function POST(req: NextRequest) {
  // Fail closed: with no PIN configured there is no correct answer, so refuse
  // rather than fall back to a default that would authorize everyone.
  if (!isConfigured()) return noStore({ error: 'Ada mode is not configured' }, 503)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return noStore({ error: 'Invalid body' }, 400)
  }

  const pin = typeof body.pin === 'string' ? body.pin : ''
  if (!pin || !checkPin(pin)) return noStore({ error: 'Unauthorized' }, 401)

  const res = noStore({ ok: true })
  res.cookies.set(ADA_COOKIE, mintToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MS / 1000,
  })
  return res
}

// DELETE — log out.
export async function DELETE() {
  const res = noStore({ ok: true })
  res.cookies.set(ADA_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return res
}
