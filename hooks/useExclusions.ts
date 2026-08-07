'use client'
import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import type { Product } from '@/lib/data'

// No PIN here by design. Writes are authorized by the httpOnly cookie that
// /api/ada-login sets, which the browser attaches to these same-origin requests
// automatically. A constant here would ship the secret to every visitor.

export type ExcludedItem = {
  productId: string
  name: string | null
  image: string | null
  price: number | null
  vendor: string | null
  url: string | null
  excludedAt: string
}

type ExclusionsResponse = { ids: string[]; items: ExcludedItem[] }

const fetcher = (url: string): Promise<ExclusionsResponse> => fetch(url).then((r) => r.json())

/**
 * Loads the global store-exclusion list and exposes admin mutators. The list is
 * uncached and revalidates on focus + interval, so an exclusion made by the
 * curator propagates to every visitor's storefront quickly. Writes update the
 * server and optimistically refresh the local cache for an instant admin view.
 */
export function useExclusions() {
  const { data, mutate } = useSWR<ExclusionsResponse>('/api/exclusions', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30_000,
    fallbackData: { ids: [], items: [] },
  })

  const excludedIds = useMemo(() => new Set(data?.ids ?? []), [data])
  const excludedItems = data?.items ?? []

  const exclude = useCallback(
    async (p: Product) => {
      // Optimistic: add id immediately so the admin UI updates on click.
      const optimistic: ExclusionsResponse = {
        ids: [...new Set([...(data?.ids ?? []), p.id])],
        items: [
          {
            productId: p.id,
            name: p.name,
            image: p.image,
            price: p.price,
            vendor: p.vendor,
            url: p.url || p.domain,
            excludedAt: new Date().toISOString(),
          },
          ...(data?.items ?? []).filter((it) => it.productId !== p.id),
        ],
      }
      await mutate(
        async () => {
          await fetch('/api/exclusions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product: { id: p.id, name: p.name, image: p.image, price: p.price, vendor: p.vendor, url: p.url || p.domain },
            }),
          })
          return fetcher('/api/exclusions')
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: true }
      )
    },
    [data, mutate]
  )

  const restore = useCallback(
    async (id: string) => {
      const optimistic: ExclusionsResponse = {
        ids: (data?.ids ?? []).filter((x) => x !== id),
        items: (data?.items ?? []).filter((it) => it.productId !== id),
      }
      await mutate(
        async () => {
          await fetch('/api/exclusions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          })
          return fetcher('/api/exclusions')
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: true }
      )
    },
    [data, mutate]
  )

  return { excludedIds, excludedItems, exclude, restore }
}
