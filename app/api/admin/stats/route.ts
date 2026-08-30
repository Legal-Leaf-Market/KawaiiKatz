import { NextResponse, type NextRequest } from 'next/server'
import { sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { ADA_COOKIE, verifyToken } from '@/lib/ada-auth'

/**
 * The numbers behind /admin. Curator only.
 *
 * -----------------------------------------------------------------------------
 * AGGREGATED HERE, NOT IN THE BROWSER
 *
 * The raw table is every click on the site. Shipping it to the client and
 * counting there would mean the admin page downloads the whole event log, which
 * is both slow and a much bigger thing to leak if the cookie ever escapes. The
 * browser only ever receives totals.
 *
 * -----------------------------------------------------------------------------
 * SESSIONS, NOT EVENTS, IN EVERY FUNNEL
 *
 * A funnel counted in events lies. One person opening the Gift Finder, changing
 * six filters and clicking nothing looks like six steps of engagement. Every
 * step below counts DISTINCT sid, so each visit contributes at most one to each
 * step and the drop between steps is a drop in people.
 *
 * The consequence to remember when reading it: these are per-tab sessions, so
 * one person across two visits is two sessions. Good for shape, wrong for
 * "how many humans", and nothing here claims the latter.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = Record<string, unknown>

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}

function authorized(req: NextRequest): boolean {
  try {
    return verifyToken(req.cookies.get(ADA_COOKIE)?.value)
  } catch {
    return false
  }
}

async function rows(q: ReturnType<typeof sql>): Promise<Row[]> {
  const r = (await db.execute(q)) as unknown as { rows?: Row[] } | Row[]
  return Array.isArray(r) ? r : (r.rows ?? [])
}

const n = (v: unknown) => Number(v ?? 0)

export async function GET(req: NextRequest) {
  if (!authorized(req)) return noStore({ error: 'Unauthorized' }, 401)

  // Clamped: an unbounded window is a full table scan on a shared Neon instance.
  const asked = Number(req.nextUrl.searchParams.get('days'))
  const days = [1, 7, 30, 90].includes(asked) ? asked : 7
  const since = sql`now() - interval '1 day' * ${days}`

  try {
    const [
      totals, byName, topProducts, topVendors, topSections, topCollections,
      searches, zeroSearches, disliked, daily,
    ] = await Promise.all([
      // Headline counts. One pass, so the numbers agree with each other.
      rows(sql`
        SELECT
          count(DISTINCT sid)                                              AS sessions,
          count(*) FILTER (WHERE name = 'page_view')                       AS views,
          count(*) FILTER (WHERE name = 'outbound_click')                  AS outbound,
          count(DISTINCT sid) FILTER (WHERE name = 'outbound_click')       AS outbound_sessions,
          count(*) FILTER (WHERE name = 'add_to_cart')                     AS carted,
          count(*) FILTER (WHERE name = 'comment_post')                    AS comments
        FROM site_events WHERE ts >= ${since}
      `),

      rows(sql`
        SELECT name, count(*) AS c, count(DISTINCT sid) AS s
        FROM site_events WHERE ts >= ${since}
        GROUP BY name ORDER BY c DESC
      `),

      // Products ranked by the furthest thing we can observe, not by views.
      rows(sql`
        SELECT product_id, max(vendor) AS vendor, max(cat) AS cat,
               count(*) FILTER (WHERE name = 'outbound_click') AS clicks,
               count(*) FILTER (WHERE name = 'product_view')   AS views,
               count(*) FILTER (WHERE name = 'add_to_cart')    AS carted
        FROM site_events
        WHERE ts >= ${since} AND product_id IS NOT NULL
        GROUP BY product_id
        HAVING count(*) FILTER (WHERE name IN ('outbound_click','product_view','add_to_cart')) > 0
        ORDER BY clicks DESC, views DESC
        LIMIT 40
      `),

      rows(sql`
        SELECT vendor,
               count(*) FILTER (WHERE name = 'outbound_click') AS clicks,
               count(*) FILTER (WHERE name = 'product_view')   AS views,
               count(DISTINCT product_id)                      AS products
        FROM site_events
        WHERE ts >= ${since} AND vendor IS NOT NULL
        GROUP BY vendor ORDER BY clicks DESC, views DESC LIMIT 25
      `),

      // Which parts of the site earn their keep. Product pages collapse to one
      // row: 4,400 separate paths would bury the sections that matter.
      rows(sql`
        SELECT CASE
                 WHEN path = '/' THEN '/ (home)'
                 WHEN path LIKE '/p/%' THEN '/p/* (product pages)'
                 WHEN path LIKE '/gifts/%' THEN path
                 ELSE coalesce(path, '(unknown)')
               END AS section,
               count(*) FILTER (WHERE name = 'page_view')      AS views,
               count(DISTINCT sid)                             AS sessions,
               count(*) FILTER (WHERE name = 'outbound_click') AS clicks
        FROM site_events WHERE ts >= ${since}
        GROUP BY 1 ORDER BY views DESC LIMIT 25
      `),

      rows(sql`
        SELECT meta AS slug, count(*) AS views, count(DISTINCT sid) AS sessions
        FROM site_events
        WHERE ts >= ${since} AND name = 'collection_view' AND meta IS NOT NULL
        GROUP BY meta ORDER BY views DESC LIMIT 20
      `),

      rows(sql`
        SELECT meta AS term, count(*) AS c
        FROM site_events WHERE ts >= ${since} AND name = 'search' AND meta IS NOT NULL
        GROUP BY meta ORDER BY c DESC LIMIT 25
      `),

      // The most actionable list on the page: searched for, found nothing.
      rows(sql`
        SELECT meta AS term, count(*) AS c
        FROM site_events WHERE ts >= ${since} AND name = 'search_zero' AND meta IS NOT NULL
        GROUP BY meta ORDER BY c DESC LIMIT 25
      `),

      rows(sql`
        SELECT product_id, max(vendor) AS vendor, count(*) AS downs
        FROM site_events
        WHERE ts >= ${since} AND name = 'taste_down' AND product_id IS NOT NULL
        GROUP BY product_id ORDER BY downs DESC LIMIT 20
      `),

      rows(sql`
        SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS day,
               count(DISTINCT sid) AS sessions,
               count(*) FILTER (WHERE name = 'outbound_click') AS clicks
        FROM site_events WHERE ts >= ${since}
        GROUP BY 1 ORDER BY 1
      `),
    ])

    /**
     * Funnels.
     *
     * Each step is "sessions that reached this step at all", so the sequence is
     * monotonic by construction only if later steps genuinely require earlier
     * ones. Where they do not (a visitor can click a product straight off the
     * home grid without searching) the steps are still comparable, but read them
     * as coverage rather than as a strict pipeline. The step labels say which.
     */
    const step = async (name: string) =>
      n((await rows(sql`
        SELECT count(DISTINCT sid) AS c FROM site_events
        WHERE ts >= ${since} AND name = ${name}
      `))[0]?.c)

    const [
      sAny, sProdView, sCart, sCartOpen, sCheckout, sOut,
      sFindOpen, sFindFilter, sFindZero, sFindClick,
      sSearch, sSearchZero, sSearchClick,
    ] = await Promise.all([
      step('page_view'), step('product_view'), step('add_to_cart'), step('cart_open'),
      step('checkout_click'), step('outbound_click'),
      step('finder_open'), step('finder_filter'), step('finder_zero'), step('finder_click'),
      step('search'), step('search_zero'), step('search_click'),
    ])

    const t = totals[0] ?? {}
    return noStore({
      days,
      totals: {
        sessions: n(t.sessions),
        views: n(t.views),
        outbound: n(t.outbound),
        outboundSessions: n(t.outbound_sessions),
        carted: n(t.carted),
        comments: n(t.comments),
      },
      byName: byName.map((r) => ({ name: String(r.name), count: n(r.c), sessions: n(r.s) })),
      topProducts: topProducts.map((r) => ({
        productId: String(r.product_id), vendor: String(r.vendor ?? ''), cat: String(r.cat ?? ''),
        clicks: n(r.clicks), views: n(r.views), carted: n(r.carted),
      })),
      topVendors: topVendors.map((r) => ({
        vendor: String(r.vendor), clicks: n(r.clicks), views: n(r.views), products: n(r.products),
      })),
      topSections: topSections.map((r) => ({
        section: String(r.section), views: n(r.views), sessions: n(r.sessions), clicks: n(r.clicks),
      })),
      topCollections: topCollections.map((r) => ({
        slug: String(r.slug), views: n(r.views), sessions: n(r.sessions),
      })),
      searches: searches.map((r) => ({ term: String(r.term), count: n(r.c) })),
      zeroSearches: zeroSearches.map((r) => ({ term: String(r.term), count: n(r.c) })),
      disliked: disliked.map((r) => ({
        productId: String(r.product_id), vendor: String(r.vendor ?? ''), downs: n(r.downs),
      })),
      daily: daily.map((r) => ({ day: String(r.day), sessions: n(r.sessions), clicks: n(r.clicks) })),
      funnels: [
        {
          key: 'browse',
          title: 'Browse to vendor',
          note:
            'Coverage, not a strict pipeline: a visitor can click through from the home grid without ' +
            'opening a product page. The last step is the goal. Whether any of them bought is only ' +
            'visible in the network dashboard, never here.',
          steps: [
            { label: 'Visited', sessions: sAny },
            { label: 'Opened a product page', sessions: sProdView },
            // `goal` marks the step that is the POINT of the funnel rather than
            // another rung on it. Without it the dashboard drew a drop-off note
            // under this bar in alarm pink and called it "lost", which is
            // exactly backwards: a session that leaves for a shop is the one
            // that can earn. See the note in AdminDashboard.tsx.
            { label: 'Reached a shop', sessions: sOut, goal: true },
          ],
        },
        {
          key: 'cart',
          title: 'Cart',
          note: 'A strict pipeline. Every step here requires the one before it.',
          steps: [
            { label: 'Added to cart', sessions: sCart },
            { label: 'Opened the cart', sessions: sCartOpen },
            { label: 'Tapped check out', sessions: sCheckout, goal: true },
          ],
        },
        {
          key: 'finder',
          title: 'Gift Finder',
          note: `A strict pipeline. ${sFindZero} session(s) hit a combination with no matches.`,
          steps: [
            { label: 'Opened the finder', sessions: sFindOpen },
            { label: 'Set a filter', sessions: sFindFilter },
            { label: 'Clicked a result', sessions: sFindClick },
          ],
        },
        {
          key: 'search',
          title: 'Search',
          note: `A strict pipeline. ${sSearchZero} session(s) searched and got nothing back.`,
          steps: [
            { label: 'Searched', sessions: sSearch },
            { label: 'Clicked a result', sessions: sSearchClick },
          ],
        },
      ],
    })
  } catch (e) {
    // Surfaced rather than swallowed: the reader is the curator, and "the table
    // does not exist yet" needs a different reaction from "the query is wrong".
    return noStore({ error: (e as Error).message }, 500)
  }
}
