import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'

import { VENDORS, liveVendors, isUntracked, type Product } from '@/lib/data'
import { mapShopifyProducts } from '@/lib/catalog-shared'
import { MODEL_SCAN_CATS, isAdultApparelByText } from '@/lib/adult-apparel'
import { scanForBodyModels } from '@/lib/person-scan'

/**
 * The one place the catalogue is built.
 *
 * Both `/api/catalog` (what the browser polls) and the pages themselves call
 * this, so a visitor's first paint and their background refresh come from the
 * same data with no second scrape. Sharing happens at three layers:
 *
 *   1. `cache()` — dedupes within a single render pass.
 *   2. `unstable_cache` per vendor — a cross-request entry holding that
 *      vendor's MAPPED products, shared by every route and every visitor.
 *   3. Route-segment `revalidate` on the callers — the rendered output itself
 *      is prerendered and shared by every visitor until it expires.
 *
 * Why the mapped result and not the raw responses: Next's data cache rejects
 * entries over 2MB, and Kore Kawaii alone returns 3-5MB per page of
 * products.json. So `next: { revalidate }` on those fetches silently cached
 * NOTHING — every build re-scraped roughly 20MB from nine storefronts, which is
 * what made a catalogue build take a minute. Mapping first drops that vendor to
 * 1.41MB, comfortably inside the limit; every other vendor is under 300KB.
 *
 * If a vendor ever grows past ~2MB mapped, its entry will silently stop caching
 * and builds will slow down again with no error. `pnpm build` printing
 * "Failed to set Next.js data cache" is the tell.
 *
 * Deliberately NOT `use cache`: that directive requires turning on Cache
 * Components app-wide, which changes rendering semantics for every route here.
 * `unstable_cache` is deprecated in favour of it but still shipped and is the
 * documented path for projects that have not opted in.
 */

export const CATALOG_REVALIDATE_SECONDS = 21600 // 6 hours

const MAX_PAGES = 5 // up to 250 * 5 = 1250 products per vendor
const PER_PAGE = 250

export type VendorStat = {
  vendor: string
  ok: boolean
  fetched: number
  /** Registered but not scraped — VendorConfig.pending. */
  pending?: boolean
  /** Clicks to this vendor currently earn nothing — see isUntracked(). */
  untracked?: boolean
  /** Still returning a full page at MAX_PAGES, so the catalogue is truncated. */
  capped?: boolean
}
export type CatalogResult = {
  products: Product[]
  count: number
  updated: string
  vendors: VendorStat[]
  dropped: number
}

/**
 * The User-Agent every vendor fetch is made with.
 *
 * It used to be `KawaiiKatzBot/1.0`, and that was the most likely reason Tokyo
 * Tiger returned zero products for eleven days while reporting `ok: true`: a
 * store behind bot protection rejects a self-identified bot and serves a
 * browser. The old comment on that vendor entry laid the test out — compare the
 * two UAs against the same URL, and if only the bot one fails, the fix is the
 * UA. That test cannot be run from this container (egress to merchant hosts is
 * refused by the proxy), but it does not need to be run to be acted on, because
 * Legal-Leaf's scraper has been fetching nine storefronts with plain
 * `Mozilla/5.0` for months — including four behind the same protection — and
 * this is that scraper's header, adopted rather than invented.
 *
 * The honest caveat: this is UNVERIFIED against Tokyo Tiger specifically. What
 * confirms it is `GET /api/catalog?debug` on the next deploy showing a non-zero
 * `fetched` for that vendor. If it is still zero, the UA was not the cause and
 * the next suspect is Cloudflare-level blocking that no header will get past.
 *
 * Changing this is not free: the other nine vendors currently work, so if one
 * of them ever starts failing, suspect this line first.
 */
const SCRAPE_UA = 'Mozilla/5.0'

async function scrapeVendor(vendorName: string): Promise<{ products: Product[]; capped: boolean }> {
  const vendor = VENDORS.find((v) => v.vendor === vendorName)
  if (!vendor) return { products: [], capped: false }

  const all: Product[] = []
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${vendor.domain}/products.json?limit=${PER_PAGE}&page=${page}`
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': SCRAPE_UA },
        // Explicitly uncached: these payloads run to 5MB and the data cache
        // caps entries at 2MB, so asking it to store them only produced
        // "Failed to set Next.js data cache" noise on every build. The mapped
        // output is cached instead, one layer up.
        cache: 'no-store',
      })
      // Every exit from this loop other than exhausting MAX_PAGES returns
      // directly. Using `break` here instead would fall through to the cap
      // warning below and report a vendor that failed on page 1 as a vendor too
      // big to fit — which is exactly what it did on the first build after this
      // function grew a return value: all twelve vendors "hit the cap" in a
      // container with no egress at all.
      if (!res.ok) return { products: all, capped: false }
      const data = (await res.json()) as { products?: unknown[] }
      const raw = (data.products ?? []) as Parameters<typeof mapShopifyProducts>[1]
      if (!raw.length) return { products: all, capped: false }
      all.push(...mapShopifyProducts(vendor, raw))
      if (raw.length < PER_PAGE) return { products: all, capped: false } // last page
    }
  } catch {
    // silently skip a failing vendor; others still load
    return { products: all, capped: false }
  }
  // Falling out of the loop means page MAX_PAGES was still full. The cap is a
  // runaway guard, not a product decision, so say so: a silent truncation here
  // reads as "that vendor only sells 1,250 things" and nobody would question it.
  console.warn(
    `[catalog] ${vendorName} still had a full page at the ${MAX_PAGES}-page cap; catalogue may be truncated`
  )
  return { products: all, capped: true }
}

/**
 * Cached per vendor, keyed by name. One slow vendor therefore cannot force the
 * other eight to be re-scraped, and a vendor that 500s just serves its previous
 * good list until it recovers.
 *
 * The key carries a version, and it must be bumped in the same commit as ANY
 * change to what a cached entry contains — a new field, a changed User-Agent, a
 * changed classifier. Without the bump, a warm 6h entry goes on serving results
 * built by the OLD code after the deploy that replaced it, and the change looks
 * like it silently did nothing. v1 -> v2 on 2026-08-22 for the UA change and
 * the include/exclude filtering below.
 */
const fetchVendorCatalog = unstable_cache(scrapeVendor, ['vendor-catalog-v2'], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
  tags: ['catalog'],
})

export const getCatalog = cache(async (): Promise<CatalogResult> => {
  // Filter to the live vendors ONCE and index everything off that same array.
  // `results[i]` is matched back to its vendor by position, so filtering inside
  // the loop instead would slide every vendor one place along and file one
  // merchant's products under another merchant's name.
  const live = liveVendors()
  const held = VENDORS.filter((v) => v.pending)
  if (held.length) {
    console.log(
      `[catalog] pending, not scraped: ${held.map((v) => v.vendor).join(', ')} (see VendorConfig.pending)`
    )
  }

  const results = await Promise.allSettled(live.map((v) => fetchVendorCatalog(v.vendor)))

  // Per-vendor counts, captured before de-dupe and filtering so a vendor that
  // returned nothing is distinguishable from one whose items were all filtered
  // out — a silent catch otherwise makes a dead vendor look like an empty one.
  const vendors: VendorStat[] = live.map((v, i) => {
    const r = results[i]
    return {
      vendor: v.vendor,
      ok: r.status === 'fulfilled',
      fetched: r.status === 'fulfilled' ? r.value.products.length : 0,
      capped: r.status === 'fulfilled' ? r.value.capped : false,
      untracked: isUntracked(v.vendor),
    }
  })
  // Pending vendors are reported too, rather than omitted. A vendor that is
  // being held back on purpose and one that has been forgotten look identical
  // in a list that only shows what was scraped.
  for (const v of held) {
    vendors.push({ vendor: v.vendor, ok: true, fetched: 0, pending: true, untracked: isUntracked(v.vendor) })
  }

  const products: Product[] = []
  for (const r of results) if (r.status === 'fulfilled') products.push(...r.value.products)

  // De-dupe by id, prefer entries that have an image
  const byId = new Map<string, Product>()
  for (const p of products) {
    const existing = byId.get(p.id)
    if (!existing || (!existing.image && p.image)) byId.set(p.id, p)
  }

  let list = [...byId.values()]

  // --- Adult-model exclusion (apparel & accessories only) ---
  // Layer 1: instant text filter over suggestive-cut / adult-model wording.
  list = list.filter((p) => !isAdultApparelByText(p.name, p.cat))

  // Layer 2: coco-ssd image scan drops photos featuring a full-body (adult)
  // model. Scoped to apparel/accessories with an image; budgeted so a cold
  // build can't hang. Unscanned items stay (the text filter is the backstop)
  // and get caught on later loads as the in-process verdict cache warms.
  const scanTargets = list.filter((p) => MODEL_SCAN_CATS.has(p.cat) && p.image)
  try {
    const flagged = await scanForBodyModels(
      scanTargets.map((p) => p.image),
      { concurrency: 4, budgetMs: 35000 }
    )
    if (flagged.size) list = list.filter((p) => !(MODEL_SCAN_CATS.has(p.cat) && flagged.has(p.image)))
  } catch {
    // scan unavailable — keep the text-filtered catalog
  }

  return {
    products: list,
    count: list.length,
    updated: new Date().toISOString(),
    vendors,
    dropped: vendors.reduce((n, v) => n + v.fetched, 0) - list.length,
  }
})

/**
 * How many products get inlined into a page's HTML as first-paint data.
 *
 * Not the whole catalogue: 1,600-odd products serialise to ~1.9MB, and putting
 * that in the document would trade a fast background fetch for a slow first
 * byte. This is sized to cover what is actually visible before a scroll — the
 * picks rail, the featured strip and the first grid page — after which the
 * client swaps in the full list.
 */
export const FIRST_PAINT_COUNT = 60
