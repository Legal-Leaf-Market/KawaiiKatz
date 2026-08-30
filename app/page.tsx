import { FIRST_PAINT_COUNT, getCatalog } from '@/lib/catalog-source'
import { showcaseVendors, type Product } from '@/lib/data'
import { SITE_TITLE } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import HomeClient from './HomeClient'

/**
 * Server shell for the storefront.
 *
 * This exists so the page ships real products in its HTML. Previously the
 * document was rendered from SEED_PRODUCTS — a hardcoded list baked in at build
 * time — and every visitor saw those placeholder items until a 300KB catalogue
 * fetch landed and React re-rendered the grid. First paint was fast but wrong,
 * and the swap was visible.
 *
 * Now the first screenful is drawn from the live catalogue during prerender,
 * cached by the route-segment `revalidate` below, and served identically to
 * everyone until it expires. No visitor pays for the scrape.
 */
export const revalidate = 21600 // 6 hours — must stay statically analysable
export const maxDuration = 60 // the image scan can run on a cold prerender

const SHOWCASE = new Set(showcaseVendors().map((v) => v.vendor))

export default async function Page() {
  const { products } = await getCatalog()

  // Showcase vendors are held back here for the same reason they are in the
  // client hook — they have their own page.
  const grid = products.filter((p) => !SHOWCASE.has(p.vendor))

  /**
   * NOTHING IS HOISTED INTO FIRST PAINT ANY MORE, because nothing needs to be.
   *
   * This block existed for the hardcoded seed picks. Every one of them carried
   * `image: ''` and was resolved against the live catalogue by id, so a seed
   * pick sitting at index 1490 rendered an emoji placeholder until the whole
   * catalogue landed — the "one of Ada's picks takes a while" everyone could
   * see. The seed list is gone, and a pick saved by the curator never had that
   * problem: store_picks denormalises the image alongside the id, so the rail
   * paints from its own rows without waiting for the catalogue at all.
   */
  const initialProducts = grid.slice(0, FIRST_PAINT_COUNT)

  return (
    <>
      <JsonLd
        nodes={[
          pageNode({
            path: '/',
            name: SITE_TITLE,
            type: 'CollectionPage',
            description:
              'Curated kawaii plushies, stationery, kitchen, puzzles and collectibles compared across the shops we carry.',
          }),
        ]}
      />
      <HomeClient initialProducts={initialProducts} />
    </>
  )
}
