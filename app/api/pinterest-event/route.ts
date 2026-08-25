import { NextResponse, type NextRequest } from 'next/server'
import {
  isPinterestEvent,
  sendConversionEvents,
  type ConversionEvent,
} from '@/lib/pinterest-capi'
import { ADA_COOKIE, verifyToken } from '@/lib/ada-auth'

/**
 * The only door between the browser and the Conversions API.
 *
 * The client sends what only the client knows — which event, which products,
 * the page URL. Everything that identifies the visitor is read HERE, from the
 * request itself: a body that could set its own IP or user-agent would let any
 * caller forge conversions against the ad account, and the ad account is what
 * gets billed.
 *
 * POST only, and /api/ is disallowed in robots.txt, so a crawler cannot trip it.
 */

/** Cap per request. The API allows far more; a page has no reason to send it. */
const MAX_EVENTS = 10

/**
 * Vercel puts the real client IP first in x-forwarded-for and appends its own
 * proxy hops after it. Taking the whole header would send Pinterest a
 * comma-joined list it cannot match on.
 */
function clientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get('x-forwarded-for')
  const first = xff?.split(',')[0]?.trim()
  return first || req.headers.get('x-real-ip') || undefined
}

/**
 * Pinterest's click identifier. It lands in the `_epik` cookie when a visitor
 * arrives from a pin, and it is the single field that most improves attribution
 * — without it Pinterest is matching on IP and user-agent alone.
 */
function clickId(req: NextRequest): string | undefined {
  return req.cookies.get('_epik')?.value || undefined
}

export async function POST(req: NextRequest) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }

  const raw = (payload as { events?: unknown })?.events
  if (!Array.isArray(raw) || !raw.length) {
    return NextResponse.json({ ok: false, error: 'no events' }, { status: 400 })
  }

  const events: ConversionEvent[] = []
  for (const item of raw.slice(0, MAX_EVENTS)) {
    const e = item as Record<string, unknown>
    // An unknown event_name is rejected by Pinterest and takes the whole batch
    // with it, so screen here rather than paying a round trip to find out.
    if (!isPinterestEvent(e.event_name)) continue
    if (typeof e.event_id !== 'string' || !e.event_id) continue
    events.push({
      event_name: e.event_name,
      event_id: e.event_id,
      event_source_url: typeof e.event_source_url === 'string' ? e.event_source_url : undefined,
      custom_data: (e.custom_data && typeof e.custom_data === 'object')
        ? (e.custom_data as Record<string, unknown>)
        : undefined,
      opt_out: e.opt_out === true,
    })
  }
  if (!events.length) {
    return NextResponse.json({ ok: false, error: 'no valid events' }, { status: 400 })
  }

  // Two signals, deliberately not treated as one.
  //
  // Global Privacy Control is a CCPA/CPRA "do not sell or share my personal
  // information" signal — a legal request, which is why it also sets
  // `opt_out_type: LDP` (Limited Data Processing) in custom_data.
  //
  // Do Not Track is a browser preference with no legal force. We honour it with
  // the top-level `opt_out` flag, but claiming LDP on the back of it would be
  // asserting a legal basis that was never given.
  const gpc = req.headers.get('sec-gpc') === '1'
  const dnt = req.headers.get('dnt') === '1'
  if (gpc || dnt) {
    for (const e of events) {
      e.opt_out = true
      if (gpc) e.opt_out_type = 'LDP'
    }
  }

  /**
   * `?test=1` forwards Pinterest's own `?test=true`: the payload is validated
   * and the real response messages come back, but nothing is recorded. It is
   * how you confirm the events are constructed correctly before any of it
   * counts, and it pairs with the Test events tool in Ads Manager.
   *
   * Behind the curator cookie, for two reasons. Pinterest's docs warn to be
   * certain test mode is off before sending a legitimate request — an
   * unauthenticated switch that silently voids real conversions is a foot-gun
   * left where anyone can reach it. And an open test endpoint is free traffic
   * against the ad account's rate limit.
   *
   * It also returns the API's response instead of swallowing it, because the
   * whole point of a test is seeing what Pinterest said.
   */
  let test = false
  if (req.nextUrl.searchParams.get('test') === '1') {
    let authorized = false
    try {
      authorized = verifyToken(req.cookies.get(ADA_COOKIE)?.value)
    } catch {
      authorized = false // ADA_PIN unset: fail closed, same as everywhere else
    }
    if (!authorized) {
      return NextResponse.json({ ok: false, error: 'test mode requires curator auth' }, { status: 401 })
    }
    test = true
  }

  const result = await sendConversionEvents(events, {
    client_ip_address: clientIp(req),
    client_user_agent: req.headers.get('user-agent') ?? undefined,
    click_id: clickId(req),
  }, test)

  // A test run wants the detail; an ordinary visitor's page does not.
  if (test) return NextResponse.json({ ok: true, test: true, result })

  // Always 200 to the browser otherwise. A failure here is an analytics
  // problem, not the visitor's, and a non-2xx would surface as a console error
  // on a page that is working perfectly well.
  return NextResponse.json({ ok: result.status !== 'failed', status: result.status })
}
