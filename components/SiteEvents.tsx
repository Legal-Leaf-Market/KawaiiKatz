'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { logEvent, wireFlushOnHide } from '@/lib/site-events'

/**
 * Fires page_view on every route change, and arms the queue flush.
 *
 * A separate component from PinterestPageVisit even though both watch the
 * pathname, because they answer to different owners: that one reports to
 * Pinterest's ad account and is governed by their opt-out and LDP rules, this
 * one writes a row to our own table and is governed by nothing but the schema.
 * Merging them would make one privacy decision cover two very different
 * disclosures.
 *
 * The ref guard matters in dev: React strict mode mounts effects twice, and
 * without it every page view would be counted twice in local numbers and once
 * in production, which is the kind of discrepancy that wastes an afternoon.
 */
export default function SiteEvents() {
  const path = usePathname()
  const last = useRef<string | null>(null)

  useEffect(() => {
    wireFlushOnHide()
  }, [])

  useEffect(() => {
    if (!path || last.current === path) return
    last.current = path
    logEvent('page_view', { path })
    if (path.startsWith('/p/')) logEvent('product_view', { path })
  }, [path])

  return null
}
