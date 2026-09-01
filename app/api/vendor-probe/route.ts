import { NextResponse } from 'next/server'

import { VENDORS, type VendorConfig } from '@/lib/data'
import { mapWooProducts } from '@/lib/catalog-shared'

/**
 * TEMPORARY. Delete this route once the anime cluster is settled.
 *
 * `pnpm probe` cannot reach a merchant host from a Claude Code container: the
 * egress proxy answers 403 to the CONNECT for every one of them. PROJECT_GUIDE
 * section 4 records the way through, and this is it. A prerendered route
 * EXECUTES DURING `next build`, on Vercel's builder, which does have open
 * egress. Results go in the RESPONSE BODY, which `force-static` prerenders to a
 * real file on the production domain: the build log collapsed four of five
 * result blocks under the catalogue's own logging, so the body is the record.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS ONE KNOCKS ON EVERY DOOR
 *
 * The first version asked products.json and stopped. All five answered 404 or
 * 500, and the conclusion drawn from that was too strong: a dead products.json
 * says that ONE endpoint is off, not that a shop has no products and not that
 * it cannot be read. This site's ingest only knows the Shopify door, so "we
 * cannot read it" and "it has no feed" look identical from here, and they are
 * completely different problems. The sister site already learned this and runs
 * a ladder for it: products.json, then the WooCommerce Store API, then JSON-LD
 * off the page itself.
 *
 * So this asks what the shop actually IS before anyone concludes anything:
 * every known feed endpoint, then the homepage HTML for the platform's own
 * fingerprints, then the sitemap for the product URL shape. A merchant that
 * answers on any of these is ingestable with a strategy we may not have written
 * yet, which is a job, not a dead end.
 *
 * IT NEVER REQUESTS A TRACKED URL. Bare domains only, no `?ref=`. A GET on a
 * tracking link registers a real click and pollutes the owner's own conversion
 * stats with our traffic.
 */
export const dynamic = 'force-static'

const UA = 'Mozilla/5.0 (compatible; KawaiiKatzProbe/1.0)'
const TAG = '[probe]'

const TARGETS = ['Anime Bedding', 'Anime Backpacks', 'Anime Jacket', 'Anime Kimono', 'Anime Puzzles']

/** Platform fingerprints, looked for in the homepage HTML. */
const TELLS: [string, RegExp][] = [
  ['shopify', /cdn\.shopify\.com|Shopify\.theme|shopify-features|myshopify\.com/i],
  ['woocommerce', /woocommerce|wp-content\/plugins\/woocommerce/i],
  ['wordpress', /wp-content|wp-includes|wp-json/i],
  ['bigcommerce', /cdn\d*\.bigcommerce\.com|bigcommerce\.com\/s-/i],
  ['wix', /static\.wixstatic\.com|wix-code|_wixCssImports/i],
  ['squarespace', /squarespace\.com|static1\.squarespace/i],
  ['magento', /Magento_|mage\/|static\/version\d/i],
  ['salla/zid/other-saas', /salla\.sa|zid\.store/i],
  ['shopline', /shoplineapp\.com/i],
  ['ecwid', /app\.ecwid\.com|ecwid\.com\/script/i],
  ['cloudflare-block', /Just a moment|cf-browser-verification|Attention Required/i],
]

type WooRow = { name?: string; categories?: { name?: string }[] }

function tally<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const m = new Map<string, number>()
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

/**
 * Round two: the doors are settled, so this reads CONTENTS.
 *
 * Three of the five answer the WooCommerce Store API. Knowing that a door
 * opens is not the same as having read the feed, and section 4's rule is
 * explicit that clearing `pending` needs the feed read, not the endpoint
 * pinged: guess the include list too wide and the shelf fills with gift cards,
 * too narrow and the vendor matches nothing and reads as a shop with no stock.
 *
 * So this runs the REAL mapper, mapWooProducts, the same one the catalogue
 * will use. What it reports is therefore what the site would actually get,
 * including how many rows the kid-safety filter removes on the way, which is
 * the number to read first on any vendor going onto a kid-facing shelf.
 */
async function probe(cfg: VendorConfig) {
  const d = cfg.domain.replace(/\/$/, '')
  const out: Record<string, unknown> = { vendor: cfg.vendor, domain: d, platform: cfg.platform ?? 'shopify' }

  if (cfg.platform !== 'woo') {
    /* The two with no API. Count what the homepage links to, so the size of
       the catalogue behind them is on the record even though we cannot read
       it yet, and a later pass knows whether a scraper is worth writing. */
    try {
      const res = await fetch(`${d}/`, { headers: { 'User-Agent': UA }, cache: 'no-store' })
      const html = await res.text()
      const links = [...html.matchAll(/href="([^"]*\/product\/[^"#?]+)"/g)].map((m) => m[1])
      out.noApi = true
      out.productLinks = new Set(links).size
      out.sampleLinks = [...new Set(links)].slice(0, 8)
    } catch (e) {
      out.error = (e as Error).message
    }
    console.log(`${TAG} ${cfg.vendor}: ${JSON.stringify(out).slice(0, 600)}`)
    return out
  }

  const rows: WooRow[] = []
  let pages = 0
  try {
    for (let page = 1; page <= 12; page++) {
      const res = await fetch(`${d}/wp-json/wc/store/v1/products?per_page=100&page=${page}`, {
        headers: { Accept: 'application/json', 'User-Agent': UA }, cache: 'no-store',
      })
      if (!res.ok) break
      const batch = (await res.json()) as WooRow[]
      if (!Array.isArray(batch) || !batch.length) break
      rows.push(...batch); pages++
      if (batch.length < 100) break
    }
  } catch (e) { out.error = (e as Error).message }

  const mapped = mapWooProducts(cfg, rows as never)
  out.pages = pages
  out.inFeed = rows.length
  out.mapped = mapped.length
  out.droppedByPipeline = rows.length - mapped.length

  out.categories = tally(rows, (r) => (r.categories || []).map((c) => c.name).join(' | ') || '(none)').slice(0, 22)
  out.ourCats = tally(mapped, (m) => m.cat)
  out.kidSafeFalse = mapped.filter((m) => m.kidSafe === false).length

  const prices = mapped.map((m) => m.price).filter((n) => n > 0).sort((a, b) => a - b)
  out.priceBand = prices.length
    ? { min: prices[0], median: prices[Math.floor(prices.length / 2)], max: prices[prices.length - 1] }
    : null

  out.sample = mapped.slice(0, 14).map((m) => ({ n: m.name.slice(0, 76), p: m.price, cat: m.cat, url: m.url.slice(0, 90) }))
  console.log(`${TAG} ${cfg.vendor}: ${JSON.stringify(out).slice(0, 900)}`)
  return out
}

export async function GET() {
  const results = []
  for (const name of TARGETS) {
    const cfg = VENDORS.find((v) => v.vendor === name)
    if (!cfg) { results.push({ vendor: name, error: 'NOT_IN_VENDORS' }); continue }
    try { results.push(await probe(cfg)) }
    catch (e) { results.push({ vendor: name, domain: cfg.domain, error: (e as Error).message }) }
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString(), results })
}
