import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { storeExclusions } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { ADA_COOKIE, verifyToken } from '@/lib/ada-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Writes are authorized by the httpOnly session cookie issued by /api/ada-login,
// never by a value the client sends. A PIN in the request body would be a PIN in
// the client bundle, readable by every visitor.
function authorized(req: NextRequest): boolean {
  return verifyToken(req.cookies.get(ADA_COOKIE)?.value)
}

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}

// GET — public. Returns the current global exclusion list (ids + metadata).
// Uncached so a newly excluded product disappears for every visitor right away.
export async function GET() {
  try {
    const rows = await db.select().from(storeExclusions).orderBy(desc(storeExclusions.excludedAt))
    return noStore({ ids: rows.map((r) => r.productId), items: rows })
  } catch (err) {
    console.log('[v0] exclusions GET error:', (err as Error).message)
    return noStore({ ids: [], items: [] })
  }
}

// POST — admin only. Adds a product to the store exclusion list.
export async function POST(req: NextRequest) {
  if (!authorized(req)) return noStore({ error: 'Unauthorized' }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return noStore({ error: 'Invalid body' }, 400)
  }

  const product = (body.product ?? {}) as Record<string, unknown>
  const productId = String(product.id ?? '').trim()
  if (!productId) return noStore({ error: 'Missing product id' }, 400)

  try {
    await db
      .insert(storeExclusions)
      .values({
        productId,
        name: product.name ? String(product.name) : null,
        image: product.image ? String(product.image) : null,
        price: typeof product.price === 'number' ? product.price : null,
        vendor: product.vendor ? String(product.vendor) : null,
        url: product.url ? String(product.url) : null,
      })
      .onConflictDoUpdate({
        target: storeExclusions.productId,
        set: {
          name: product.name ? String(product.name) : null,
          image: product.image ? String(product.image) : null,
          price: typeof product.price === 'number' ? product.price : null,
          vendor: product.vendor ? String(product.vendor) : null,
          url: product.url ? String(product.url) : null,
          excludedAt: new Date(),
        },
      })
    return noStore({ ok: true, productId })
  } catch (err) {
    console.log('[v0] exclusions POST error:', (err as Error).message)
    return noStore({ error: 'Failed to exclude' }, 500)
  }
}

// DELETE — admin only. Restores a product back to the store.
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
    await db.delete(storeExclusions).where(eq(storeExclusions.productId, productId))
    return noStore({ ok: true, productId })
  } catch (err) {
    console.log('[v0] exclusions DELETE error:', (err as Error).message)
    return noStore({ error: 'Failed to restore' }, 500)
  }
}
