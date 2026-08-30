import type { Metadata } from 'next'

import { getCatalog } from '@/lib/catalog-source'
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

export default async function Page() {
  const { products } = await getCatalog()
  const initialProducts = products.filter((p) => p.vendor === 'GiftLAB').slice(0, FIRST_PAINT)

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
