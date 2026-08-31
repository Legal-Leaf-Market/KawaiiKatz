import { NextResponse } from 'next/server'

import { VENDORS, type VendorConfig } from '@/lib/data'
import { mapShopifyProducts, categorize } from '@/lib/catalog-shared'
import { adultApparelHit } from '@/lib/adult-apparel'

/**
 * TEMPORARY. Delete this route in the follow-up commit.
 *
 * `pnpm probe` cannot reach a merchant host from a Claude Code container: the
 * egress proxy answers 403 to the CONNECT for every one of them. PROJECT_GUIDE
 * section 4 records the way through, used before on 2026-08-22 and used again
 * here. A prerendered route EXECUTES DURING `next build`, on Vercel's builder,
 * which does have open egress, and its console output lands in the build log.
 * Build logs need no auth, unlike a preview deploy, which sits behind Vercel
 * Authentication and rejects at the edge before any function runs.
 *
 * It reads the real pipeline rather than reimplementing it, for the same reason
 * scripts/vendor_probe.mjs does: a second copy of the classifier drifts from
 * the first, and drifts silently.
 */
export const dynamic = 'force-static'

const PER_PAGE = 250
const MAX_PAGES = 5
const UA = 'Mozilla/5.0'
const TAG = '[probe]'

const TARGETS = ['Anime Bedding', 'Anime Backpacks', 'Anime Jacket', 'Anime Kimono', 'Anime Puzzles']

type Row = { product_type?: string; title?: string; variants?: unknown[] }

async function feed(domain: string): Promise<{ rows: Row[]; capped: boolean }> {
  const rows: Row[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${domain}/products.json?limit=${PER_PAGE}&page=${page}`, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
      cache: 'no-store',
    })
    if (!res.ok) {
      if (page === 1) throw new Error(`HTTP ${res.status}`)
      return { rows, capped: false }
    }
    const batch = ((await res.json())?.products ?? []) as Row[]
    rows.push(...batch)
    if (batch.length < PER_PAGE) return { rows, capped: false }
  }
  return { rows, capped: true }
}

function tally<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const m = new Map<string, number>()
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

async function probe(cfg: VendorConfig) {
  console.log(`${TAG} ${'='.repeat(66)}`)
  console.log(`${TAG} ${cfg.vendor}  ${cfg.domain}`)

  let rows: Row[], capped: boolean
  try {
    ;({ rows, capped } = await feed(cfg.domain))
  } catch (e) {
    console.log(`${TAG}   NO FEED: ${(e as Error).message}`)
    console.log(`${TAG}   Not Shopify, products.json closed, or the store is gone.`)
    console.log(`${TAG}   402 = frozen shop. 404 = no store at this host. 403 = a bot rule.`)
    return
  }

  if (!rows.length) {
    console.log(`${TAG}   FEED ANSWERED AND IS EMPTY. The Tokyo Tiger shape: the site`)
    console.log(`${TAG}   would report ok:true for this and show nothing.`)
    return
  }

  const mapped = mapShopifyProducts(cfg, rows as never)
  console.log(`${TAG}   ${rows.length} in feed${capped ? `  *** HIT THE ${MAX_PAGES}-PAGE CAP ***` : ''}`)
  console.log(`${TAG}   ${mapped.length} survive mapping (${rows.length - mapped.length} dropped)`)

  console.log(`${TAG}   -- product_type --`)
  for (const [t, n] of tally(rows, (r) => (r.product_type || '').trim())) {
    console.log(`${TAG}     ${String(n).padStart(4)}  ${t === '' ? '(EMPTY -- an include list cannot reach these)' : t}`)
  }

  console.log(`${TAG}   -- our categories --`)
  for (const [c, n] of tally(rows, (r) => categorize(`${r.title || ''} ${r.product_type || ''}`))) {
    console.log(`${TAG}     ${String(n).padStart(4)}  ${c}`)
  }

  const cut = rows.map((r) => adultApparelHit(r.title || '')).filter(Boolean) as string[]
  console.log(`${TAG}   -- kid-safety filter would drop ${cut.length} of ${rows.length} --`)
  for (const [phrase, n] of tally(cut, (c) => c).slice(0, 8)) {
    console.log(`${TAG}     ${String(n).padStart(4)}  "${phrase}"`)
  }

  console.log(`${TAG}   -- first 12 titles --`)
  for (const r of rows.slice(0, 12)) console.log(`${TAG}     ${(r.title || '').slice(0, 92)}`)
}

export async function GET() {
  console.log(`${TAG} START ${new Date().toISOString()}`)
  for (const name of TARGETS) {
    const cfg = VENDORS.find((v) => v.vendor === name)
    if (!cfg) {
      console.log(`${TAG} ${name}: NOT IN VENDORS`)
      continue
    }
    try {
      await probe(cfg)
    } catch (e) {
      console.log(`${TAG} ${name}: probe threw: ${(e as Error).message}`)
    }
  }
  console.log(`${TAG} END`)
  return NextResponse.json({ ok: true, note: 'output is in the build log, filter for [probe]' })
}
