import type { MetadataRoute } from 'next'

import { liveLinkShowcases, showcaseVendors } from '@/lib/data'
import { SITE_URL } from '@/lib/site'

/**
 * The storefront itself is one page — categories are client-side filters, not
 * routes — plus one route per showcase partner, generated from the vendor
 * config so adding a partner cannot leave the sitemap behind.
 *
 * Product URLs are deliberately absent, matching the rule written into
 * Nicotia's sitemap: every product lives on the vendor's own site and we
 * should never compete with them for it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: 'daily',
      priority: 1,
    },
    ...showcaseVendors().map((v) => ({
      url: `${SITE_URL}/${v.showcase!.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
    // Link showcases for merchants we cannot ingest. Only the approved ones —
    // liveLinkShowcases() drops anything still waiting on an advertiser id, so
    // the sitemap can never advertise a page that generateStaticParams() did
    // not build. They change when we edit them, not when a feed does.
    ...liveLinkShowcases().map((s) => ({
      url: `${SITE_URL}/${s.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
