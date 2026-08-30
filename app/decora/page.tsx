import type { Metadata } from 'next'

import { getCatalog } from '@/lib/catalog-source'
import { decoraPool, fillDecora } from '@/lib/decora'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import DecoraClient from './DecoraClient'

/**
 * The Decora room: /decora.
 *
 * -----------------------------------------------------------------------------
 * WHY /decora AND NOT A SHOP'S NAME
 *
 * The handoff brief's stated goal is "a reusable Kawaii Katz tween/Decora world
 * that can later host additional retailers without changing the core cast or
 * design language". A URL named after one retailer cannot do that: the second
 * decora shop would need a second page, or this one would carry a name that no
 * longer describes it.
 *
 * It is also the safer half of the brief's legal guardrail, and Jacob's call
 * once he saw the first draft: a shop's name in the title and in 88px display
 * type reads as THEIR page, even though every word on it is ours. The room is
 * named after the aesthetic, the shops are credited plainly further down, and
 * the model is Punk Goes Pop rather than a co-branded storefront.
 *
 * `/[brand]` already exists at the root but only generates `claires` and
 * `smiggle` (LINK_SHOWCASES), and a static segment beats a dynamic one in Next
 * routing regardless, so there is no collision.
 *
 * -----------------------------------------------------------------------------
 * INDEXABLE AND IN THE SITEMAP, WHICH SECTION 7 ALLOWS
 *
 * The rule is "do not compete with a vendor for their own product page". This
 * competes with nobody's: it is original editorial, the same standing as the
 * gift guides (section 4e). No product URL is added to the sitemap.
 *
 * -----------------------------------------------------------------------------
 * ONE MORE CATALOGUE-BACKED PRERENDER
 *
 * Section 4b is tracking this count: it was 30 routes and 5.2 minutes on
 * be62863. This adds one. Re-measure on the next deploy rather than assuming.
 */
export const revalidate = 21600 // 6 hours — must stay statically analysable
export const maxDuration = 60

/**
 * FIRST PAINT IS THE SECTIONS THEMSELVES, NOT THE NEWEST N.
 *
 * The first cut inlined the 90 newest products, which was both too much and too
 * little: too much because most of them are never rendered, and too little
 * because "Room loot" draws on homeware and plush that are not in the newest 90,
 * so that whole section was missing until the live fetch landed and then popped
 * in. A section appearing after hydration is a layout shift on the one page
 * where the layout IS the product.
 *
 * So the server runs the same `fillDecora` the client runs and inlines the
 * union of what it chose. That is around 80 products rather than 438, the page
 * is complete on first paint, and the live catalogue then refreshes prices and
 * nothing else moves.
 */

const TITLE = 'Kawaii Katz Goes Decora: Harajuku and J-fashion'
const DESC =
  'Japanese street fashion, decora accessories and character collabs. Tops, skirts, bags, ' +
  'clips and stationery, picked by Kawaii Katz and sold by the independent shops that stock it.'

export const metadata: Metadata = {
  title: `${TITLE} | Kawaii Katz`,
  description: DESC,
  alternates: { canonical: '/decora' },
  openGraph: {
    title: TITLE,
    description: 'Cute. Chaotic. Completely intentional.',
    url: `${SITE_URL}/decora`,
    type: 'website',
  },
}

export default async function Page() {
  const { products } = await getCatalog()
  const pool = decoraPool(products)
  const { sections, edit } = fillDecora(products)
  const seen = new Set<string>()
  const initialProducts = [...sections.flatMap((s) => s.products), ...edit].filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  return (
    <>
      <JsonLd
        nodes={[
          pageNode({
            path: '/decora',
            name: TITLE,
            type: 'CollectionPage',
            description: DESC,
          }),
        ]}
      />
      <DecoraClient initialProducts={initialProducts} totalCount={pool.length} />
    </>
  )
}
