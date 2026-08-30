import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { siteEvents } from '@/lib/db/schema'

/**
 * The event sink. Public, unauthenticated, and always answers 200.
 *
 * -----------------------------------------------------------------------------
 * ALWAYS 200, EVEN WHEN IT FAILS
 *
 * Nothing a visitor does should get worse because analytics broke. A 500 here
 * would show up in the browser console of a shopper who did nothing wrong, and
 * on a beacon sent during page unload it would be a retry we do not want. So a
 * database outage silently drops events, exactly like /api/exclusions fails open
 * rather than taking the storefront down with it.
 *
 * The cost of that is real and worth naming: if Neon is down for an hour, that
 * hour is missing from the dashboard with nothing to indicate it. Read a sudden
 * flat spot as a possible outage rather than a drop in traffic.
 *
 * -----------------------------------------------------------------------------
 * AN OPEN ENDPOINT THAT WRITES ROWS
 *
 * Anyone can POST here, so everything is clamped: a cap on events per request,
 * a cap on string lengths, and an allow-list on the event name. Without the
 * allow-list a script could fill the table with junk names and the dashboard
 * would render them as if they were real features of the site.
 *
 * This is not rate limited by IP, deliberately. Doing so means holding an IP,
 * and the whole point of this table (see the schema comment) is that it holds
 * nothing identifying. A padded table is a cheaper problem than a log of who
 * visited, and the retention sweep clears it either way.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_EVENTS = 40
const MAX_LEN = 200
/** How long events are kept. Long enough for a season, short enough to bound. */
const RETAIN_DAYS = 120

/**
 * Names the dashboard knows how to read. Anything else is dropped.
 * Must stay in step with EventName in lib/site-events.ts.
 */
const ALLOWED = new Set([
  'page_view', 'product_view', 'collection_view', 'showcase_view',
  'card_flip', 'wish_add', 'add_to_cart', 'pin_click', 'outbound_click',
  'cart_open', 'checkout_click',
  'search', 'search_zero', 'search_click',
  'finder_open', 'finder_filter', 'finder_zero', 'finder_click',
  'shuffle', 'load_more', 'surprise_me', 'taste_up', 'taste_down', 'kid_safe_on',
  'comment_post',
])

function ok() {
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}

function str(v: unknown, max = MAX_LEN): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s || null
}

let ensured: Promise<void> | null = null
function ensureTable(): Promise<void> {
  ensured ??= db
    .execute(
      sql`CREATE TABLE IF NOT EXISTS site_events (
        id text PRIMARY KEY,
        ts timestamptz NOT NULL DEFAULT now(),
        sid text NOT NULL,
        name text NOT NULL,
        path text,
        product_id text,
        vendor text,
        cat text,
        meta text
      )`
    )
    .then(() => db.execute(sql`CREATE INDEX IF NOT EXISTS site_events_ts_idx ON site_events (ts)`))
    .then(() => db.execute(sql`CREATE INDEX IF NOT EXISTS site_events_name_ts_idx ON site_events (name, ts)`))
    .then(() => db.execute(sql`CREATE INDEX IF NOT EXISTS site_events_product_idx ON site_events (product_id)`))
    .then(() => db.execute(sql`CREATE INDEX IF NOT EXISTS site_events_sid_idx ON site_events (sid)`))
    .then(() => undefined)
    .catch((e) => {
      ensured = null
      throw e
    })
  return ensured
}

/**
 * Retention, swept opportunistically rather than on a cron.
 *
 * This project has no scheduler, and adding one for a DELETE is more moving
 * parts than the problem deserves. Sweeping on roughly one request in two
 * hundred keeps the table bounded without putting a delete in the hot path of
 * every beacon. If traffic is zero the table stops growing anyway, so a sweep
 * that never fires costs nothing.
 */
async function maybeSweep(): Promise<void> {
  if (Math.random() > 1 / 200) return
  try {
    await db.execute(
      sql`DELETE FROM site_events WHERE ts < now() - interval '1 day' * ${RETAIN_DAYS}`
    )
  } catch {
    /* a failed sweep is not worth a log line on a beacon */
  }
}

export async function POST(req: NextRequest) {
  let body: { events?: unknown }
  try {
    body = (await req.json()) as { events?: unknown }
  } catch {
    return ok()
  }

  const raw = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : []
  const rows = raw
    .map((e) => {
      const o = (e ?? {}) as Record<string, unknown>
      const name = str(o.name, 40)
      const sid = str(o.sid, 40)
      if (!name || !sid || !ALLOWED.has(name)) return null
      return {
        id: randomUUID(),
        sid,
        name,
        path: str(o.path),
        productId: str(o.productId),
        vendor: str(o.vendor, 80),
        cat: str(o.cat, 40),
        meta: str(o.meta),
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (!rows.length) return ok()

  try {
    await ensureTable()
    await db.insert(siteEvents).values(rows)
    await maybeSweep()
  } catch {
    /* fail open: see the note at the top */
  }
  return ok()
}
