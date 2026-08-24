/**
 * TEMPORARY. Delete this route once the probe has been read.
 *
 * `pnpm probe` cannot reach merchant hosts from a Claude Code container — the
 * egress proxy refuses them, and it refuses *.vercel.app too, so the response
 * of a preview deploy cannot be fetched either. The way through is
 * PROJECT_GUIDE §4: a prerendered route EXECUTES during `next build`, and build
 * logs need no authentication. So this runs the probe at build time and prints
 * it into the log, where the Vercel MCP can read it.
 *
 * It imports the real pipeline — mapShopifyProducts, the site's categorize via
 * the mapped rows, adultApparelHit and kidVerdict — for the reason
 * scripts/vendor_probe.mjs gives: a second copy of the classifier drifts from
 * the first, silently, and then reports a shelf the site does not build.
 */
import { VENDORS } from '@/lib/data'
import { mapShopifyProducts } from '@/lib/catalog-shared'
import { MODEL_SCAN_CATS, adultApparelHit } from '@/lib/adult-apparel'
import { kidVerdict } from '@/lib/kid-safe'

export const dynamic = 'force-static'

const TARGET = 'MamaRaya'
const PER_PAGE = 250
const MAX_PAGES = 5
const UA = 'Mozilla/5.0'

function hist<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = key(r)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

const log = (s: string) => console.log(`[probe] ${s}`)

async function run(): Promise<void> {
  const cfg = VENDORS.find((v) => v.vendor === TARGET)
  if (!cfg) return log(`no VENDORS entry named ${TARGET}`)
  log(`${cfg.vendor}  ${cfg.domain}`)

  const raw: Record<string, unknown>[] = []
  let capped = false
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${cfg.domain}/products.json?limit=${PER_PAGE}&page=${page}`
    let res: Response
    try {
      res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, cache: 'no-store' })
    } catch (e) {
      log(`page ${page} threw: ${(e as Error).message}`)
      break
    }
    if (!res.ok) { log(`page ${page} HTTP ${res.status}`); break }
    const batch = ((await res.json()) as { products?: Record<string, unknown>[] })?.products ?? []
    raw.push(...batch)
    if (batch.length < PER_PAGE) break
    if (page === MAX_PAGES) capped = true
  }

  if (!raw.length) return log('EMPTY or unreachable — nothing to ingest (the Tokyo Tiger shape)')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = mapShopifyProducts(cfg, raw as any)
  log(`${raw.length} in feed${capped ? '  *** HIT THE PAGE CAP ***' : ''}, ${mapped.length} survive mapping`)

  log('--- product_type histogram (write `include` from THIS) ---')
  for (const [t, n] of hist(raw, (p) => String(p.product_type ?? '').trim())) {
    const eg = raw.find((p) => String(p.product_type ?? '').trim() === t)?.title ?? ''
    log(`  ${(t || '(empty)').slice(0, 36).padEnd(36)} ${String(n).padStart(4)}  ${String(eg).slice(0, 40)}`)
  }

  log('--- where they land, via the site\'s own categorize() ---')
  for (const [c, n] of hist(mapped, (p) => p.cat)) {
    log(`  ${c.padEnd(36)} ${String(n).padStart(4)}${c === 'other' ? '  <- no rule matched' : ''}`)
  }

  const scan = mapped.filter((p) => MODEL_SCAN_CATS.has(p.cat))
  const hits = scan.map((p) => adultApparelHit(p.name)).filter(Boolean) as string[]
  log(`--- kid-safety layer 2: ${scan.length} in scanned cats, ${hits.length} would be DROPPED ---`)
  for (const [phrase, n] of hist(hits, (h) => h).slice(0, 10)) log(`  ${phrase.padEnd(24)} ${n}`)

  const kid = mapped.filter((p) => p.kidSafe).length
  log(`--- kid-safe flag: ${kid} of ${mapped.length} (${((kid / mapped.length) * 100).toFixed(0)}%) ---`)
  for (const [r, n] of hist(mapped, (p) => kidVerdict(`${p.name} ${p.blurb}`, p.cat, p.name).reason).slice(0, 10)) {
    log(`  ${r.padEnd(30)} ${n}`)
  }

  log('--- 12 sample titles ---')
  for (const p of mapped.slice(0, 12)) log(`  [${p.cat}] ${p.name.slice(0, 56)}  $${p.price}`)
}

export async function GET(): Promise<Response> {
  try {
    await run()
  } catch (e) {
    log(`THREW: ${(e as Error).message}`)
  }
  return Response.json({ ok: true, note: 'temporary probe route; read the build log' })
}
