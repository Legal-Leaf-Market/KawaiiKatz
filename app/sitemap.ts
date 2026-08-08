import type { MetadataRoute } from 'next'

import { showcaseVendors } from '@/lib/data'
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
  ]
}
