import type { Metadata } from 'next'

import { getVendorCatalog } from '@/lib/catalog-source'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import EverblogClient from './EverblogClient'

/**
 * Everblog's showcase, the third after BRKOX and GiftLAB.
 *
 * -----------------------------------------------------------------------------
 * THE WHOLE VENDOR IS INLINED, UNLIKE /giftlab
 *
 * That page caps first paint at 60 because GiftLAB is 2,387 products. Everblog
 * is a calendar in two sizes plus accessories: on the order of ten rows, which
 * is small enough to serialise into the document outright, the way /brkox does
 * with its 86. Section 4b's warning is about the other direction.
 *
 * -----------------------------------------------------------------------------
 * ONE VENDOR, NOT NINETEEN
 *
 * getVendorCatalog rather than getCatalog, for the reason §4b now states as a
 * rule: a route's cost should be the size of its output. This page renders one
 * shop, so it builds one shop.
 */
export const revalidate = 21600 // 6 hours — must stay statically analysable
export const maxDuration = 60

const VENDOR = 'Everblog US'

const TITLE = 'Everblog: the digital family calendar'
const DESC =
  'A calendar for the fridge or the wall that keeps a household straight: a profile for ' +
  'everyone, chores that turn into stars, and one shopping list instead of four. No ' +
  'subscription. Picked by Kawaii Katz, sold by Everblog.'

export const metadata: Metadata = {
  title: `📅 ${TITLE} | Kawaii Katz`,
  description: DESC,
  alternates: { canonical: '/everblog' },
  openGraph: {
    title: `📅 ${TITLE}`,
    description: 'One calendar, everyone in the house, no subscription.',
    url: `${SITE_URL}/everblog`,
    type: 'website',
  },
}

export default async function Page() {
  const { products } = await getVendorCatalog([VENDOR])

  return (
    <>
      <JsonLd
        nodes={[
          pageNode({
            path: '/everblog',
            name: TITLE,
            type: 'CollectionPage',
            description: DESC,
          }),
        ]}
      />
      <EverblogClient initialProducts={products.filter((p) => p.vendor === VENDOR)} />
    </>
  )
}
