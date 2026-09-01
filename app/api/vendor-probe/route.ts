import { NextResponse } from 'next/server'

import { VENDORS } from '@/lib/data'
import { findLdProduct, mapLdProducts } from '@/lib/catalog-shared'

/**
 * TEMPORARY, again, and for the same reason as last time: a feed has to be
 * READ before a pending flag comes off, and this container cannot reach a
 * merchant host. A prerendered route executes during `next build` on Vercel's
 * builder, which can, and `force-static` writes the answer to a real file on
 * the production domain.
 *
 * WHY IT IS BACK AFTER BEING RETIRED. The last one was retired honestly: the
 * question it existed for was answered and /api/catalog?debug covered what
 * remained. This is a new question about two different merchants and a door
 * that did not exist then. The alternative was clearing `pending` on two
 * vendors nobody has read and letting the first build ship them, which is
 * exactly the shortcut the katana argues against: contentSafe did not catch a
 * 100cm replica sword, reading the feed did.
 *
 * It reads a small sample rather than the whole catalogue. The question here
 * is "does this door work and what comes through it", and forty pages answers
 * that as well as four hundred at a tenth of the build cost.
 */
export const dynamic = 'force-static'

const UA = 'Mozilla/5.0 (compatible; KawaiiKatzProbe/1.0)'
const TARGETS = ['Anime Backpacks', 'Anime Kimono']
const SAMPLE = 40

export async function GET() {
  const results = []
  for (const name of TARGETS) {
    const cfg = VENDORS.find((v) => v.vendor === name)
    if (!cfg) { results.push({ vendor: name, error: 'NOT_IN_VENDORS' }); continue }
    const out: Record<string, unknown> = { vendor: name, domain: cfg.domain }
    try {
      const res = await fetch(`${cfg.domain}/sitemap.xml`, { headers: { 'User-Agent': UA }, cache: 'no-store' })
      out.sitemapStatus = res.status
      if (!res.ok) { results.push(out); continue }
      const xml = await res.text()
      const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])
      const urls = [...new Set(locs.filter((u) => /\/product\//.test(u)))]
      out.totalLocs = locs.length
      out.productUrls = urls.length

      const rows: { url: string; ld: NonNullable<ReturnType<typeof findLdProduct>> }[] = []
      let noLd = 0
      for (const url of urls.slice(0, SAMPLE)) {
        try {
          const r = await fetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' })
          if (!r.ok) continue
          const ld = findLdProduct(await r.text())
          if (ld) rows.push({ url, ld }); else noLd++
        } catch { /* ignore */ }
      }
      out.sampled = Math.min(SAMPLE, urls.length)
      out.withJsonLd = rows.length
      out.withoutJsonLd = noLd

      const mapped = mapLdProducts(cfg, rows)
      out.mapped = mapped.length
      out.droppedByPipeline = rows.length - mapped.length
      out.cats = [...mapped.reduce((m, p) => m.set(p.cat, (m.get(p.cat) ?? 0) + 1), new Map<string, number>())]
      out.kidSafeFalse = mapped.filter((p) => p.kidSafe === false).length
      const prices = mapped.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b)
      out.priceBand = prices.length ? { min: prices[0], median: prices[prices.length >> 1], max: prices[prices.length - 1] } : null
      out.sample = mapped.slice(0, 12).map((p) => ({ n: p.name.slice(0, 80), p: p.price, cat: p.cat }))
    } catch (e) {
      out.error = (e as Error).message
    }
    results.push(out)
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString(), results })
}
