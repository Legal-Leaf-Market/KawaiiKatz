import 'server-only'
import { cache } from 'react'
import type { Product } from './data'
import { VENDORS } from './data'
import { mapAwinRows, type AwinRow } from './catalog-shared'

/**
 * Read AWIN product feeds.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS EXISTS AT ALL
 *
 * This site reads Shopify's products.json and nothing else, and GiftLAB sits
 * behind Cloudflare: /products.json, /collections/all/products.json and even
 * /sitemap.xml all answer 403 with the "Just a moment..." interstitial,
 * measured from a Vercel build on 2026-08-30. PROJECT_GUIDE §4 already settles
 * that no User-Agent gets past host-level protection, so there is no scraper to
 * write. Being approved on AWIN buys tracking, not access.
 *
 * What it does buy is the datafeed, which is a better source than a scrape in
 * three ways: the merchant maintains it, it carries `product_type` (which the
 * scraper reads and throws away, see §4f), and `aw_deep_link` is a tracked link
 * AWIN built rather than one we assemble.
 *
 * -----------------------------------------------------------------------------
 * A LIST OF URLS, NOT ONE PER VENDOR, AND THAT IS THE WHOLE DESIGN
 *
 * AWIN hands out download URLs that do not say which merchant they hold. They
 * arrive looking like `.../feed/F4238.csv.gz` and `.../feed/F3673.csv.gz`, and
 * a single one of them may hold several advertisers at once. Asking an operator
 * to work out which file is which merchant is asking them to guess, and a wrong
 * guess is not visible: the products all map, and every one is filed under the
 * wrong vendor at the wrong commission, linking to the wrong programme.
 *
 * So the config is a flat LIST of feed URLs and nothing else. Every feed is
 * downloaded once, the rows are pooled, and each vendor takes the rows whose
 * `merchant_id` matches its own `awinMerchantId` (see mapAwinRows). Order does
 * not matter, a combined feed and three separate ones behave identically, and
 * an extra feed for a merchant we do not carry is simply ignored.
 *
 * -----------------------------------------------------------------------------
 * THE URLS ARE CREDENTIALS
 *
 * Every AWIN download URL has the publisher's API key in its path. They are
 * read from the environment and never written down. Unset means the AWIN
 * vendors yield nothing and say so once — the same fail-closed-and-quiet
 * posture the scraper takes for a vendor that 500s, so a missing credential can
 * never take the site down.
 */

/**
 * -----------------------------------------------------------------------------
 * WHAT REAL FEEDS TURNED OUT TO LOOK LIKE, measured 2026-08-30 on two files
 * pulled straight from the AWIN dashboard. Read this before generating another.
 *
 * AWIN emits at least two formats and they are not interchangeable.
 *
 *   "Awin" (standard)   GiftLAB, 2,426 rows, 86 columns, one row per product:
 *                       merchant_product_id, product_name, search_price,
 *                       merchant_image_url, merchant_id. This reader speaks it,
 *                       and parsed that exact file: 2,426 in, 2,387 mapped, all
 *                       merchant_id 95201. Parser and merchant filter are now
 *                       proven against real data, not a synthetic fixture.
 *
 *   "retail" (Google)   MamaRaya, 854 rows, Google Merchant Center columns:
 *                       id, title, price, image_link, advertiser_id. Every
 *                       field this reader looks for is absent, so it maps zero.
 *
 * ASK FOR THE "Awin" FORMAT. The retail one is worse than a scrape even after
 * translating the columns: its 854 rows are the same ~58 products exploded one
 * per size ("Baby Gift Basket - S / M / L / XL / XXL / XXXL"), and
 * `item_group_id` is EMPTY on all 854, so there is no regrouping them. The
 * fields that would have justified switching are empty too: product_type 0/854,
 * adult 0/854, age_group 0/854, sale_price 0/854.
 *
 * So MamaRaya and BRKOX stay on the scraper, and that is the right outcome
 * rather than a consolation. A Shopify store that answers products.json does
 * not need this reader, and where a feed is variant-exploded the scraper is
 * strictly better, because mapShopifyProducts collapses variants and a feed
 * cannot.
 *
 * WORTH STATING PLAINLY: this reader currently has no vendor that needs it.
 * It was built for GiftLAB, whose catalogue then measured as a poor fit and was
 * declined. It is kept because it is proven and because the next
 * Cloudflare-blocked AWIN merchant will need exactly this.
 *
 * -----------------------------------------------------------------------------
 * `AWIN_FEEDS`: one or more Create-a-Feed download URLs, separated by
 * whitespace, commas or newlines.
 *
 * `AWIN_FEED_<VENDOR>` is also read, for a single named feed. Both are merged,
 * because the earlier instructions asked for the per-vendor form and an
 * operator who followed them should not have to undo that.
 */
function feedUrls(): string[] {
  const out = new Set<string>()
  for (const raw of String(process.env.AWIN_FEEDS || '').split(/[\s,]+/)) {
    const u = raw.trim()
    if (/^https?:\/\//i.test(u)) out.add(u)
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (!key.startsWith('AWIN_FEED_')) continue
    const u = String(val || '').trim()
    if (/^https?:\/\//i.test(u)) out.add(u)
  }
  return [...out]
}

/** True when this vendor could be sourced from a feed at all. */
export function hasFeed(vendor: string): boolean {
  const cfg = VENDORS.find((v) => v.vendor === vendor)
  return Boolean(cfg?.awinMerchantId && feedUrls().length)
}

/**
 * Split one CSV buffer into rows.
 *
 * Written out rather than `split(',')` because product descriptions contain
 * commas and quotes as a matter of course, and a naive split silently shifts
 * every column after the first offending one. The failure would not look like
 * an error: prices would land in the image column and a merchant would appear
 * to sell thousands of things at $0.
 *
 * RFC4180 rules, which is what AWIN emits: fields may be quoted, a doubled
 * quote inside a quoted field is a literal quote, and a newline inside quotes
 * is part of the value — which is why this takes a whole buffer rather than
 * working line by line.
 */
function parseCsv(text: string): AwinRow[] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += c
      }
      continue
    }

    if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      field = ''
      if (row.length && row[row.length - 1].endsWith('\r')) {
        row[row.length - 1] = row[row.length - 1].slice(0, -1)
      }
      rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  const header = rows.shift()
  if (!header) return []
  // Strip a UTF-8 BOM off the first header cell, or the first column's key is
  // "﻿aw_deep_link" and every lookup of it silently returns undefined.
  const keys = header.map((h) => h.trim().replace(/^﻿/, ''))

  const out: AwinRow[] = []
  for (const r of rows) {
    // A short row is a truncated download, not a product. Skipping it is safer
    // than filling the missing columns with undefined and mapping garbage.
    if (r.length < 2) continue
    const o: AwinRow = {}
    for (let i = 0; i < keys.length; i++) o[keys[i]] = r[i] ?? ''
    out.push(o)
  }
  return out
}

async function downloadFeed(url: string): Promise<AwinRow[]> {
  // Never log the URL: the API key is in its path.
  const label = url.replace(/^https?:\/\/([^/]+).*?([^/]+)$/, '$1/…/$2')
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      console.warn(`[awin-feed] ${label}: HTTP ${res.status}`)
      return []
    }

    /**
     * The URL asks for gzip, but AWIN sometimes serves the file with
     * Content-Encoding set, in which case fetch() has already decompressed it
     * and a second pass would throw. Sniff the gzip magic number (1f 8b)
     * rather than trusting the filename or the header.
     */
    const buf = new Uint8Array(await res.arrayBuffer())
    let bytes: Uint8Array = buf
    if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
      const ds = new DecompressionStream('gzip')
      const stream = new Blob([buf as BlobPart]).stream().pipeThrough(ds)
      bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    }

    const rows = parseCsv(new TextDecoder('utf-8').decode(bytes))
    const merchants = [...new Set(rows.map((r) => `${r.merchant_id || '?'}:${r.merchant_name || '?'}`))]
    console.log(`[awin-feed] ${label}: ${rows.length} rows, merchants ${merchants.join(', ')}`)
    return rows
  } catch (e) {
    console.warn(`[awin-feed] ${label}: ${(e as Error).message}`)
    return []
  }
}

/**
 * Every feed's rows, pooled. `cache()` dedupes within one render pass, so three
 * AWIN vendors in one build download each file once between them rather than
 * three times each.
 */
const allRows = cache(async (): Promise<AwinRow[]> => {
  const urls = feedUrls()
  if (!urls.length) {
    console.log('[awin-feed] no AWIN_FEEDS configured, skipping every feed vendor')
    return []
  }
  const results = await Promise.all(urls.map(downloadFeed))
  return results.flat()
})

/**
 * One vendor's products, taken from whichever pooled feed holds its rows.
 *
 * Returns [] for every failure, having logged it. A vendor that cannot be read
 * must never be the reason a build fails or a page 500s: the rest of the
 * catalogue still loads, and `?debug` is where a missing vendor gets noticed.
 */
export async function fetchAwinFeed(vendorName: string): Promise<Product[]> {
  const cfg = VENDORS.find((v) => v.vendor === vendorName)
  if (!cfg) return []
  const products = mapAwinRows(cfg, await allRows())
  console.log(`[awin-feed] ${vendorName}: ${products.length} products after merchant filter`)
  return products
}
