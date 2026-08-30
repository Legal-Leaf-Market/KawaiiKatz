import type { Metadata } from 'next'

import { getVendorCatalog } from '@/lib/catalog-source'
import { SOURCES, decoraPool, fillDecoraPages } from '@/lib/decora'
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
 * be62863. This adds one, and the six Decora feeds add six more.
 *
 * This route no longer pays for all of them: it builds SOURCES only, which is
 * everything it renders. Two of the feeds timed out at 240 seconds before that
 * change went in; after it, 7d22cc1 built 57 pages in 4.9 minutes against 50 in
 * 5.2, so six more routes came in cheaper than the five before them.
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

/** Pages per shelf inlined into the HTML. See the note in Page(). */
const FIRST_PAINT_PAGES = 3

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
  // One room, one shelf. Everything this page renders server-side comes from
  // SOURCES, so scraping the other seventeen vendors here bought nothing but
  // build time — and the count of routes doing exactly that is what put two
  // Decora feeds over the 240s per-page cap. The browser still fetches the
  // whole catalogue for the cart and the Gift Finder; that is a different
  // request and it is not on the build's clock.
  const { products } = await getVendorCatalog(SOURCES)
  const pool = decoraPool(products)

  /**
   * FIRST PAINT CARRIES SEVERAL PAGES PER SHELF, NOT JUST THE FIRST.
   *
   * It carried one, and that quietly broke the two controls it was supposed to
   * support. Shuffle and Load more only render when a shelf has more than one
   * page behind it, and a shelf dealt from ~80 inlined products has exactly
   * one. So the buttons were absent on the served HTML and appeared a second
   * later when the live catalogue arrived, which reads as them not existing.
   *
   * Three pages is the trade. One is broken, all eight would serialise ~500
   * products into the document, and section 4b is explicit about why that is
   * the wrong direction: FIRST_PAINT_COUNT exists because ~1,600 products put
   * 1.9MB in the HTML and traded a fast background fetch for a slow first byte.
   * Three gives the controls something real to do on arrival and the live
   * fetch then extends every shelf to its full depth.
   */
  const { sections, edit } = fillDecoraPages(products, FIRST_PAINT_PAGES)
  const seen = new Set<string>()
  const initialProducts = [...sections.flatMap((s) => s.pages.flat()), ...edit].filter((p) => {
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
