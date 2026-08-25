import 'server-only'
import { createHash } from 'node:crypto'

/**
 * Pinterest Conversions API — server-side conversion reporting.
 *
 * `server-only` because it holds the bearer token. That token can post events
 * against the ad account, so it must never reach a bundle. Do NOT import this
 * from a `'use client'` file; the client talks to /api/pinterest-event instead,
 * which is the only thing that calls in here.
 *
 * -----------------------------------------------------------------------------
 * WHAT THIS CAN AND CANNOT HONESTLY REPORT
 *
 * Kawaii Katz never takes payment. Every checkout happens on the vendor's own
 * domain, under the vendor's own analytics, and we never learn whether it
 * completed. So `checkout` is REFUSED below rather than merely unused — the one
 * event an advertiser most wants to send is the one we have no evidence for,
 * and a plausible-looking guess would corrupt the ROAS figure that ad spend is
 * later judged on.
 *
 * What we can report is real: the visitor arrived, they added something to the
 * cart we do own, and they clicked out to a merchant. That last one is the
 * closest thing to a conversion this business model has, and it goes as a
 * `custom` event with its own event name rather than being dressed up as a sale.
 *
 * -----------------------------------------------------------------------------
 * DORMANT UNTIL YOU SET THE TOKEN
 *
 * With PINTEREST_CONVERSION_TOKEN unset, `send()` returns `skipped` and NOTHING
 * leaves the site. That is deliberate: until there are ads running, posting
 * every visitor's IP to Pinterest buys nothing and costs the visitor something.
 * Setting the env var is the opt-in.
 */

/** Not a secret — it appears in the API path and in Ads Manager URLs. */
export const PINTEREST_AD_ACCOUNT_ID = '549770649417'

const ENDPOINT = `https://api.pinterest.com/v5/ad_accounts/${PINTEREST_AD_ACCOUNT_ID}/events`

/**
 * The event names Pinterest accepts. `checkout` is present in their enum and
 * absent here on purpose — see the note above.
 */
export const PINTEREST_EVENTS = [
  'page_visit', 'add_to_cart', 'custom', 'lead', 'search', 'signup', 'view_category', 'watch_video',
] as const
export type PinterestEvent = (typeof PINTEREST_EVENTS)[number]

export function isPinterestEvent(x: unknown): x is PinterestEvent {
  return typeof x === 'string' && (PINTEREST_EVENTS as readonly string[]).includes(x)
}

/** Pinterest wants lowercase, trimmed, then SHA-256 hex. */
function hashed(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase(), 'utf8').digest('hex')
}

export type UserData = {
  /** Taken from request headers server-side, never from the client body. */
  client_ip_address?: string
  client_user_agent?: string
  /** From the `_epik` cookie or an `epik` query param — Pinterest's own click id. */
  click_id?: string
  /** Hashed here, never sent raw. */
  email?: string
}

export type ConversionEvent = {
  event_name: PinterestEvent
  event_id: string
  event_source_url?: string
  /** Seconds, not milliseconds. Pinterest silently drops millisecond stamps. */
  event_time?: number
  custom_data?: Record<string, unknown>
  /** True when the visitor has opted out of tracking. */
  opt_out?: boolean
}

type SendResult =
  | { status: 'skipped'; reason: string }
  | { status: 'sent'; httpStatus: number; body: unknown }
  | { status: 'failed'; reason: string }

/**
 * Posts a batch of events.
 *
 * @param test Sends `?test=true`, which validates the payload and returns the
 *   real response messages WITHOUT recording anything. Pinterest's own docs
 *   carry a warning about leaving it on; so does this parameter's only caller.
 */
export async function sendConversionEvents(
  events: ConversionEvent[],
  user: UserData,
  test = false,
): Promise<SendResult> {
  const token = process.env.PINTEREST_CONVERSION_TOKEN
  if (!token) return { status: 'skipped', reason: 'PINTEREST_CONVERSION_TOKEN unset' }
  if (!events.length) return { status: 'skipped', reason: 'no events' }

  // Pinterest requires ONE of: em, hashed_maids, or the pair
  // client_ip_address + client_user_agent. We have no accounts, so the pair is
  // our only route — without both, the event is rejected, so do not send it.
  const hasPair = Boolean(user.client_ip_address && user.client_user_agent)
  if (!user.email && !hasPair) return { status: 'skipped', reason: 'no usable identifier' }

  const user_data: Record<string, unknown> = {}
  if (user.email) user_data.em = [hashed(user.email)]
  if (user.client_ip_address) user_data.client_ip_address = user.client_ip_address
  if (user.client_user_agent) user_data.client_user_agent = user.client_user_agent
  if (user.click_id) user_data.click_id = user.click_id

  const now = Math.floor(Date.now() / 1000)
  const body = {
    data: events.map((e) => ({
      event_name: e.event_name,
      action_source: 'web',
      event_time: e.event_time ?? now,
      // Shared with the Pinterest tag when one is installed. Pinterest dedupes
      // tag and API events on this id; without it the same conversion is counted
      // twice and every report is inflated.
      event_id: e.event_id,
      ...(e.event_source_url ? { event_source_url: e.event_source_url } : {}),
      ...(e.opt_out ? { opt_out: true } : {}),
      user_data,
      ...(e.custom_data ? { custom_data: e.custom_data } : {}),
    })),
  }

  try {
    const res = await fetch(test ? `${ENDPOINT}?test=true` : ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    let parsed: unknown = null
    try { parsed = await res.json() } catch { /* non-JSON error page */ }
    return { status: 'sent', httpStatus: res.status, body: parsed }
  } catch (e) {
    // Never let analytics break a page. The storefront works without this.
    return { status: 'failed', reason: (e as Error).message }
  }
}
