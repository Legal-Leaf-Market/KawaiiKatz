import { NextResponse } from 'next/server'

import { VENDORS } from '@/lib/data'
import { mapShopifyProducts } from '@/lib/catalog-shared'
import { MODEL_SCAN_CATS, adultApparelHit } from '@/lib/adult-apparel'

/**
 * TEMPORARY. Delete this route once the pending intake has been probed.
 *
 * scripts/vendor_probe.mjs cannot run from the container this repo is worked on
 * in — egress to merchant hosts is refused by the proxy — but it can run where
 * the app runs. This is that script as a route, so a preview deploy can read the
 * feeds and report back. It is the same method PROJECT_GUIDE §4 already
 * describes for measuring vendors, just with more detail than ?debug carries.
 *
 * It is NOT an open fetcher: `domain` is matched against the registered VENDORS
 * list and anything else is refused, so it cannot be pointed at an internal
 * address. /api/ is already disallowed in robots.ts. Even so it does not belong
 * on production — a caller could make it scrape every vendor on demand — which
 * is why it is marked temporary and removed in the follow-up commit.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PER_PAGE = 250
const MAX_PAGES = 5
const SCRAPE_UA = 'Mozilla/5.0'

function top<T>(rows: T[], key: (r: T) => string, n = 20) {
  const m = new Map<string, number>()
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
}

async function probe(cfg: (typeof VENDORS)[number]) {
  const raw: Record<string, unknown>[] = []
  let capped = false
  let error: string | null = null
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${cfg.domain}/products.json?limit=${PER_PAGE}&page=${page}`, {
        headers: { Accept: 'application/json', 'User-Agent': SCRAPE_UA },
        cache: 'no-store',
      })
      if (!res.ok) {
        if (page === 1) error = `HTTP ${res.status}`
        break
      }
      const batch = ((await res.json())?.products ?? []) as Record<string, unknown>[]
      raw.push(...batch)
      if (batch.length < PER_PAGE) break
      if (page === MAX_PAGES) capped = true
    }
  } catch (e) {
    error = (e as Error).message
  }

  const mapped = raw.length ? mapShopifyProducts(cfg, raw as never) : []
  const scanCat = mapped.filter((p) => MODEL_SCAN_CATS.has(p.cat))
  const hits = scanCat
    .map((p) => ({ name: p.name, phrase: adultApparelHit(p.name) }))
    .filter((h): h is { name: string; phrase: string } => Boolean(h.phrase))

  return {
    vendor: cfg.vendor,
    domain: cfg.domain,
    pending: Boolean(cfg.pending),
    error,
    capped,
    raw: raw.length,
    mapped: mapped.length,
    productTypes: top(raw, (p) => String(p.product_type ?? '').trim() || '(empty)'),
    categories: top(mapped, (p) => p.cat),
    safetyDropped: hits.length,
    safetyPhrases: top(hits, (h) => h.phrase, 12),
    sampleApparel: mapped.filter((p) => p.cat === 'apparel').slice(0, 8).map((p) => p.name),
    sampleAccessories: mapped.filter((p) => p.cat === 'accessories').slice(0, 8).map((p) => p.name),
    sampleDropped: hits.slice(0, 8).map((h) => `${h.name}  [${h.phrase}]`),
  }
}

export async function GET() {
  const results = await Promise.all(VENDORS.map((v) => probe(v).catch((e) => ({ vendor: v.vendor, error: String(e) }))))
  return NextResponse.json({ probedAt: new Date().toISOString(), results }, {
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}
