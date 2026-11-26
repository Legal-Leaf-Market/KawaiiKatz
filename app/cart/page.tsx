import type { Metadata } from 'next'

import CartPageClient from './CartPageClient'

/**
 * The cart as a page. Two jobs: somewhere to land a shopper whose cart was
 * built elsewhere (Heart of Columbus hands its Kawaii Katz lines here as
 * `?i=<productId>~<variantId>~<qty>`, one per line), and a full-width view of
 * the same per-store checkout the drawer offers.
 *
 * A static shell around a client component, so it costs the build nothing:
 * the catalogue comes from the same cached /api/catalog request every page
 * makes (PROJECT_GUIDE §4b). Not indexed, and not in the sitemap: a cart is
 * one visitor's, never a page to rank.
 */
export const metadata: Metadata = {
  title: 'Your cart | Kawaii Katz',
  description: 'Your Kawaii Katz cart. Each shop checks you out on its own site.',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return <CartPageClient />
}
