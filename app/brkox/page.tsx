import type { Metadata } from 'next'

import { getCatalog } from '@/lib/catalog-source'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import BrkoxClient from './BrkoxClient'

export const revalidate = 21600 // 6 hours — must stay statically analysable
export const maxDuration = 60

export const metadata: Metadata = {
  title: '🧱 BRKOX — Display frames for LEGO® builds | Kawaii Katz',
  description:
    'Wall frames, acrylic cases and LED kits made to fit specific LEGO® sets — Star Wars, F1, ' +
    'Technic, Harry Potter and more. Live prices, curated by Kawaii Katz.',
  alternates: { canonical: '/brkox' },
  openGraph: {
    title: '🧱 BRKOX — Display frames for LEGO® builds',
    description: 'Wall frames, acrylic cases and LED kits made to fit specific LEGO® sets.',
    url: `${SITE_URL}/brkox`,
    type: 'website',
  },
}

/**
 * Server shell for the showcase. The whole vendor is passed through — 50
 * products is small enough to inline, so the page paints with real frames
 * instead of "Fetching the display cabinet…" while the catalogue loads.
 */
export default async function Page() {
  const { products } = await getCatalog()
  const initialProducts = products.filter((p) => p.vendor === 'BRKOX')

  return (
    <>
      <JsonLd
        nodes={[
          pageNode({
            path: '/brkox',
            name: 'BRKOX — Display frames for LEGO® builds',
            type: 'CollectionPage',
            description:
              'Wall frames, acrylic cases and LED kits made to fit specific LEGO® sets.',
          }),
        ]}
      />
      <BrkoxClient initialProducts={initialProducts} />
    </>
  )
}
