'use client'
import useSWR from 'swr'
import { useMemo } from 'react'
import { SEED_PRODUCTS, type Product } from '@/lib/data'

type CatalogResponse = { products: Product[]; count: number }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function hasImage(p: Product): boolean {
  return !!String(p.image || '').trim()
}

/**
 * Loads the full live vendor catalog from /api/catalog.
 * While the request is in flight, the seed products are shown as a preview.
 * Once live data arrives, the entire catalog (hundreds of products) is used,
 * with image-having products sorted first so the grid never leads with emoji.
 */
export function useLiveCatalog(): { products: Product[]; loading: boolean; live: boolean } {
  const { data, isLoading } = useSWR<CatalogResponse>('/api/catalog', fetcher, {
    dedupingInterval: 21_600_000,
    revalidateOnFocus: false,
  })

  const products = useMemo(() => {
    const live = data?.products ?? []
    // Fall back to seed preview until live data is ready
    if (!live.length) return SEED_PRODUCTS

    // Keep only sellable items, then order image-first (stable within that)
    const cleaned = live.filter((p) => p && p.id && p.name && p.price > 0)
    const withImg = cleaned.filter(hasImage)
    const without = cleaned.filter((p) => !hasImage(p))
    return [...withImg, ...without]
  }, [data])

  return {
    products,
    loading: isLoading && !data,
    live: !!data?.products?.length,
  }
}
