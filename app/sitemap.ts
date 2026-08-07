import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'

/**
 * One entry, because the storefront is genuinely one page — categories are
 * client-side filters, not routes.
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
  ]
}
