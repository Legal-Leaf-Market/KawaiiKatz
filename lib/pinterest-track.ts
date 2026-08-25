'use client'
import type { Product } from './data'

/**
 * Client half of the Pinterest integration: the tag AND the Conversions API,
 * fired together from one place.
 *
 * They MUST be fired together. Pinterest dedupes tag and API events on a shared
 * `event_id`; two sides generating their own ids counts every conversion twice
 * and inflates the reports ad spend is judged on. One call site, one id, both
 * transports — that is the only arrangement where they cannot drift.
 *
 * Every call is fire-and-forget. Nothing here is allowed to make a page slower
 * or noisier: `keepalive` lets an outbound-click event survive the navigation
 * that follows it, and every failure is swallowed, because a storefront that
 * logs analytics errors to a shopper's console is worse than one that loses an
 * event.
 */

/** Not a secret — the tag ships it in client code by design. */
export const PINTEREST_TAG_ID = '2613805245682'

/**
 * The tag's event names are NOT the API's. `page_visit` on the API is
 * `pagevisit` on the tag, `add_to_cart` is `addtocart`, `view_category` is
 * `viewcategory`. Sending an API name to the tag silently records nothing.
 */
const TAG_NAME: Record<string, string> = {
  page_visit: 'pagevisit',
  add_to_cart: 'addtocart',
  view_category: 'viewcategory',
  search: 'search',
  custom: 'custom',
}

/**
 * Do Not Track and Global Privacy Control, checked before the tag fires.
 *
 * The server route already flags these to the API, but the tag is a different
 * thing: it runs in the visitor's browser and sets cookies. Honouring the
 * signal there means not calling it at all, which is the only version of
 * "respecting the request" that is actually true.
 */
export function trackingOptedOut(): boolean {
  if (typeof navigator === 'undefined') return false
  const n = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string }
  return n.globalPrivacyControl === true || n.doNotTrack === '1'
}

type Pintrk = ((...args: unknown[]) => void) & { queue?: unknown[] }

/**
 * The tag's queueing stub, created here if it does not exist yet.
 *
 * PinterestTag loads in an effect, so the very first `page_visit` can fire
 * before the tag script has run — and page visits are what retargeting
 * audiences are built from, so losing them is not a rounding error. Pinterest's
 * own snippet solves this the same way: `pintrk` is a function that pushes onto
 * a queue, and core.js drains that queue when it finishes loading.
 *
 * `load` is enqueued FIRST, by whichever side creates the stub. core.js replays
 * the queue in order, and a `track` ahead of `load` is a track against no tag.
 *
 * Not created for an opted-out visitor: the tag will never load to drain it, so
 * it would only be an array that grows.
 */
function pintrk(): Pintrk | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { pintrk?: Pintrk }
  if (!w.pintrk) {
    if (trackingOptedOut()) return null
    const stub = function (...args: unknown[]) { stub.queue.push(args) } as Pintrk & { queue: unknown[]; version: string }
    stub.queue = []
    stub.version = '3.0'
    w.pintrk = stub
    stub('load', PINTEREST_TAG_ID)
  }
  return w.pintrk ?? null
}

/**
 * A per-event id, shared by the tag and the Conversions API.
 *
 * Pinterest dedupes the two transports on this value; two sides generating
 * different ids for the same conversion counts it twice and inflates the
 * reports ad spend is judged on.
 */
function eventId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `kk-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`
  }
}

type TrackOpts = {
  event_name: 'page_visit' | 'add_to_cart' | 'custom' | 'search' | 'view_category'
  custom_data?: Record<string, unknown>
}

export function track({ event_name, custom_data }: TrackOpts): void {
  if (typeof window === 'undefined') return

  // ONE id, both transports. This is the dedup contract.
  const event_id = eventId()

  // The tag, when it loaded and the visitor has not opted out.
  const pt = pintrk()
  const tagName = TAG_NAME[event_name]
  if (pt && tagName && !trackingOptedOut()) {
    try {
      pt('track', tagName, { ...(custom_data ?? {}), event_id })
    } catch { /* the tag is best-effort; the API call below is the reliable half */ }
  }

  // The API. Sent even under an opt-out, because the route flags `opt_out` on
  // it — Pinterest is told the visitor declined, which is a stronger signal
  // than silence and is what their own flag is for.
  const body = JSON.stringify({
    events: [{
      event_name,
      event_id,
      event_source_url: window.location.href,
      custom_data,
    }],
  })
  try {
    void fetch('/api/pinterest-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* storage-blocked or offline: an unsent event is not worth an exception */
  }
}

/** Shape Pinterest expects for the items in a cart event. */
function contentsOf(p: Product, qty = 1) {
  return {
    currency: 'USD',
    value: String(p.price),
    content_ids: [p.id],
    content_name: p.name,
    content_category: p.cat,
    content_brand: p.vendor,
    contents: [{ id: p.id, item_price: String(p.price), quantity: qty, item_name: p.name, item_category: p.cat, item_brand: p.vendor }],
    num_items: qty,
  }
}

export function trackAddToCart(p: Product, qty = 1): void {
  track({ event_name: 'add_to_cart', custom_data: contentsOf(p, qty) })
}

/**
 * The click out to a merchant — the closest thing this business model has to a
 * conversion, and deliberately NOT sent as `checkout`. We never learn whether
 * the sale completed, so reporting one would put a number in the ROAS column
 * that nothing backs up.
 */
export function trackOutboundClick(p: Product): void {
  track({
    event_name: 'custom',
    custom_data: { ...contentsOf(p), event_label: 'outbound_merchant_click' },
  })
}

export function trackPageVisit(): void {
  track({ event_name: 'page_visit' })
}
