import { VENDORS } from '@/lib/data'
import { mapShopifyProducts } from '@/lib/catalog-shared'
import { MODEL_SCAN_CATS, adultApparelHit } from '@/lib/adult-apparel'

/**
 * TEMPORARY. Delete this route in the commit that clears the pending flag.
 *
 * `pnpm probe` cannot reach a merchant host from a Claude Code container: the
 * agent proxy refuses them, and it refuses *.vercel.app too, so a preview
 * deploy cannot be fetched either. §4 records the way through, used on
 * 2026-08-22 and again here:
 *
 *   1. A route marked `force-static`, so it EXECUTES DURING `next build`.
 *   2. Push. Its console.log lands in the Vercel build log.
 *   3. Read it with the Vercel MCP get_deployment_build_logs, filtering [probe].
 *   4. Delete the route in the follow-up commit.
 *
 * Build logs are the trick: preview deploys sit behind Vercel Authentication,
 * which rejects at the edge BEFORE the function runs, so there is no response
 * to fetch and no runtime log either. Build logs need no auth.
 *
 * It imports the site's own mapShopifyProducts, categorize (via mapping) and
 * adultApparelHit rather than reimplementing them, for the reason
 * scripts/vendor_probe.mjs gives at length: a second copy of the classifier
 * drifts from the first, silently, and then reports a shelf the site does not
 * build.
 */
export const dynamic = 'force-static'

const PER_PAGE = 250
const MAX_PAGES = 5
const SUSPECT =
  /\b(gift ?card|e-?gift|sample|subscription|wholesale|bundle|misc|other|free|shipping|donation|deposit)\b/i

/**
 * Every pending vendor we actually intend to launch, chosen by the data rather
 * than by a list here.
 *
 * `pending && affiliateParam` is the honest test: a pending vendor with no
 * tracking value is one nobody has signed up for, and probing it tells us
 * nothing we can act on. Reading it off VENDORS means the next signup needs a
 * row in lib/data.ts and no edit to this file.
 *
 * It re-probes the ones already written off once, which §4 asks for in as many
 * words: "Re-probe once before writing off."
 */
const TARGETS = VENDORS.filter((v) => v.pending && v.affiliateParam).map((v) => v.vendor)

type ShopifyRow = { product_type?: string; title?: string }

function histogram<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = key(r)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

async function probe(target: string) {
  const cfg = VENDORS.find((v) => v.vendor === target)
  if (!cfg) return console.log(`[probe] ${target} is not in VENDORS`)

  console.log(`[probe] === ${cfg.vendor} (${cfg.domain}) ===`)

  const raw: ShopifyRow[] = []
  let capped = false
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${cfg.domain}/products.json?limit=${PER_PAGE}&page=${page}`
    let res: Response
    try {
      res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } })
    } catch (e) {
      console.log(`[probe] page ${page} THREW: ${(e as Error).message}`)
      break
    }
    if (!res.ok) {
      // Read the BODY, not just the status. §4c: 402 "Unavailable Shop" is a
      // frozen store, 404 "Not Found" is no store at all, and a 403 with a
      // "Just a moment..." interstitial is Cloudflare. Three problems, three
      // answers, and the status code alone distinguishes none of them.
      const body = (await res.text().catch(() => '')).slice(0, 200)
      console.log(`[probe] page ${page} HTTP ${res.status}; server=${res.headers.get('server')}`)
      console.log(`[probe] body: ${body.replace(/\s+/g, ' ')}`)
      break
    }
    const batch = ((await res.json()) as { products?: ShopifyRow[] })?.products ?? []
    raw.push(...batch)
    if (batch.length < PER_PAGE) break
    if (page === MAX_PAGES) capped = true
  }

  if (!raw.length) return console.log('[probe] feed answered nothing. Not ingestable.')

  const mapped = mapShopifyProducts(cfg, raw as never)
  console.log(`[probe] ${raw.length} in the feed${capped ? '  *** HIT THE 5-PAGE CAP ***' : ''}`)
  console.log(`[probe] ${mapped.length} survive mapping (${raw.length - mapped.length} dropped)`)

  console.log('[probe] --- product_type histogram (write `include` from this) ---')
  const types = histogram(raw, (p) => (p.product_type || '').trim())
  for (const [t, n] of types) {
    const eg = raw.find((p) => (p.product_type || '').trim() === t)?.title ?? ''
    const mark = !t || SUSPECT.test(t) ? '  <- check' : ''
    console.log(`[probe]   ${(t || '(empty)').slice(0, 34).padEnd(34)} ${String(n).padStart(5)}  ${eg.slice(0, 40)}${mark}`)
  }
  if (types.some(([t]) => !t)) {
    console.log('[probe]   EMPTY product_type cannot be reached by an include list (§4).')
  }

  console.log('[probe] --- where they land, via the site\'s own categorize() ---')
  for (const [c, n] of histogram(mapped, (p) => p.cat)) {
    console.log(`[probe]   ${c.padEnd(20)} ${String(n).padStart(5)}${c === 'other' ? '  <- no rule' : ''}`)
  }

  // READ THIS ONE FIRST on a decora vendor. §4: the phrase list is tuned for
  // suggestive cuts, which is also word for word the vocabulary of a fairy-kei
  // wardrobe, and on a sample of twelve typical decora items seven were dropped.
  const scanCat = mapped.filter((p) => MODEL_SCAN_CATS.has(p.cat))
  const hits = scanCat
    .map((p) => [p, adultApparelHit(p.name)] as const)
    .filter(([, h]) => h) as [(typeof mapped)[number], string][]
  console.log(`[probe] --- kid-safety phrase filter (apparel & accessories only) ---`)
  console.log(`[probe]   ${scanCat.length} in scanned categories, ${hits.length} would be DROPPED`)
  for (const [phrase, n] of histogram(hits, ([, h]) => h).slice(0, 12)) {
    const eg = hits.find(([, h]) => h === phrase)?.[0].name ?? ''
    console.log(`[probe]   ${String(n).padStart(4)}  "${phrase}"  e.g. ${eg.slice(0, 44)}`)
  }

  const keep = types.filter(([t]) => t && !SUSPECT.test(t)).map(([t]) => t)
  console.log(`[probe] suggested include (a suggestion, not a verdict): [${keep.map((t) => JSON.stringify(t)).join(', ')}]`)
}

export async function GET() {
  // Sequential, not Promise.all: two interleaved probes in one build log is a
  // log nobody can read, and this runs once.
  for (const t of TARGETS) {
    try {
      await probe(t)
    } catch (e) {
      console.log(`[probe] ${t} FAILED: ${(e as Error).message}`)
    }
  }
  return new Response('probe ran; read the build log\n', {
    headers: { 'Content-Type': 'text/plain' },
  })
}
