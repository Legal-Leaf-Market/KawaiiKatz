'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageVisit } from '@/lib/pinterest-track'

/**
 * Reports `page_visit` once per route.
 *
 * Keyed on the pathname rather than fired on mount alone, because this sits in
 * the root layout: the layout mounts once and every client-side navigation
 * after that would go unreported.
 *
 * Renders nothing. If PINTEREST_CONVERSION_TOKEN is unset the request reaches
 * the route and stops there, so with no token configured this costs one local
 * POST per page and sends nothing anywhere.
 */
export default function PinterestPageVisit() {
  const pathname = usePathname()
  useEffect(() => { trackPageVisit() }, [pathname])
  return null
}
