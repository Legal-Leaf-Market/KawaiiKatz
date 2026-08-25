/**
 * TEMPORARY. Delete once the dump has been read.
 *
 * Second round, and a different job from the first. The first probe answered
 * "should this vendor ship" with histograms. This one exports the feed itself,
 * so the classifier can be worked on OFFLINE against real rows instead of one
 * build round-trip per idea — which is the only way to check a change against
 * the other 4,369 products at the same time.
 *
 * It prints the exact inputs `categorize()` sees. mapShopifyProducts builds its
 * haystack as `title + product_type + tags + blurb`, with the blurb stripped of
 * HTML and truncated at 140 — so those four fields, reproduced faithfully, are
 * enough to rebuild the haystack byte-for-byte on the other side.
 */
import { VENDORS } from '@/lib/data'
import { mapShopifyProducts } from '@/lib/catalog-shared'

export const dynamic = 'force-static'

const TARGET = 'MamaRaya'
const UA = 'Mozilla/5.0'
const log = (s: string) => console.log(`[probe] ${s}`)

/** Mirrors the blurb handling in mapShopifyProducts exactly. */
function blurbOf(body: unknown): string {
  let b = String(body || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
  if (b.length > 140) b = b.slice(0, 137) + '...'
  return b
}

async function run(): Promise<void> {
  const cfg = VENDORS.find((v) => v.vendor === TARGET)
  if (!cfg) return log(`no VENDORS entry named ${TARGET}`)

  const res = await fetch(`${cfg.domain}/products.json?limit=250&page=1`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
    cache: 'no-store',
  })
  if (!res.ok) return log(`HTTP ${res.status}`)
  const raw = ((await res.json()) as { products?: Record<string, unknown>[] })?.products ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = mapShopifyProducts(cfg, raw as any)
  const catById = new Map(mapped.map((p) => [p.id, p.cat]))

  log(`DUMP ${raw.length} rows`)
  for (const p of raw) {
    const id = `${cfg.prefix}-${p.handle}`
    const tags = Array.isArray(p.tags) ? (p.tags as string[]).join(' ') : String(p.tags || '')
    // Pipe-separated so a build log's line handling cannot corrupt JSON quoting.
    // Newlines are already collapsed by blurbOf; pipes are stripped defensively.
    const f = (s: string) => s.replace(/[|\n\r]+/g, ' ').trim()
    log(`ROW|${catById.get(id) ?? '-'}|${f(String(p.product_type ?? ''))}|${f(String(p.title ?? ''))}|${f(tags).slice(0, 220)}|${f(blurbOf(p.body_html)).slice(0, 200)}`)
  }
  log('END DUMP')
}

export async function GET(): Promise<Response> {
  try { await run() } catch (e) { log(`THREW: ${(e as Error).message}`) }
  return Response.json({ ok: true })
}
