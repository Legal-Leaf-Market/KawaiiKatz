'use client'
import type { Product } from './data'

/**
 * Client half of the Conversions API. Holds no token and knows no secrets — it
 * posts to /api/pinterest-event, which adds everything that identifies the
 * visitor from the request itself.
 *
 * Every call is fire-and-forget. Nothing here is allowed to make a page slower
 * or noisier: `keepalive` lets an outbound-click event survive the navigation
 * that follows it, and every failure is swallowed, because a storefront that
 * logs analytics errors to a shopper's console is worse than one that loses an
 * event.
 */

/**
 * A per-event id, shared with the Pinterest tag if one is ever installed.
 * Pinterest dedupes tag and API events on this value; two sides generating
 * different ids for the same conversion counts it twice and inflates the
 * reports that ad spend is judged on.
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
  const body = JSON.stringify({
    events: [{
      event_name,
      event_id: eventId(),
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
