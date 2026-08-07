import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'

/**
 * Ported from the rule Nicotia and Legal-Leaf both landed on.
 *
 * `/api/` is disallowed for a concrete reason, not tidiness: GET /api/catalog
 * fans out across every vendor and pulls several megabytes of products.json per
 * store (Kore Kawaii alone returns ~5.7MB on page 1). A crawler walking that
 * endpoint costs a live scrape against every vendor storefront and returns
 * nothing a search engine can use. The catalog reaches Google through the
 * rendered page instead.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/api/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
