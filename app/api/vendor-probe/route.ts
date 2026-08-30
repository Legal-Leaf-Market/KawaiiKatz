import { VENDORS } from '@/lib/data'
import { mapShopifyProducts } from '@/lib/catalog-shared'
import { MODEL_SCAN_CATS, adultApparelHit } from '@/lib/adult-apparel'

/**
 * TEMPORARY. Delete in the follow-up commit, as the last two copies of this
 * were.
 *
 * `pnpm probe` cannot reach a merchant host from a Claude Code container: the
 * egress proxy answers 403 on the CONNECT. PROJECT_GUIDE §4 records the way
 * through and this is it. A prerendered route EXECUTES during `next build`, so
 * its console.log lands in the build log, and build logs need no auth. Preview
 * deploys sit behind Vercel Authentication, which rejects at the edge before
 * the function runs, so neither the response nor a runtime log is reachable.
 *
 * Imports the site's real mapShopifyProducts and categorize rather than a
 * second copy, which would drift silently.
 */
export const dynamic = 'force-static'

const TARGETS = ['CozyKawaii', 'BerryKawaii', 'Tabletop Item Shop']
const PER_PAGE = 250
const MAX_PAGES = 5
const UA = 'Mozilla/5.0'
const SUSPECT = /\b(gift ?card|e-?gift|sample|subscription|wholesale|bundle|misc|other|free|shipping|donation|deposit)\b/i

type Row = { product_type?: string; title?: string }
const L = (s: string) => console.log('[probe] ' + s)

function hist<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const m = new Map<string, number>()
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

async function probe(cfg: (typeof VENDORS)[number]) {
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
        L(`page ${page}: HTTP ${res.status} (server=${res.headers.get('server') || '?'})`)
        if (page === 1) {
          const body = (await res.text()).slice(0, 140).replace(/\s+/g, ' ')
          L(`  body: ${body}`)
          L('NO FEED. Not Shopify, products.json closed, or bot protection.')
          return
        }
        break
      }
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('json')) {
        L(`page ${page}: content-type ${ct}. Not a JSON feed, so not Shopify.`)
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
    L('Feed answered but is EMPTY. The Tokyo Tiger shape; the site would report')
    L('ok:true for this. Do not ship.')
    return
  }

  const mapped = mapShopifyProducts(cfg, raw as never[])
  L(`${raw.length} in the feed${capped ? `  *** HIT THE ${MAX_PAGES}-PAGE CAP ***` : ''}`)
  L(`${mapped.length} survive mapping (${raw.length - mapped.length} dropped)`)
  L('')

  const types = hist(raw, (p) => (p.product_type || '').trim())
  L(`product_type histogram (${types.length} distinct):`)
  for (const [t, n] of types.slice(0, 40)) {
    const eg = raw.find((p) => (p.product_type || '').trim() === t)?.title ?? ''
    L(`  ${(t || '(empty)').slice(0, 30).padEnd(30)} ${String(n).padStart(4)}  ${eg.slice(0, 38)}${!t || SUSPECT.test(t) ? '  <- check' : ''}`)
  }
  if (types.some(([t]) => !t)) L('  An EMPTY product_type cannot be reached by an include list (§4).')
  L('')

  L('Where they land on OUR shelves, via the site\'s own categorize():')
  for (const [c, n] of hist(mapped, (p) => p.cat)) {
    L(`  ${c.padEnd(18)} ${String(n).padStart(4)}${c === 'other' ? '  <- no rule for these' : ''}`)
  }
  L('')

  const scan = mapped.filter((p) => MODEL_SCAN_CATS.has(p.cat))
  const hits = scan.map((p) => [p, adultApparelHit(p.name)] as const).filter(([, h]) => h)
  L(`Kid-safety layer 2: ${scan.length} in scanned categories, ${hits.length} would be DROPPED.`)
  for (const [phrase, n] of hist(hits, ([, h]) => String(h)).slice(0, 10)) {
    const eg = hits.find(([, h]) => String(h) === phrase)![0].name
    L(`  ${String(n).padStart(3)}  "${phrase}"  e.g. ${eg.slice(0, 42)}`)
  }
  L(`kidSafe flag: ${mapped.filter((p) => p.kidSafe).length} of ${mapped.length}`)
  L('')
  L('30 names and prices, to judge fit rather than count:')
  for (const p of mapped.slice(0, 30)) {
    L(`  ${p.cat.padEnd(12)} $${String(p.price).padEnd(7)} ${p.name.slice(0, 56)}`)
  }
  L('')
  const keep = types.filter(([t]) => t && !SUSPECT.test(t)).map(([t]) => t)
  L(`include suggestion (read it, do not paste it): [${keep.slice(0, 30).map((t) => JSON.stringify(t)).join(', ')}]`)
  L('END')
}

export async function GET() {
  for (const v of VENDORS.filter((x) => TARGETS.includes(x.vendor))) {
    try {
      await probe(v)
    } catch (e) {
      L(`threw: ${(e as Error).message}`)
    }
  }
  return new Response('probe ran; read the build log for [probe]', {
    headers: { 'content-type': 'text/plain' },
  })
}
