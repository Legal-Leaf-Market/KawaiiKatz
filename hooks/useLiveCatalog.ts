'use client'
import useSWR from 'swr'
import { useMemo } from 'react'
import { SEED_PRODUCTS, showcaseVendors, type Product } from '@/lib/data'

type CatalogResponse = { products: Product[]; count: number }

/** Vendors that live on their own showcase page instead of the main grid. */
const SHOWCASE_VENDOR_NAMES = new Set(showcaseVendors().map((v) => v.vendor))

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function hasImage(p: Product): boolean {
  return !!String(p.image || '').trim()
}

/** Shared SWR config, so every caller hits one cached request for the catalog. */
const SWR_OPTS = { dedupingInterval: 21_600_000, revalidateOnFocus: false } as const

function clean(live: Product[]): Product[] {
  // Keep only sellable items, then order image-first (stable within that)
  const cleaned = live.filter((p) => p && p.id && p.name && p.price > 0)
  const withImg = cleaned.filter(hasImage)
  const without = cleaned.filter((p) => !hasImage(p))
  return [...withImg, ...without]
}

/**
 * Loads the full live vendor catalog from /api/catalog.
 * While the request is in flight, the seed products are shown as a preview.
 * Once live data arrives, the entire catalog (hundreds of products) is used,
 * with image-having products sorted first so the grid never leads with emoji.
 *
 * Showcase vendors are held back from this list. They have their own page, and
 * a few dozen premium display frames scattered through a grid of plushies is
 * exactly how a partner's catalogue gets lost.
 */
type CatalogResult = {
  /** What this page's grid should render. */
  products: Product[]
  /**
   * Every product from every vendor, showcase vendors included. Cart and
   * wishlist must resolve ids against THIS, not the grid list — otherwise an
   * item added on a showcase page cannot be found again from the home page and
   * silently disappears from the cart.
   */
  allProducts: Product[]
  loading: boolean
  live: boolean
}

export function useLiveCatalog(): CatalogResult {
  const { data, isLoading } = useSWR<CatalogResponse>('/api/catalog', fetcher, SWR_OPTS)

  const allProducts = useMemo(() => {
    const live = data?.products ?? []
    return live.length ? clean(live) : SEED_PRODUCTS
  }, [data])

  const products = useMemo(
    () => allProducts.filter((p) => !SHOWCASE_VENDOR_NAMES.has(p.vendor)),
    [allProducts]
  )

  return { products, allProducts, loading: isLoading && !data, live: !!data?.products?.length }
}

/**
 * One showcase vendor's products, from the same cached request as the main grid
 * — SWR dedupes on the key, so the showcase page costs no extra fetch.
 */
export function useVendorCatalog(vendor: string): CatalogResult {
  const { data, isLoading } = useSWR<CatalogResponse>('/api/catalog', fetcher, SWR_OPTS)

  const allProducts = useMemo(() => clean(data?.products ?? []), [data])
  const products = useMemo(
    () => allProducts.filter((p) => p.vendor === vendor),
    [allProducts, vendor]
  )

  return { products, allProducts, loading: isLoading && !data, live: !!data?.products?.length }
}
