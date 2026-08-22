'use client'
import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import type { AdaPick, Product } from '@/lib/data'

// No PIN here, same as useExclusions: writes are authorized by the httpOnly
// cookie /api/ada-login sets, which the browser attaches to these same-origin
// requests on its own.

export const LEGACY_PICKS_KEY = 'wc_ada_picks_v2'

type PicksResponse = { picks: AdaPick[]; source: 'db' | 'default' }

const fetcher = (url: string): Promise<PicksResponse> => fetch(url).then((r) => r.json())

/**
 * Ada's Picks, from the server.
 *
 * Replaces reading `state.adaPicks` out of the client store. That store field
 * was only ever backed by localStorage, so a pick Ada starred was saved to that
 * one browser and seen by nobody — every visitor got the hardcoded
 * DEFAULT_ADA_PICKS. The rail looked curated and was not.
 *
 * Same SWR shape as useExclusions (focus revalidation plus a 30s interval), so
 * a pick starred on Ada's phone shows up on the storefront without a deploy.
 */
export function usePicks() {
  const { data, mutate } = useSWR<PicksResponse>('/api/picks', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30_000,
  })

  const picks = useMemo(() => data?.picks ?? [], [data])
  const pickedIds = useMemo(() => new Set(picks.map((p) => p.id)), [picks])
  /** True when nothing has ever been saved, so the rail is showing the seed list. */
  const isDefault = data?.source === 'default'

  const write = useCallback(
    async (optimistic: AdaPick[], req: () => Promise<unknown>) => {
      await mutate(
        async () => {
          await req()
          return fetcher('/api/picks')
        },
        {
          optimisticData: { picks: optimistic, source: 'db' as const },
          rollbackOnError: true,
          revalidate: true,
        }
      )
    },
    [mutate]
  )

  const addPick = useCallback(
    async (p: Product) => {
      const pick: AdaPick = {
        id: p.id, name: p.name, vendor: p.vendor, cat: p.cat,
        price: p.price, image: p.image, url: p.url || p.domain, ts: Date.now(),
      }
      await write([pick, ...picks.filter((x) => x.id !== p.id)], () =>
        fetch('/api/picks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pick }),
        })
      )
    },
    [picks, write]
  )

  const removePick = useCallback(
    async (id: string) => {
      await write(picks.filter((x) => x.id !== id), () =>
        fetch('/api/picks', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
      )
    },
    [picks, write]
  )

  const togglePick = useCallback(
    (p: Product) => (pickedIds.has(p.id) ? removePick(p.id) : addPick(p)),
    [pickedIds, addPick, removePick]
  )

  /**
   * Picks stranded in this browser's localStorage by the old client-only
   * implementation, offered back rather than published automatically.
   *
   * Automatic would be wrong in both directions. Ada's real curation deserves
   * to survive the change — but that key may equally hold a half-finished list,
   * or something starred while testing, and this is now a GLOBAL list: pushing
   * it silently would publish whatever happens to be in one browser to every
   * visitor on the site. So it is surfaced as a button in Ada Mode and she
   * decides.
   *
   * Only offered while the rail is still on the seed list, because once real
   * picks exist on the server, stale local ones are just noise.
   */
  const strandedLocalPicks = useMemo<AdaPick[]>(() => {
    if (!isDefault) return []
    try {
      const raw = localStorage.getItem(LEGACY_PICKS_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as AdaPick[]
      if (!Array.isArray(parsed) || !parsed.length) return []
      // The defaults were also written to this key, so a browser that never
      // curated anything looks identical to one that did. Comparing against
      // the served seed list tells them apart.
      const served = new Set((data?.picks ?? []).map((p) => p.id))
      const fresh = parsed.filter((p) => p?.id && !served.has(p.id))
      return fresh
    } catch {
      return []
    }
  }, [isDefault, data])

  const publishLocalPicks = useCallback(async () => {
    if (!strandedLocalPicks.length) return
    await write([...strandedLocalPicks, ...picks], () =>
      fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks: strandedLocalPicks }),
      })
    )
    try { localStorage.removeItem(LEGACY_PICKS_KEY) } catch { /* ignore */ }
  }, [strandedLocalPicks, picks, write])

  return {
    picks, pickedIds, isDefault,
    addPick, removePick, togglePick,
    strandedLocalPicks, publishLocalPicks,
  }
}
