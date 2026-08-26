/**
 * First-party analytics: what visitors actually do on this site.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS EXISTS ALONGSIDE VERCEL ANALYTICS AND THE PINTEREST TAG
 *
 * Three things measure this site and they answer three different questions.
 *
 *   Vercel Web Analytics  how many people came, from where, to which URL.
 *                         Traffic. It knows nothing about a product.
 *   Pinterest CAPI        conversions attributed to Pinterest ads, reported to
 *                         Pinterest. Their number, for their optimiser.
 *   THIS                  which products, which vendors, which parts of the
 *                         site, and where a workflow loses people.
 *
 * Only the third can answer "should we do more of this or less of it", because
 * only the third records the shape of a visit rather than its existence.
 *
 * -----------------------------------------------------------------------------
 * OUR CLICKS ARE NOT THEIR SALES
 *
 * Worth stating plainly because every number on the admin page is bounded by it:
 * we never take payment, so we cannot see what actually sold. The furthest thing
 * we can observe is `outbound_click`, the moment someone leaves for a vendor.
 * "Popular" here means most clicked on Kawaii Katz, never most bought, and the
 * admin page says so rather than letting the reader assume otherwise.
 *
 * -----------------------------------------------------------------------------
 * PRIVACY CEILING
 *
 * `sid` is a random value in sessionStorage. It dies with the tab, is never sent
 * to anyone, and cannot follow a person between visits or across devices. No IP,
 * no cookie, no account, no fingerprint. It exists only so a funnel can tell one
 * visit's steps from another's, which is the minimum that makes "where do people
 * give up" answerable at all.
 */

const SID_KEY = 'kk_sid'
const ENDPOINT = '/api/events'

/**
 * The event vocabulary.
 *
 * Kept as a closed union rather than free strings so a typo becomes a build
 * error instead of a row nobody notices is missing from the dashboard, and so
 * the admin page's funnels can name their steps with confidence that something
 * emits them.
 */
export type EventName =
  // Where people are
  | 'page_view'
  | 'product_view'
  | 'collection_view'
  | 'showcase_view'
  // Product interest, in ascending order of intent
  | 'card_flip'
  | 'wish_add'
  | 'add_to_cart'
  | 'pin_click'
  /** The money event. The last thing we can see before a vendor takes over. */
  | 'outbound_click'
  // Cart workflow
  | 'cart_open'
  | 'checkout_click'
  // Search workflow
  | 'search'
  | 'search_zero'
  | 'search_click'
  // Gift Finder workflow
  | 'finder_open'
  | 'finder_filter'
  | 'finder_zero'
  | 'finder_click'
  // Collection browsing
  | 'shuffle'
  | 'surprise_me'
  | 'taste_up'
  | 'taste_down'
  | 'kid_safe_on'
  // Community
  | 'comment_post'

export type EventProps = {
  path?: string
  productId?: string
  vendor?: string
  cat?: string
  /** A search term, a collection slug, a price band. Kept short on the server. */
  meta?: string
}

type Queued = EventProps & { name: EventName; sid: string }

/** Per-tab id. Random, disposable, never leaves this origin. */
function sid(): string {
  try {
    let v = sessionStorage.getItem(SID_KEY)
    if (!v) {
      v = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 24)
      sessionStorage.setItem(SID_KEY, v)
    }
    return v
  } catch {
    // Private mode or blocked storage. A per-call id still records the event; it
    // just cannot be joined into a funnel, which is the right way to degrade.
    return 'nostore'
  }
}

/**
 * Events are batched.
 *
 * A visitor shuffling a collection fires an event per tile replaced, and one
 * request each would be dozens of round trips for data nobody reads in real
 * time. They queue and flush on a short timer, on page hide, and whenever the
 * queue gets long enough to be worth sending.
 */
let queue: Queued[] = []
let timer: ReturnType<typeof setTimeout> | null = null
const FLUSH_MS = 2500
const MAX_QUEUE = 20

function flush(): void {
  if (!queue.length) return
  const batch = queue
  queue = []
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  const body = JSON.stringify({ events: batch })
  try {
    // sendBeacon survives the page being closed, which is exactly when
    // outbound_click fires. A fetch() there is routinely cancelled mid-flight
    // and the most important event on the site would be the one most often lost.
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return
  } catch {
    /* fall through */
  }
  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

/** Record one event. Never throws, never blocks, never awaited. */
export function logEvent(name: EventName, props: EventProps = {}): void {
  if (typeof window === 'undefined') return
  try {
    queue.push({
      name,
      sid: sid(),
      path: props.path ?? window.location.pathname,
      productId: props.productId,
      vendor: props.vendor,
      cat: props.cat,
      meta: props.meta,
    })
    if (queue.length >= MAX_QUEUE) return flush()
    timer ??= setTimeout(flush, FLUSH_MS)
  } catch {
    /* analytics must never break the page */
  }
}

let wired = false
/** Flush on tab hide. Called once from the provider. */
export function wireFlushOnHide(): void {
  if (wired || typeof document === 'undefined') return
  wired = true
  // visibilitychange rather than unload: unload does not fire reliably on mobile
  // Safari, which is a large share of a site that looks like this one.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('pagehide', flush)
}
