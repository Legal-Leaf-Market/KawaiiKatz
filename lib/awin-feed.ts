import 'server-only'
import type { Product } from './data'
import { VENDORS } from './data'
import { mapAwinRows, type AwinRow } from './catalog-shared'

/**
 * Read an AWIN product feed.
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
 * What it does buy is the datafeed. AWIN's Create-a-Feed produces an HTTPS
 * download of the merchant's whole catalogue, which is a better source than a
 * scrape in three ways: the merchant maintains it, it carries `product_type`
 * (which the scraper reads and throws away, see §4f), and `aw_deep_link` is a
 * tracked link AWIN built rather than one we assemble.
 *
 * -----------------------------------------------------------------------------
 * THE URL IS A CREDENTIAL
 *
 * A Create-a-Feed URL has the publisher's API key in its path. It is read from
 * the environment and never written down. Unset means this vendor yields
 * nothing and says so once — the same fail-closed-and-quiet posture the scraper
 * takes for a vendor that 500s, so a missing credential can never take the site
 * down.
 */

/** Per-vendor env var holding a full Create-a-Feed download URL. */
const FEED_ENV: Record<string, string> = {
  GiftLAB: 'AWIN_FEED_GIFTLAB',
}

export function hasFeed(vendor: string): boolean {
  return Boolean(FEED_ENV[vendor])
}

/**
 * Split one CSV line into fields.
 *
 * Written out rather than `split(',')` because product descriptions contain
 * commas and quotes as a matter of course, and a naive split silently shifts
 * every column after the first offending one. The failure would not look like
 * an error: prices would land in the image column and the vendor would appear
 * to sell 2,426 things at $0.
 *
 * RFC4180 rules, which is what AWIN emits: fields may be quoted, a doubled
 * quote inside a quoted field is a literal quote, and a newline inside quotes
 * is part of the value (handled by the caller, which is why this takes a whole
 * buffer rather than a line).
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
      // A trailing \r belongs to the line ending, not the last field.
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

/**
 * Download, decompress and parse one vendor's feed.
 *
 * Returns [] for every failure, having logged it. A vendor that cannot be read
 * must never be the reason a build fails or a page 500s: the rest of the
 * catalogue still loads, and `?debug` is where a missing vendor gets noticed.
 */
export async function fetchAwinFeed(vendorName: string): Promise<Product[]> {
  const cfg = VENDORS.find((v) => v.vendor === vendorName)
  const envKey = FEED_ENV[vendorName]
  if (!cfg || !envKey) return []

  const url = process.env[envKey]
  if (!url) {
    console.log(`[awin-feed] ${vendorName}: ${envKey} is unset, skipping`)
    return []
  }

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      console.warn(`[awin-feed] ${vendorName}: HTTP ${res.status}`)
      return []
    }

    /**
     * The URL asks for gzip, but AWIN sometimes serves the file with
     * Content-Encoding set, in which case fetch() has already decompressed it
     * and a second pass would throw. Sniff the gzip magic number (1f 8b) rather
     * than trusting either the URL or the header.
     */
    const buf = new Uint8Array(await res.arrayBuffer())
    let bytes: Uint8Array = buf
    if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
      const ds = new DecompressionStream('gzip')
      const stream = new Blob([buf as BlobPart]).stream().pipeThrough(ds)
      bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    }

    const text = new TextDecoder('utf-8').decode(bytes)
    const rows = parseCsv(text)
    const products = mapAwinRows(cfg, rows)
    console.log(
      `[awin-feed] ${vendorName}: ${rows.length} rows -> ${products.length} products`
    )
    return products
  } catch (e) {
    console.warn(`[awin-feed] ${vendorName}: ${(e as Error).message}`)
    return []
  }
}
