import { FIRST_PAINT_COUNT, getCatalog } from '@/lib/catalog-source'
import { DEFAULT_ADA_PICKS, showcaseVendors, type Product } from '@/lib/data'
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
const PICK_IDS = new Set(DEFAULT_ADA_PICKS.map((p) => p.id))

export default async function Page() {
  const { products } = await getCatalog()

  // Showcase vendors are held back here for the same reason they are in the
  // client hook — they have their own page.
  const grid = products.filter((p) => !SHOWCASE.has(p.vendor))

  /**
   * Ada's Picks go in first, whatever their position in the catalogue.
   *
   * The rail is the very first thing on the page and its picks carry no image
   * of their own — each one is resolved against the live catalogue by id. Five
   * of the six sit between index 317 and 1490, so a plain `slice(0, 60)` left
   * the rail showing emoji placeholders until the full 298KB catalogue landed.
   * That was the "one of Ada's picks takes a while" everyone could see.
   */
  const picks: Product[] = []
  const rest: Product[] = []
  for (const p of grid) (PICK_IDS.has(p.id) ? picks : rest).push(p)

  const initialProducts = [...picks, ...rest].slice(0, FIRST_PAINT_COUNT)

  return <HomeClient initialProducts={initialProducts} />
}
