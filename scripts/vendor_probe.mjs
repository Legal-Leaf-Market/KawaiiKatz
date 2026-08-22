/**
 * Read a candidate Shopify feed before it goes on the shelf.
 *
 *   node scripts/vendor_probe.mjs                    # every pending vendor
 *   node scripts/vendor_probe.mjs kawaiibabe.com     # one domain
 *   node scripts/vendor_probe.mjs https://a.com b.com
 *
 * This is the tool that turns `pending: true` in VENDORS into a real
 * registration. A vendor is added pending because nobody has read its feed, and
 * an unread feed cannot be given an honest `include` list or an honest
 * `forceCat`: guess too wide and the shelf fills with gift cards and sample
 * boxes, guess too narrow and the vendor silently matches nothing, which reads
 * on the site as a merchant who sells nothing rather than as a mistake.
 *
 * Ported from scripts/vendor_probe.py in Legal-Leaf (HerbalLeafMarket), which
 * does the same job for the dispensary storefronts. Same 250-row pages, same
 * runaway cap, same "a short page means the end" rule.
 *
 * IT DELIBERATELY IMPORTS THE REAL PIPELINE rather than reimplementing it.
 * mapShopifyProducts(), categorize() and adultApparelHit() are the site's own
 * functions, loaded straight out of lib/. A second copy of the classifier would
 * drift from the first, and it would drift silently — the probe would go on
 * reporting a shelf that the site no longer builds. If this script and
 * lib/catalog-source.ts ever disagree about what a feed yields, this script is
 * wrong.
 *
 * WHAT IT CANNOT SETTLE, and what still needs a person:
 *   - The affiliate approval. A feed that reads beautifully still earns nothing
 *     until `affiliateParam` (or `awinMerchantId`) holds a real tracking value.
 *     Sydney Sock Project has been live and untracked since 2026-08-11.
 *   - Whether the merchant should be trusted with a shopper at all. That is the
 *     Tokyocanvas question, and no histogram answers it.
 */
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/* Node can strip TypeScript types on import, but it will not guess a missing
 * file extension the way bundlers do, and lib/catalog-shared.ts imports
 * './data'. This hook adds the extension back for relative specifiers that
 * resolve to a real .ts file — which is what makes importing the real pipeline
 * possible at all, and therefore what keeps this script honest. */
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('.') && !/\.[a-z]+$/.test(spec)) {
      const url = new URL(spec + '.ts', ctx.parentURL)
      if (existsSync(url)) return next(spec + '.ts', ctx)
    }
    return next(spec, ctx)
  },
})

const LIB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib')
const { VENDORS, pendingVendors } = await import(path.join(LIB, 'data.ts'))
const { mapShopifyProducts } = await import(path.join(LIB, 'catalog-shared.ts'))
const { MODEL_SCAN_CATS, adultApparelHit } = await import(path.join(LIB, 'adult-apparel.ts'))

/* Mirrors PER_PAGE / MAX_PAGES / SCRAPE_UA in lib/catalog-source.ts. */
const PER_PAGE = 250
const MAX_PAGES = 5
const UA = 'Mozilla/5.0'

/* product_types that are rarely a fit. A HINT FOR THE EYE ONLY: the include
 * list is written from the histogram, not from this list, because one
 * merchant's "SETS" is a gift box and another's is a matching hair-clip pair. */
const SUSPECT = /\b(gift ?card|e-?gift|sample|subscription|wholesale|bundle|misc|other|free|shipping|donation|deposit)\b/i

async function fetchProducts(domain) {
  const all = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${domain}/products.json?limit=${PER_PAGE}&page=${page}`
    let res
    try {
      res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } })
    } catch (e) {
      if (page === 1) throw e
      console.log(`  page ${page} failed (${e.message}); keeping the ${all.length} rows already read`)
      return { all, capped: false }
    }
    if (!res.ok) {
      if (page === 1) throw new Error(`HTTP ${res.status}`)
      return { all, capped: false }
    }
    const batch = (await res.json())?.products ?? []
    all.push(...batch)
    if (batch.length < PER_PAGE) return { all, capped: false }
  }
  return { all, capped: true }
}

function histogram(rows, key) {
  const m = new Map()
  for (const r of rows) {
    const k = key(r)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

async function probe(cfg) {
  console.log('='.repeat(76))
  console.log(`${cfg.vendor}  ${cfg.domain}${cfg.pending ? '   [pending]' : ''}`)
  console.log('='.repeat(76))

  let raw, capped
  try {
    ;({ all: raw, capped } = await fetchProducts(cfg.domain))
  } catch (e) {
    console.log(`  NO FEED: ${e.message}`)
    console.log('  Either the merchant is not on Shopify (or has closed products.json),')
    console.log('  in which case they cannot go in VENDORS at all and need an ingest path')
    console.log('  of their own — see PARTNER_PROSPECTS in lib/partners.ts — or this')
    console.log('  machine simply could not reach them. A 403 on the CONNECT, a tunnel')
    console.log('  error or a timeout is the second case: re-run from a box with open')
    console.log('  egress before concluding anything about the store.\n')
    return
  }

  if (!raw.length) {
    console.log('  Feed answered but is EMPTY. Nothing to ingest.')
    console.log('  This is the Tokyo Tiger shape exactly, and note that the site would')
    console.log('  report ok:true for it. Before blaming the config, try the same URL')
    console.log('  from a browser: if a browser gets JSON and this does not, the store')
    console.log('  is filtering on User-Agent and SCRAPE_UA needs another look.\n')
    return
  }

  const mapped = mapShopifyProducts(cfg, raw)
  console.log(
    `  ${raw.length} products in the feed` +
      (capped ? `   *** HIT THE ${MAX_PAGES}-PAGE CAP, catalogue may be truncated ***` : '')
  )
  console.log(`  ${mapped.length} survive mapping (${raw.length - mapped.length} dropped: out of stock, or the kid-safety word filter)`)
  console.log()

  const types = histogram(raw, (p) => (p.product_type || '').trim())
  console.log(`  ${'product_type'.padEnd(34)} ${'n'.padStart(5)}  example`)
  console.log(`  ${'-'.repeat(34)} ${'-'.repeat(5)}  ${'-'.repeat(32)}`)
  for (const [t, n] of types) {
    const eg = raw.find((p) => (p.product_type || '').trim() === t)?.title ?? ''
    const mark = !t || SUSPECT.test(t) ? '  <- check' : ''
    console.log(`  ${(t || '(empty)').slice(0, 34).padEnd(34)} ${String(n).padStart(5)}  ${eg.slice(0, 32)}${mark}`)
  }
  if (types.some(([t]) => !t)) {
    console.log('  An EMPTY product_type cannot be reached by an include list. If those')
    console.log('  rows matter, the vendor needs forceCat or no include list at all.')
  }
  console.log()

  console.log('  Where they land on OUR shelves, via the site\'s own categorize():')
  console.log(`  ${'category'.padEnd(34)} ${'n'.padStart(5)}`)
  console.log(`  ${'-'.repeat(34)} ${'-'.repeat(5)}`)
  for (const [c, n] of histogram(mapped, (p) => p.cat)) {
    console.log(`  ${c.padEnd(34)} ${String(n).padStart(5)}${c === 'other' ? '  <- classifier had no rule for these' : ''}`)
  }
  console.log()

  /* The number this site gets wrong most often, broken out on purpose.
   *
   * The adult-model text filter runs on apparel and accessories only, and its
   * phrase list is tuned for suggestive cuts — which is also, word for word, the
   * vocabulary of a fairy-kei wardrobe. `pleated skirt`, `thigh high`, `high
   * waist`, `lace up`, `chiffon` and `satin` are all in it. On a decora vendor
   * this filter can quietly remove most of the reason we signed them.
   *
   * Read the phrases below before touching lib/adult-apparel.ts. Some of these
   * drops will be exactly right and some will be a pastel cardigan losing to the
   * word "satin", and only looking tells you which. */
  const scanCat = mapped.filter((p) => MODEL_SCAN_CATS.has(p.cat))
  const hits = scanCat.map((p) => [p, adultApparelHit(p.name)]).filter(([, h]) => h)
  console.log(`  Kid-safety, layer 2 (apparel & accessories only):`)
  console.log(`  ${scanCat.length} products in scanned categories, ${hits.length} would be DROPPED by the phrase filter.`)
  if (hits.length) {
    for (const [phrase, n] of histogram(hits, ([, h]) => h).slice(0, 12)) {
      const eg = hits.find(([, h]) => h === phrase)[0].name
      console.log(`    ${String(n).padStart(4)}  "${phrase}"${' '.repeat(Math.max(1, 18 - phrase.length))}e.g. ${eg.slice(0, 40)}`)
    }
    console.log('    A phrase you believe is a false positive belongs in KID_SAFE in')
    console.log('    lib/adult-apparel.ts, narrowly. Do not delete it from CUT_PHRASES.')
  }
  console.log()

  const keep = types.filter(([t]) => t && !SUSPECT.test(t)).map(([t]) => t)
  console.log('  Starting point for lib/data.ts, suspect types dropped. Read the')
  console.log('  histogram and edit it before pasting — this is a suggestion, not a verdict.')
  console.log(
    `  { vendor: ${JSON.stringify(cfg.vendor)}, domain: ${JSON.stringify(cfg.domain)}, prefix: ${JSON.stringify(cfg.prefix)}, affiliateParam: '', network: ${JSON.stringify(cfg.network ?? 'direct')}, commissionPct: ${cfg.commissionPct}, couponCode: '', couponPct: 0,`
  )
  console.log(`    include: [${keep.map((t) => JSON.stringify(t)).join(', ')}] },`)
  console.log()
  console.log('  Before the pending flag comes off: confirm the affiliate approval landed')
  console.log('  and put the real tracking value in affiliateParam. A vendor shipped')
  console.log('  without one is free traffic for the merchant, and nothing will say so.')
  console.log()
}

const args = process.argv.slice(2)
const todo = args.length
  ? args.map((a) => {
      const domain = (a.startsWith('http') ? a : 'https://' + a).replace(/\/+$/, '')
      const host = domain.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
      return (
        VENDORS.find((v) => v.domain.replace(/^https?:\/\/(www\.)?/, '') === host) ?? {
          vendor: host,
          domain,
          prefix: host.split('.')[0].slice(0, 5),
          affiliateParam: '',
          commissionPct: 0,
          couponCode: '',
          couponPct: 0,
        }
      )
    })
  : pendingVendors()

if (!todo.length) {
  console.log('No pending vendors. Pass a domain to probe one directly.')
}
for (const cfg of todo) await probe(cfg)
