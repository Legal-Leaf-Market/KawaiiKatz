import { NextResponse } from 'next/server'
import { VENDORS, type Product } from '@/lib/data'
import { mapShopifyProducts } from '@/lib/catalog-shared'
import { MODEL_SCAN_CATS, isAdultApparelByText } from '@/lib/adult-apparel'
import { scanForBodyModels } from '@/lib/person-scan'

export const revalidate = 21600 // 6 hours
export const maxDuration = 60 // allow time for the image scan on cold builds

const MAX_PAGES = 5 // up to 250 * 5 = 1250 products per vendor
const PER_PAGE = 250

async function fetchVendorCatalog(vendor: typeof VENDORS[number]): Promise<Product[]> {
  const all: Product[] = []
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${vendor.domain}/products.json?limit=${PER_PAGE}&page=${page}`
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          // Some Shopify stores reject requests with no UA
          'User-Agent': 'Mozilla/5.0 (compatible; KawaiiKatzBot/1.0; +https://kawaiikatz.com)',
        },
        next: { revalidate: 21600 },
      })
      if (!res.ok) break
      const data = (await res.json()) as { products?: unknown[] }
      const raw = (data.products ?? []) as Parameters<typeof mapShopifyProducts>[1]
      if (!raw.length) break
      all.push(...mapShopifyProducts(vendor, raw))
      if (raw.length < PER_PAGE) break // last page
    }
  } catch {
    // silently skip a failing vendor; others still load
  }
  return all
}

export async function GET() {
  const results = await Promise.allSettled(VENDORS.map((v) => fetchVendorCatalog(v)))

  const products: Product[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') products.push(...r.value)
  }

  // De-dupe by id, prefer entries that have an image
  const byId = new Map<string, Product>()
  for (const p of products) {
    const existing = byId.get(p.id)
    if (!existing || (!existing.image && p.image)) byId.set(p.id, p)
  }

  let list = [...byId.values()]

  // --- Adult-model exclusion (apparel & accessories only) ---
  // Layer 1: instant text filter over suggestive-cut / adult-model wording.
  list = list.filter((p) => !isAdultApparelByText(p.name, p.cat))

  // Layer 2: coco-ssd image scan drops photos featuring a full-body (adult) model.
  // Scoped to apparel/accessories with an image; budgeted so a cold build can't
  // hang. Unscanned items stay (the text filter is the backstop) and get caught
  // on later loads as the in-process verdict cache warms.
  const scanTargets = list.filter((p) => MODEL_SCAN_CATS.has(p.cat) && p.image)
  try {
    const flagged = await scanForBodyModels(
      scanTargets.map((p) => p.image),
      { concurrency: 4, budgetMs: 35000 }
    )
    if (flagged.size) list = list.filter((p) => !(MODEL_SCAN_CATS.has(p.cat) && flagged.has(p.image)))
  } catch {
    // scan unavailable — keep the text-filtered catalog
  }

  return NextResponse.json(
    { products: list, count: list.length },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
      },
    }
  )
}
