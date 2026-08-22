import { NextResponse, type NextRequest } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { storePicks } from '@/lib/db/schema'
import { ADA_COOKIE, verifyToken } from '@/lib/ada-auth'
import { DEFAULT_ADA_PICKS, type AdaPick } from '@/lib/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Ada's Picks — the shared, server-side list.
 *
 * Mirrors /api/exclusions deliberately, down to the fail-open GET: same cookie
 * auth, same no-store headers, same "never let a database problem take the
 * storefront down" posture. Two curator features that behave differently under
 * failure would be two things to remember instead of one.
 */

function authorized(req: NextRequest): boolean {
  return verifyToken(req.cookies.get(ADA_COOKIE)?.value)
}

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}

/**
 * Create the table on first use.
 *
 * This project has no migration tooling — store_exclusions was created by hand
 * in the Neon console — so a new table shipped in a commit would exist in the
 * code and not in the database, and every write would 500 with nothing on the
 * site explaining why. Self-provisioning keeps the deploy to one step.
 *
 * Memoised per process rather than per request: it is one round trip, but it is
 * one round trip on a path a shopper waits for.
 */
let ensured: Promise<void> | null = null
function ensureTable(): Promise<void> {
  ensured ??= db
    .execute(
      sql`CREATE TABLE IF NOT EXISTS store_picks (
        product_id text PRIMARY KEY,
        name text,
        vendor text,
        cat text,
        image text,
        price double precision,
        url text,
        picked_at timestamptz NOT NULL DEFAULT now()
      )`
    )
    .then(() => undefined)
    .catch((err) => {
      // Reset so a transient failure is retried rather than cached forever.
      ensured = null
      throw err
    })
  return ensured
}

function toPick(r: typeof storePicks.$inferSelect): AdaPick {
  return {
    id: r.productId,
    name: r.name ?? '',
    vendor: r.vendor ?? '',
    cat: r.cat ?? '',
    price: r.price ?? 0,
    image: r.image ?? '',
    url: r.url ?? '',
    ts: r.pickedAt ? new Date(r.pickedAt).getTime() : 0,
  }
}

/**
 * GET — public. The rail every visitor sees.
 *
 * An EMPTY table serves DEFAULT_ADA_PICKS rather than an empty rail, and that
 * is a deliberate trade with a visible edge: it means the very first deploy,
 * and any environment with no DATABASE_URL, still shows the curated six instead
 * of a blank strip where the editorial voice of the site is supposed to be.
 *
 * The cost is that Ada cannot curate the rail down to nothing — unstarring the
 * last pick reverts to the defaults rather than emptying it. That is the right
 * way round for a rail whose whole job is to never be empty, but it is
 * surprising if you do not know, so: now you know.
 */
export async function GET() {
  try {
    await ensureTable()
    const rows = await db.select().from(storePicks).orderBy(desc(storePicks.pickedAt))
    if (!rows.length) return noStore({ picks: DEFAULT_ADA_PICKS, source: 'default' })
    return noStore({ picks: rows.map(toPick), source: 'db' })
  } catch (err) {
    console.log('[picks] GET error:', (err as Error).message)
    return noStore({ picks: DEFAULT_ADA_PICKS, source: 'default' })
  }
}

// POST — admin only. Adds (or refreshes) a pick.
export async function POST(req: NextRequest) {
  if (!authorized(req)) return noStore({ error: 'Unauthorized' }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return noStore({ error: 'Invalid body' }, 400)
  }

  // Accepts one pick or many, so the client can publish a whole list in a
  // single request — see the local-picks migration in usePicks().
  const incoming = (Array.isArray(body.picks) ? body.picks : [body.pick]) as Record<string, unknown>[]
  const rows = incoming
    .filter(Boolean)
    .map((p) => ({
      productId: String(p.id ?? '').trim(),
      name: p.name ? String(p.name) : null,
      vendor: p.vendor ? String(p.vendor) : null,
      cat: p.cat ? String(p.cat) : null,
      image: p.image ? String(p.image) : null,
      price: typeof p.price === 'number' ? p.price : null,
      url: p.url ? String(p.url) : null,
    }))
    .filter((r) => r.productId)

  if (!rows.length) return noStore({ error: 'Missing product id' }, 400)

  try {
    await ensureTable()
    for (const row of rows) {
      await db
        .insert(storePicks)
        .values(row)
        .onConflictDoUpdate({
          target: storePicks.productId,
          set: { ...row, pickedAt: new Date() },
        })
    }
    return noStore({ ok: true, count: rows.length })
  } catch (err) {
    console.log('[picks] POST error:', (err as Error).message)
    return noStore({ error: 'Failed to save pick' }, 500)
  }
}

// DELETE — admin only. Removes a pick.
export async function DELETE(req: NextRequest) {
  if (!authorized(req)) return noStore({ error: 'Unauthorized' }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return noStore({ error: 'Invalid body' }, 400)
  }

  const productId = String(body.id ?? '').trim()
  if (!productId) return noStore({ error: 'Missing product id' }, 400)

  try {
    await ensureTable()
    await db.delete(storePicks).where(eq(storePicks.productId, productId))
    return noStore({ ok: true, productId })
  } catch (err) {
    console.log('[picks] DELETE error:', (err as Error).message)
    return noStore({ error: 'Failed to remove pick' }, 500)
  }
}
