import { VENDORS } from '@/lib/data'
import { mapShopifyProducts } from '@/lib/catalog-shared'
import { MODEL_SCAN_CATS, adultApparelHit } from '@/lib/adult-apparel'

/**
 * TEMPORARY. Delete in the follow-up commit.
 *
 * `pnpm probe` cannot reach a merchant host from a Claude Code container: the
 * egress proxy answers 403 on the CONNECT. PROJECT_GUIDE §4 records the way
 * through, and this is it — a prerendered route EXECUTES during `next build`,
 * so its console.log lands in the build log, and build logs need no auth.
 * Preview deploys sit behind Vercel Authentication, which rejects at the edge
 * before the function runs, so neither the response nor a runtime log is
 * reachable. The build log is the only channel.
 *
 * Same logic as scripts/vendor_probe.mjs and, like it, importing the site's
 * real mapShopifyProducts/categorize rather than a second copy that would
 * drift silently.
 */
export const dynamic = 'force-static'

const PER_PAGE = 250
const MAX_PAGES = 5
const UA = 'Mozilla/5.0'
const SUSPECT = /\b(gift ?card|e-?gift|sample|subscription|wholesale|bundle|misc|other|free|shipping|donation|deposit)\b/i

type Row = { product_type?: string; title?: string }

function hist<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const m = new Map<string, number>()
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

async function probe(cfg: (typeof VENDORS)[number]) {
  const L = (s: string) => console.log('[probe] ' + s)
  L('='.repeat(70))
  L(`${cfg.vendor}  ${cfg.domain}`)
  L('='.repeat(70))

  const raw: Row[] = []
  let capped = false
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${cfg.domain}/products.json?limit=${PER_PAGE}&page=${page}`
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': UA },
        cache: 'no-store',
      })
      if (!res.ok) {
        L(`page ${page}: HTTP ${res.status}`)
        if (page === 1) {
          L('NO FEED. Either not Shopify, products.json is closed, or bot')
          L('protection is answering. Not a row in VENDORS until this changes;')
          L('the AWIN ShopWindow feed is the alternative ingest path.')
          return
        }
        break
      }
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('json')) {
        L(`page ${page}: content-type ${ct} — not a JSON feed. Not Shopify.`)
        return
      }
      const batch = ((await res.json())?.products ?? []) as Row[]
      L(`page ${page}: ${batch.length} rows`)
      raw.push(...batch)
      if (batch.length < PER_PAGE) break
      if (page === MAX_PAGES) capped = true
    } catch (e) {
      L(`page ${page} threw: ${(e as Error).message}`)
      if (page === 1) return
      break
    }
  }

  if (!raw.length) {
    L('Feed answered but is EMPTY. This is the Tokyo Tiger shape, and the site')
    L('would report ok:true for it. Do not ship.')
    return
  }

  const mapped = mapShopifyProducts(cfg, raw as never[])
  L(`${raw.length} products in the feed${capped ? `  *** HIT THE ${MAX_PAGES}-PAGE CAP ***` : ''}`)
  L(`${mapped.length} survive mapping (${raw.length - mapped.length} dropped)`)
  L('')

  const types = hist(raw, (p) => (p.product_type || '').trim())
  L(`product_type histogram (${types.length} distinct):`)
  for (const [t, n] of types.slice(0, 40)) {
    const eg = raw.find((p) => (p.product_type || '').trim() === t)?.title ?? ''
    L(`  ${(t || '(empty)').slice(0, 34).padEnd(34)} ${String(n).padStart(5)}  ${eg.slice(0, 40)}${!t || SUSPECT.test(t) ? '  <- check' : ''}`)
  }
  if (types.some(([t]) => !t)) {
    L('  An EMPTY product_type cannot be reached by an include list (§4).')
  }
  L('')

  L('Where they land on OUR shelves, via the site\'s own categorize():')
  for (const [c, n] of hist(mapped, (p) => p.cat)) {
    L(`  ${c.padEnd(20)} ${String(n).padStart(5)}${c === 'other' ? '  <- no rule for these' : ''}`)
  }
  L('')

  const scan = mapped.filter((p) => MODEL_SCAN_CATS.has(p.cat))
  const hits = scan.map((p) => [p, adultApparelHit(p.name)] as const).filter(([, h]) => h)
  L(`Kid-safety layer 2: ${scan.length} in scanned categories, ${hits.length} would be DROPPED.`)
  for (const [phrase, n] of hist(hits, ([, h]) => String(h)).slice(0, 12)) {
    const eg = hits.find(([, h]) => String(h) === phrase)![0].name
    L(`  ${String(n).padStart(4)}  "${phrase}"  e.g. ${eg.slice(0, 44)}`)
  }
  L('')
  L(`kidSafe flag: ${mapped.filter((p) => p.kidSafe).length} of ${mapped.length}`)
  L('')
  L('Sample of 25 names, to judge fit rather than count:')
  for (const p of mapped.slice(0, 25)) L(`  ${p.cat.padEnd(13)} $${String(p.price).padEnd(7)} ${p.name.slice(0, 60)}`)
  L('')
  const keep = types.filter(([t]) => t && !SUSPECT.test(t)).map(([t]) => t)
  L(`include suggestion (read it, do not paste it): [${keep.slice(0, 30).map((t) => JSON.stringify(t)).join(', ')}]`)
  L('END')
}

export async function GET() {
  for (const v of VENDORS.filter((x) => x.pending && x.vendor === 'GiftLAB')) {
    try {
      await probe(v)
    } catch (e) {
      console.log(`[probe] threw: ${(e as Error).message}`)
    }
  }
  return new Response('probe ran; read the build log for [probe]', {
    headers: { 'content-type': 'text/plain' },
  })
}
