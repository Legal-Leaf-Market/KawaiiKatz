import { FIRST_PAINT_COUNT, getCatalog } from '@/lib/catalog-source'
import { showcaseVendors } from '@/lib/data'
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

  // Only what the grid itself shows. Showcase vendors are held back here for
  // the same reason they are in the client hook — they have their own page —
  // and the slice keeps the document small enough that inlining it is a win.
  const initialProducts = products.filter((p) => !SHOWCASE.has(p.vendor)).slice(0, FIRST_PAINT_COUNT)

  return <HomeClient initialProducts={initialProducts} />
}
