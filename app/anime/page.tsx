import type { Metadata } from 'next'

import { getVendorCatalog } from '@/lib/catalog-source'
import { SOURCES, animePool, fillAnimePages } from '@/lib/anime'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import AnimeClient from './AnimeClient'

/**
 * The Anime room: /anime.
 *
 * -----------------------------------------------------------------------------
 * WHY IT IS A ROOM AND NOT /decora's "ANIME MODE" SHELF
 *
 * That shelf exists, and it is the argument FOR this page rather than against
 * it: it is capped at twelve tiles and it draws only from the seven J-fashion
 * shops, so it was showing about 1% of the character stock this site actually
 * carries. Measured across all 6,777 products: 333 rows, over seven vendors,
 * most of them in categories /decora never looks at (kitchen, plush, food,
 * tech). See the header of lib/anime.ts.
 *
 * -----------------------------------------------------------------------------
 * NAMED AFTER THE AESTHETIC, NOT A SHOP OR A SERIES
 *
 * Same call /decora got, plus one more reason that is specific to this room.
 * A page called after a licence would read as that licence's page, and this
 * site holds no licence from anybody: the shops do. "Kawaii Katz Goes Anime" is
 * a curation claim, which is the only claim we can actually make.
 *
 * -----------------------------------------------------------------------------
 * ONE MORE CATALOGUE-BACKED PRERENDER, AND IT BUILDS SEVEN VENDORS
 *
 * §4b's rule and the one the Decora feeds paid for: a route's cost should be the
 * size of its output. This renders SOURCES only. It adds ONE route to the count,
 * because the room ships with no RSS feeds of its own - a BOARDS-style entry
 * would add a page AND a feed apiece, and §4b's standing advice is that the next
 * thing added should share a route rather than multiply them. The Pin buttons
 * cover the Pinterest surface in the meantime.
 */
export const revalidate = 21600 // 6 hours — must stay statically analysable
export const maxDuration = 60

/**
 * FIRST PAINT IS THE SECTIONS THEMSELVES, and it carries three pages per shelf.
 *
 * One page was the bug /decora shipped: Shuffle and Load more only render when a
 * shelf has more than one page behind it, so with a single page inlined the
 * buttons were absent from the served HTML and appeared a second later when the
 * live catalogue landed, which reads to a visitor as them not existing.
 *
 * Three is the trade. This room is 333 products, so three pages is roughly 190
 * rows rather than the ~500 of /decora, and §4b's warning is about the other
 * direction: serialising a whole shelf into the document trades a fast
 * background fetch for a slow first byte.
 */
const FIRST_PAINT_PAGES = 3

const TITLE = 'Kawaii Katz Goes Anime: Sanrio, San-X and the shows'
const DESC =
  'Anime and character merch, sorted by what you would do with it: wear it, carry it, ' +
  'collect it, sleep under it. Sanrio, San-X, Ghibli and more, picked by Kawaii Katz and ' +
  'sold by the independent shops that stock it.'

export const metadata: Metadata = {
  title: `${TITLE} | Kawaii Katz`,
  description: DESC,
  alternates: { canonical: '/anime' },
  openGraph: {
    title: TITLE,
    description: 'The characters, not the cosplay.',
    url: `${SITE_URL}/anime`,
    type: 'website',
    images: [`${SITE_URL}/anime/social-pin.webp`],
  },
}

export default async function Page() {
  const { products } = await getVendorCatalog(SOURCES)
  const pool = animePool(products)

  const { sections, roll } = fillAnimePages(products, FIRST_PAINT_PAGES)
  const seen = new Set<string>()
  const initialProducts = [...sections.flatMap((s) => s.pages.flat()), ...roll].filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  return (
    <>
      <JsonLd
        nodes={[
          pageNode({
            path: '/anime',
            name: TITLE,
            type: 'CollectionPage',
            description: DESC,
          }),
        ]}
      />
      <AnimeClient initialProducts={initialProducts} totalCount={pool.length} />
    </>
  )
}
