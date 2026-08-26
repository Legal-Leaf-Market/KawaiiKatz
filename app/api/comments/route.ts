import { NextResponse, type NextRequest } from 'next/server'
import { and, asc, eq, gte, sql } from 'drizzle-orm'
import { createHash, randomUUID } from 'node:crypto'

import { db } from '@/lib/db'
import { productComments } from '@/lib/db/schema'
import { ADA_COOKIE, verifyToken } from '@/lib/ada-auth'

/**
 * Comments on a product page.
 *
 * -----------------------------------------------------------------------------
 * MODERATION IS THE DESIGN, NOT A FEATURE ADDED LATER
 *
 * There are no shopper accounts here and there should not be: this site takes
 * no payment, so an account would hold a name and a password, protect nothing
 * worth protecting, and become a breach we could have had instead. A comment
 * therefore carries a typed display name and nothing else — which means the
 * abuse controls have to do all the work an account would have done.
 *
 * Three of them, in order of how much they matter:
 *
 *   1. LINKS ARE REFUSED. An affiliate storefront with an open comment box is a
 *      link-spam target and nothing else here matters as much as simply not
 *      letting a URL through. Refused with a message rather than silently
 *      stripped, so a real person who pasted one knows why their comment
 *      bounced.
 *   2. An hourly cap per poster, keyed on a salted hash of the IP.
 *   3. The curator can hide anything, from the page, in one click.
 *
 * -----------------------------------------------------------------------------
 * WHY THE IP IS HASHED AND WHY THE SALT MATTERS
 *
 * The hash exists to rate-limit and to let a persistent abuser be blocked
 * without this site holding anyone's address. An UNSALTED hash would not
 * achieve that: IPv4 is 2^32 values, so a plain sha256 of an address is
 * reversible by brute force in minutes on a laptop. ADA_PIN is reused as the
 * salt because it is already a secret this deployment holds and already the
 * HMAC key for curator sessions — rotating it invalidates old hashes along with
 * old sessions, which is the correct blast radius.
 *
 * With ADA_PIN unset, the hash is dropped entirely rather than stored unsalted.
 * Rate limiting degrades to nothing in that case, which is a real cost and
 * still better than writing a reversible record of who visited.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY = 1200
const MAX_AUTHOR = 40
/** Comments one poster may leave in an hour, across the whole site. */
const HOURLY_CAP = 6

/**
 * Anything that looks like someone trying to get a click out of the box.
 *
 * Deliberately broader than a URL regex: `example.com`, `example (dot) com` and
 * a bare `www.` are all attempts, and none of them is something a person
 * writing about a plushie needs to type.
 */
const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|shop|store|ru|cn|xyz|top|info|biz)\b|\(\s*dot\s*\)|\[\s*dot\s*\])/i

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
    return false // ADA_PIN unset: fail closed, same as everywhere else
  }
}

/** Vercel puts the real client IP first; the rest are its own proxy hops. */
function clientIp(req: NextRequest): string | undefined {
  const first = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return first || req.headers.get('x-real-ip') || undefined
}

function hashIp(req: NextRequest): string | null {
  const ip = clientIp(req)
  const salt = process.env.ADA_PIN
  if (!ip || !salt) return null
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

/**
 * Create the table on first use.
 *
 * This project has no migration tooling — store_exclusions was created by hand
 * in the Neon console — so a new table shipped in a commit would exist in the
 * code and not in the database, and every write would 500 with nothing on the
 * site explaining why. Same self-provisioning as /api/picks, for the same
 * reason: keep the deploy to one step.
 */
let ensured: Promise<void> | null = null
function ensureTable(): Promise<void> {
  ensured ??= db
    .execute(
      sql`CREATE TABLE IF NOT EXISTS product_comments (
        id text PRIMARY KEY,
        product_id text NOT NULL,
        parent_id text,
        author text NOT NULL,
        body text NOT NULL,
        ip_hash text,
        hidden boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`
    )
    .then(() =>
      db.execute(
        sql`CREATE INDEX IF NOT EXISTS product_comments_product_idx
            ON product_comments (product_id, created_at)`
      )
    )
    .then(() => undefined)
    .catch((e) => {
      // Clear the memo so a transient failure does not poison every later
      // request in this lambda with a rejected promise it will never retry.
      ensured = null
      throw e
    })
  return ensured
}

/** What a visitor is allowed to see. Never the ip hash, hidden bodies withheld. */
function publicShape(row: typeof productComments.$inferSelect, isCurator: boolean) {
  return {
    id: row.id,
    parentId: row.parentId,
    author: row.hidden ? '' : row.author,
    body: row.hidden ? '' : row.body,
    hidden: row.hidden,
    createdAt: row.createdAt,
    // Curators see the real text of a hidden comment, so a decision can be
    // reviewed or reversed without a database console.
    hiddenBody: isCurator && row.hidden ? row.body : undefined,
    hiddenAuthor: isCurator && row.hidden ? row.author : undefined,
  }
}

// GET — public. Every comment for one product, oldest first.
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product')
  if (!productId) return noStore({ comments: [] })
  const isCurator = authorized(req)
  try {
    await ensureTable()
    const rows = await db
      .select()
      .from(productComments)
      .where(eq(productComments.productId, productId))
      .orderBy(asc(productComments.createdAt))
    return noStore({ comments: rows.map((r) => publicShape(r, isCurator)) })
  } catch {
    // Fail open, exactly like /api/exclusions: a database problem must never
    // take a product page down with it. No comments is a worse page; a 500 is
    // a broken one.
    return noStore({ comments: [] })
  }
}

// POST — public, and where all the screening lives.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return noStore({ error: 'bad json' }, 400)
  }

  const productId = String(body.productId ?? '').trim()
  const author = String(body.author ?? '').trim().slice(0, MAX_AUTHOR)
  const text = String(body.body ?? '').trim().slice(0, MAX_BODY)
  const parentIdRaw = body.parentId ? String(body.parentId) : null

  if (!productId || !author || !text) {
    return noStore({ error: 'name and comment are both required' }, 400)
  }
  if (LINK_RE.test(text) || LINK_RE.test(author)) {
    return noStore({ error: 'links are not allowed in comments' }, 400)
  }

  const ipHash = hashIp(req)

  try {
    await ensureTable()

    if (ipHash) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recent = await db
        .select({ id: productComments.id })
        .from(productComments)
        .where(and(eq(productComments.ipHash, ipHash), gte(productComments.createdAt, hourAgo)))
      if (recent.length >= HOURLY_CAP) {
        return noStore({ error: 'that is a lot of comments in an hour, try again later' }, 429)
      }
    }

    /**
     * Replies are one level deep, and the flattening happens here rather than
     * being trusted from the client.
     *
     * Arbitrary nesting on a phone-width product page is unreadable by about
     * the third indent, and the alternative — letting the depth grow and
     * clamping it in CSS — produces threads whose shape depends on which
     * component renders them. A reply to a reply attaches to the same parent,
     * so a conversation stays a conversation.
     */
    let parentId: string | null = null
    if (parentIdRaw) {
      const [parent] = await db
        .select({ id: productComments.id, parentId: productComments.parentId })
        .from(productComments)
        .where(eq(productComments.id, parentIdRaw))
      if (parent) parentId = parent.parentId ?? parent.id
    }

    const row = {
      id: randomUUID(),
      productId,
      parentId,
      author,
      body: text,
      ipHash,
      hidden: false,
    }
    await db.insert(productComments).values(row)
    return noStore({ comment: publicShape({ ...row, createdAt: new Date() }, false) })
  } catch {
    // A write failure is worth saying out loud — unlike a read, silence here
    // looks like the comment posted when it did not.
    return noStore({ error: 'could not save that comment' }, 503)
  }
}

// PATCH — curator only. Hides or restores a comment.
export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return noStore({ error: 'Unauthorized' }, 401)
  let body: { id?: unknown; hidden?: unknown }
  try {
    body = (await req.json()) as { id?: unknown; hidden?: unknown }
  } catch {
    return noStore({ error: 'bad json' }, 400)
  }
  const id = String(body.id ?? '')
  if (!id) return noStore({ error: 'id required' }, 400)
  try {
    await ensureTable()
    await db
      .update(productComments)
      .set({ hidden: body.hidden !== false })
      .where(eq(productComments.id, id))
    return noStore({ ok: true })
  } catch {
    return noStore({ error: 'could not update that comment' }, 503)
  }
}
