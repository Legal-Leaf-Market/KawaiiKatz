import { NextResponse, type NextRequest } from 'next/server'
import {
  isPinterestEvent,
  sendConversionEvents,
  type ConversionEvent,
} from '@/lib/pinterest-capi'

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

  // Honour Do Not Track / Global Privacy Control. Pinterest's `opt_out` flag
  // exists for exactly this, and it is cheaper to respect than to explain.
  const dnt = req.headers.get('dnt') === '1' || req.headers.get('sec-gpc') === '1'
  if (dnt) for (const e of events) e.opt_out = true

  const result = await sendConversionEvents(events, {
    client_ip_address: clientIp(req),
    client_user_agent: req.headers.get('user-agent') ?? undefined,
    click_id: clickId(req),
  })

  // Always 200 to the browser. A failure here is an analytics problem, not the
  // visitor's, and a non-2xx would show up as a console error on a working page.
  return NextResponse.json({ ok: result.status !== 'failed', status: result.status })
}
