import { NextResponse } from 'next/server'

import { VENDORS, type VendorConfig } from '@/lib/data'

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

type Probe = { url: string; status: number | string; note?: string; rows?: number }

async function ask(url: string, expect: 'json' | 'text'): Promise<Probe & { body?: unknown }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: expect === 'json' ? 'application/json' : 'text/html', 'User-Agent': UA },
      cache: 'no-store',
      redirect: 'follow',
    })
    if (!res.ok) return { url, status: res.status }
    if (expect === 'json') {
      const text = await res.text()
      try {
        const j = JSON.parse(text)
        const rows = Array.isArray(j) ? j.length : Array.isArray(j?.products) ? j.products.length : undefined
        return { url, status: res.status, rows, body: j }
      } catch {
        return { url, status: res.status, note: 'answered but is not JSON (probably an HTML page)' }
      }
    }
    return { url, status: res.status, body: await res.text() }
  } catch (e) {
    return { url, status: 'THREW', note: (e as Error).message }
  }
}

async function probe(cfg: VendorConfig) {
  const d = cfg.domain.replace(/\/$/, '')
  const out: Record<string, unknown> = { vendor: cfg.vendor, domain: d }

  /* ---- the feed doors, in the order the sister site tries them ---- */
  const doors: Record<string, Probe> = {}
  for (const [name, url, kind] of [
    ['shopify products.json', `${d}/products.json?limit=250`, 'json'],
    ['shopify collections', `${d}/collections/all/products.json?limit=250`, 'json'],
    ['woo store api v1', `${d}/wp-json/wc/store/v1/products?per_page=100`, 'json'],
    ['woo store api', `${d}/wp-json/wc/store/products?per_page=100`, 'json'],
    ['wp rest', `${d}/wp-json/`, 'json'],
  ] as [string, string, 'json'][]) {
    const r = await ask(url, kind)
    doors[name] = { url: r.url, status: r.status, rows: r.rows, note: r.note }
  }
  out.doors = doors

  /* ---- what is it, actually ---- */
  const home = await ask(`${d}/`, 'text')
  out.homepage = { status: home.status, note: home.note }
  if (typeof home.body === 'string') {
    const html = home.body
    out.platformTells = TELLS.filter(([, re]) => re.test(html)).map(([n]) => n)
    out.htmlBytes = html.length
    out.title = (/<title[^>]*>([^<]{0,120})/i.exec(html)?.[1] || '').trim()

    /* JSON-LD is the last door on the sister site's ladder and the one that
       works on a storefront with no API at all, because it is put there for
       Google rather than for us. Count Product nodes, do not parse them. */
    const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    let products = 0
    const types = new Set<string>()
    for (const b of blocks) {
      try {
        const parsed = JSON.parse(b[1].trim())
        for (const node of (Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])])) {
          const t = node?.['@type']
          if (t) (Array.isArray(t) ? t : [t]).forEach((x: string) => types.add(x))
          if (t === 'Product' || (Array.isArray(t) && t.includes('Product'))) products++
        }
      } catch { /* a malformed block is not a finding */ }
    }
    out.jsonLd = { blocks: blocks.length, productNodes: products, types: [...types] }

    /* Link shapes say more than any header. /products/ is Shopify,
       /product/ with a trailing slash is WooCommerce. */
    const shapes = ['/products/', '/product/', '/collections/', '/product-category/', '/shop/', '/item/']
    out.linkShapes = Object.fromEntries(
      shapes.map((s) => [s, (html.match(new RegExp(s.replace(/\//g, '\\/'), 'g')) || []).length]),
    )
  }

  const sm = await ask(`${d}/sitemap.xml`, 'text')
  out.sitemap =
    typeof sm.body === 'string'
      ? { status: sm.status, bytes: sm.body.length, head: sm.body.slice(0, 400) }
      : { status: sm.status, note: sm.note }

  console.log(`${TAG} ${cfg.vendor}: ${JSON.stringify(out).slice(0, 900)}`)
  return out
}

export async function GET() {
  const results = []
  for (const name of TARGETS) {
    const cfg = VENDORS.find((v) => v.vendor === name)
    if (!cfg) {
      results.push({ vendor: name, error: 'NOT_IN_VENDORS' })
      continue
    }
    try {
      results.push(await probe(cfg))
    } catch (e) {
      results.push({ vendor: name, domain: cfg.domain, error: (e as Error).message })
    }
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString(), results })
}
