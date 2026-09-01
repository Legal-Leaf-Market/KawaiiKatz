import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { fetchAwinFeed, hasFeed } from './awin-feed'

import { VENDORS, liveVendors, isUntracked, vendorForId, type Product } from '@/lib/data'
import { mapShopifyProducts, mapWooProducts } from '@/lib/catalog-shared'
import { MODEL_SCAN_CATS, isAdultApparelByText } from '@/lib/adult-apparel'
import { scanForBodyModels } from '@/lib/person-scan'
import { rankSimilar } from '@/lib/similar'

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
 * It used to be `KawaiiKatzBot/1.0`. The standing theory was that a
 * self-identified bot UA was why Tokyo Tiger returned nothing, and this is
 * Legal-Leaf's header, adopted from a scraper that reads nine storefronts with
 * it.
 *
 * THE THEORY WAS WRONG, and it is recorded here so nobody re-runs the
 * experiment. Measured 2026-08-22 from a preview deploy (see the probe note in
 * PROJECT_GUIDE §4): with this exact header, from Vercel's own IPs, Tokyo Tiger
 * answers **HTTP 403**. It is not the User-Agent. It is host-level bot
 * protection, and no header will get past it — which was named as the fallback
 * suspect and is now the finding.
 *
 * The change is kept anyway. It costs nothing, it matches the sister site, and
 * `Mozilla/5.0` is what the other eleven vendors are now measured working with.
 * But it is a tidy-up, not a fix, and the shelf did not grow by one product
 * because of it.
 *
 * Changing it is not free: eleven vendors currently work. If one of them ever
 * starts failing, suspect this line first.
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
/**
 * Source one vendor, by whichever route that vendor has.
 *
 * A merchant behind bot protection cannot be scraped however good the headers
 * are (§4), but an AWIN merchant can still be READ, because the network
 * publishes the catalogue as a datafeed. So the choice of route is a property
 * of the vendor rather than a fallback: hasFeed() decides, and a feed vendor
 * never touches products.json.
 *
 * Returns the same shape as scrapeVendor so the caller cannot tell them apart.
 * `capped` is always false for a feed: a feed is the whole catalogue in one
 * file, so there is no page limit to run into and nothing to warn about.
 */
/**
 * The WooCommerce Store API: public, unauthenticated, read-only, and built to
 * be read. Three approved merchants answer here and answered 404 on
 * products.json, which is the whole reason this function exists.
 *
 * PAGINATION IS `page`, AND THE CAP IS SMALLER THAN SHOPIFY'S. Woo's per_page
 * maxes out at 100 against Shopify's 250, so the same MAX_PAGES would read less
 * than half as deep. WOO_MAX_PAGES is raised to keep the reach comparable.
 *
 * A page that comes back short is the last page, same rule as the Shopify door.
 * Every exit other than exhausting the cap returns directly, for the reason
 * written on that door: `break` here would fall through to the cap warning and
 * report a vendor that failed on page 1 as a vendor too big to fit.
 */
const WOO_PER_PAGE = 100
const WOO_MAX_PAGES = 12

async function scrapeWooVendor(vendorName: string): Promise<{ products: Product[]; capped: boolean }> {
  const vendor = VENDORS.find((v) => v.vendor === vendorName)
  if (!vendor) return { products: [], capped: false }

  const all: Product[] = []
  try {
    for (let page = 1; page <= WOO_MAX_PAGES; page++) {
      const url =
        `${vendor.domain}/wp-json/wc/store/v1/products?per_page=${WOO_PER_PAGE}&page=${page}`
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': SCRAPE_UA },
        cache: 'no-store',
      })
      if (!res.ok) return { products: all, capped: false }
      const raw = (await res.json()) as Parameters<typeof mapWooProducts>[1]
      if (!Array.isArray(raw) || !raw.length) return { products: all, capped: false }
      all.push(...mapWooProducts(vendor, raw))
      if (raw.length < WOO_PER_PAGE) return { products: all, capped: false }
    }
  } catch {
    return { products: all, capped: false }
  }
  console.warn(
    `[catalog] ${vendorName} still had a full page at the ${WOO_MAX_PAGES}-page Woo cap; catalogue may be truncated`
  )
  return { products: all, capped: true }
}

async function sourceVendor(vendorName: string): Promise<{ products: Product[]; capped: boolean }> {
  if (hasFeed(vendorName)) {
    return { products: await fetchAwinFeed(vendorName), capped: false }
  }
  const cfg = VENDORS.find((v) => v.vendor === vendorName)
  if (cfg?.platform === 'woo') return scrapeWooVendor(vendorName)
  return scrapeVendor(vendorName)
}

/* v9 -> v10: sourceVendor can now return rows built by the WooCommerce
   door. Without the bump a warm 6h entry would go on serving the old
   code's answer for those vendors, which was an empty list, and the
   whole change would look like it silently did nothing. */
const fetchVendorCatalog = unstable_cache(sourceVendor, ['vendor-catalog-v10'], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
  tags: ['catalog'],
})

/**
 * The catalogue, optionally narrowed to a few vendors.
 *
 * -----------------------------------------------------------------------------
 * WHY A SUBSET EXISTS AT ALL
 *
 * Section 4b has been counting catalogue-backed prerendered routes since there
 * were three of them, and the Decora feeds are where the count finally bit: two
 * of them hit `staticPageGenerationTimeout` at 240 seconds on their first
 * attempt, on the deploy of 2c30f74. Every one of those feeds publishes ONE
 * vendor's shelf and was paying for eighteen — a full fan-out plus a coco-ssd
 * scan over roughly two thousand garment photographs, to write out 437 rows
 * from Grumpy Bunny.
 *
 * Narrowing costs nothing anyone else pays for. The per-vendor
 * `unstable_cache` entries are the same entries, so a narrowed caller warms the
 * cache for the full one and vice versa; the only work that disappears is work
 * that was being thrown away.
 *
 * The `vendors` argument is a filter, not a second source. Everything below it
 * — de-dupe, the text filter, the image scan — runs exactly as it does for the
 * whole catalogue, because a safety filter that a narrow caller can skip is a
 * safety filter with a hole in it.
 */
async function buildCatalog(
  vendorNames?: string[],
  opts: { bulkScan?: boolean } = {}
): Promise<CatalogResult> {
  // Filter to the live vendors ONCE and index everything off that same array.
  // `results[i]` is matched back to its vendor by position, so filtering inside
  // the loop instead would slide every vendor one place along and file one
  // merchant's products under another merchant's name.
  const want = vendorNames ? new Set(vendorNames) : null
  const live = liveVendors().filter((v) => !want || want.has(v.vendor))
  const held = VENDORS.filter((v) => v.pending && (!want || want.has(v.vendor)))
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

  // --- Adult-model exclusion ---
  // Layer 1: instant text filter over suggestive-cut / adult-model wording.
  // Runs on EVERY category as of 2026-08-30, not just apparel and accessories.
  // Three garments were reaching the site filed as `plush` and `tech`, where
  // the filter could not see them; a safety filter must not depend on the
  // classifier being right, because the classifier being wrong is exactly when
  // it matters. See isAdultApparelByText.
  //
  // No cache version bump: this runs here, AFTER the per-vendor unstable_cache,
  // so no cached entry's contents change meaning.
  list = list.filter((p) => !isAdultApparelByText(p.name, p.cat))

  // Layer 2: coco-ssd image scan drops photos featuring a full-body (adult)
  // model. Scoped to apparel/accessories with an image; budgeted so a cold
  // build can't hang. Unscanned items stay (the text filter is the backstop)
  // and get caught on later loads as the in-process verdict cache warms.
  //
  // `bulkScan: false` is for a caller that renders a HANDFUL of products and
  // then screens exactly those — see getProductPageData, which is the only one.
  // It is not an escape hatch: that function does the screening itself and
  // never hands the unscanned list to anybody, because a safety filter a caller
  // can skip is a safety filter with a hole in it.
  // INTERLEAVED BY VENDOR, because the budget is a fixed 35 seconds and
  // whoever sorts first eats it.
  //
  // This was a straight `filter`, which was fine while apparel was spread
  // thinly across the catalogue and stopped being fine the moment Anime Jacket
  // arrived: forcing 715 garments into `apparel` put all 715 into this queue at
  // once. In list order that is one vendor's block of 715 sitting in front of
  // everybody else, so the vendors that were being scanned before could stop
  // being reached at all. Not a filter getting weaker, a filter getting pointed
  // somewhere else, which is worse because the number of scans does not drop
  // and nothing looks wrong.
  //
  // Round-robin gives every vendor the same share of whatever the budget
  // reaches. A vendor with 715 photos still gets more scans than one with 30,
  // it just cannot go first with all of them.
  //
  // THE REAL FIX IS PERSISTENCE AND IT IS NOT THIS. `verdictCache` in
  // person-scan is an in-process Map, so it dies with the build worker and
  // every deploy re-scans from zero against the same 35 seconds. Caching
  // verdicts by image URL across builds would make coverage compound toward
  // complete instead of resetting. It is not done here because this container
  // cannot reach an image to test a change to a safety path, and an untested
  // rewrite of the filter is a worse trade than an untested ordering of it.
  const interleaveByVendor = (rows: Product[]): Product[] => {
    const byVendor = new Map<string, Product[]>()
    for (const p of rows) {
      const q = byVendor.get(p.vendor)
      if (q) q.push(p)
      else byVendor.set(p.vendor, [p])
    }
    const queues = [...byVendor.values()]
    const out: Product[] = []
    for (let i = 0; out.length < rows.length; i++) {
      for (const q of queues) if (i < q.length) out.push(q[i])
    }
    return out
  }
  const scanTargets =
    opts.bulkScan === false
      ? []
      : interleaveByVendor(list.filter((p) => MODEL_SCAN_CATS.has(p.cat) && p.image))
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
}

/** The whole catalogue. What every page and /api/catalog call. */
export const getCatalog = cache((): Promise<CatalogResult> => buildCatalog())

/**
 * Everything one product page renders, screened.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS EXISTS: A PRODUCT PAGE WAS BUILDING THE WHOLE SHOP
 *
 * /p/[id] renders on demand — there are ~4,400 products and prerendering them
 * all would add 4,400 pages to a build already measured in minutes (§4b). Each
 * first view therefore ran getCatalog() in a cold lambda, and getCatalog() ends
 * with a coco-ssd pass over every apparel photograph in the catalogue: load
 * TensorFlow.js, then scan for up to 35 seconds. To render one product.
 *
 * Jacob's report was "it's like it's building each one", which is exactly what
 * it was doing, and it is §4b's own lesson arriving on the one route nobody had
 * applied it to: a route's cost should be the size of its output, not the size
 * of the catalogue.
 *
 * -----------------------------------------------------------------------------
 * IT DOES NOT SCAN, AND THE FIRST VERSION OF THIS DID
 *
 * The obvious move was to screen the seven products this page renders with the
 * coco-ssd scan and no budget: cheap, and a stronger guarantee per item than
 * the bulk pass, which is budgeted and fails open ("anything not reached within
 * the budget is simply omitted"). It shipped that way and 404'd on the first
 * product tried — `gbun-acdc-rag-trousers`, an ACDC RAG harness skirt that
 * /feeds/decora-fits.xml publishes and /decora shows a tile for.
 *
 * That is worse than what it fixed. A page that filters MORE than the catalogue
 * that linked to it turns every one of those links into a dead end, and the
 * links here are Pins: public, durable, and pointed at us by our own feeds.
 *
 * So the rule is that this page renders what the catalogue contains, no more
 * and no less. That is not a hole in the safety filter, it is the filter's
 * stated contract (§4): the text filter runs on every category inside
 * buildCatalog where no caller can reach past it, the image scan is explicitly
 * best-effort, and "unscanned items stay" is the documented behaviour rather
 * than an accident. Anything genuinely adult-model has to be caught where the
 * catalogue is built, because that is the one place every surface agrees on.
 */
export const getProductPageData = cache(async (
  id: string,
  similarCount: number
): Promise<{ product: Product; similar: Product[] } | null> => {
  /**
   * ONE VENDOR, NOT NINETEEN, and this is the half of the fix that was missing.
   *
   * Dropping the coco-ssd scan took the worst of it, and the page was still
   * slow: it fanned out across every vendor, read nineteen cache entries and
   * de-duped and text-filtered 6,782 products, to render one. The production
   * log said so plainly - a `/p/<id>` request logging "[catalog] pending, not
   * scraped: ..." is the whole catalogue being assembled for one page.
   *
   * The id already says which vendor it belongs to: ids are `<prefix>-<handle>`
   * and the prefix is a vendor key. So Plushible's 308 products get built
   * instead of everybody's 6,782.
   *
   * The `similar` strip is therefore SAME-SHOP, which is a change and a
   * defensible one: a second thing from the shop the visitor is already looking
   * at is one checkout and one shipping charge instead of two. An unknown
   * prefix falls back to the whole catalogue, so a vendor rename can never 404
   * a live page.
   */
  const vendor = vendorForId(id)
  const { products } = vendor
    ? await buildCatalog([vendor], { bulkScan: false })
    : await buildCatalog(undefined, { bulkScan: false })
  const target = products.find((p) => p.id === id)
  if (!target) return null

  return {
    product: target,
    similar: rankSimilar(target, products.filter((p) => p.image), similarCount),
  }
})

/**
 * The same catalogue, built from named vendors only.
 *
 * For a route whose whole output comes from one shelf — the Decora feeds — so
 * it stops paying for seventeen storefronts it never reads. Not react-cached:
 * the callers ask once per render, and keying a cache() on an array argument
 * would miss on every call anyway.
 */
export function getVendorCatalog(vendors: string[]): Promise<CatalogResult> {
  return buildCatalog(vendors)
}

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
