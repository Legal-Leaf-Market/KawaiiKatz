import type { Metadata } from 'next'

import { getVendorCatalog } from '@/lib/catalog-source'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import GiftlabClient from './GiftlabClient'

/**
 * GiftLAB's showcase, the second one after BRKOX.
 *
 * -----------------------------------------------------------------------------
 * FIRST-PAINT DATA IS CAPPED HERE, UNLIKE /brkox
 *
 * That page inlines its whole vendor because BRKOX is about 86 products, which
 * is small enough to serialise into the document. GiftLAB is 2,387. Section 4b
 * records what happens when a shell inlines too much: serialising the full
 * catalogue put 1.9MB into the home page's HTML and traded a fast background
 * fetch for a slow first byte.
 *
 * So this inlines a slice and lets useVendorCatalog fill in the rest from the
 * SWR call the page makes anyway. FIRST_PAINT is the same idea as
 * FIRST_PAINT_COUNT on the home page, and the number is chosen to fill roughly
 * two screens of grid on a desktop.
 */
export const revalidate = 21600 // 6 hours — must stay statically analysable
export const maxDuration = 60

const FIRST_PAINT = 60

export const metadata: Metadata = {
  title: '🎁 GiftLAB: personalised photo gifts | Kawaii Katz',
  description:
    'Custom face socks and aprons, photo AirPod cases, printed blankets, puzzles and keyrings. ' +
    'Personalised gifts printed to order, with live prices, curated by Kawaii Katz.',
  alternates: { canonical: '/giftlab' },
  openGraph: {
    title: '🎁 GiftLAB: personalised photo gifts',
    description:
      'Custom face socks, photo AirPod cases, printed blankets and puzzles, printed to order.',
    url: `${SITE_URL}/giftlab`,
    type: 'website',
  },
}

const VENDOR = 'GiftLAB'

export default async function Page() {
  /**
   * ONE VENDOR, NOT TWENTY-FIVE, AND THIS ROUTE WAS TIMING OUT WITHOUT IT.
   *
   * §4f-b states the rule: a route's cost should be the size of its output.
   * This page renders GiftLAB and nothing else, and it was calling getCatalog(),
   * so it fanned out across every vendor and paid for a coco-ssd pass over the
   * whole shop to render one merchant's slice.
   *
   * That was affordable when the catalogue was 4,426 products. It is not now.
   * Measured on the builds of 2026-09-02, at 7,920 products: this route failed
   * at the 240s per-page cap and went to a retry on BOTH the main build and the
   * branch build, and it is the cheapest of the eight routes that did.
   *
   * The sharper edge: GiftLAB is `pending`, so getCatalog() skips it entirely
   * and this page renders its empty state. It was building 7,920 products in
   * order to show nothing.
   */
  const { products } = await getVendorCatalog([VENDOR])
  const initialProducts = products.filter((p) => p.vendor === VENDOR).slice(0, FIRST_PAINT)

  return (
    <>
      <JsonLd
        nodes={[
          pageNode({
            path: '/giftlab',
            name: 'GiftLAB: personalised photo gifts',
            type: 'CollectionPage',
            description:
              'Custom face socks and aprons, photo AirPod cases, printed blankets and puzzles.',
          }),
        ]}
      />
      <GiftlabClient initialProducts={initialProducts} />
    </>
  )
}
