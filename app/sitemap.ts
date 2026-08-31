import type { MetadataRoute } from 'next'

import { ARTICLES } from '@/lib/articles'
import { BOARDS } from '@/lib/boards'
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
    // Gift guides. These ARE listed, and they are the only listing here that
    // holds products — a guide is our own editorial page, so it competes with
    // no vendor for their own product URL. The /p/<id> pages it links to stay
    // OUT of the sitemap, which is the rule; they are indexable as of
    // 2026-08-26 because noindex was suppressing every Pin (§4f).
    {
      url: `${SITE_URL}/gifts`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    ...BOARDS.map((b) => ({
      url: `${SITE_URL}/gifts/${b.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    // The Decora room. Listed on the same footing as a gift guide: original
    // Kawaii Katz editorial over a shelf we do not own, competing with no
    // vendor for their own product URL. It is a room rather than a vendor
    // page, so it stays listed when the retailers behind it change.
    {
      url: `${SITE_URL}/decora`,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    // The anime hall. Listed for the same reason a guide is: it is our own
    // editorial page and competes with no vendor for their own URL. It is a
    // static route, so unlike the link showcases there is no pending flag to
    // check — if the page exists it is meant to be found.
    {
      url: `${SITE_URL}/anime`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    // Articles. Listed for the same reason the guides are: they compete with no
    // vendor because no vendor wrote them, and they are the only pages here
    // that answer a question rather than list stock.
    {
      url: `${SITE_URL}/learn`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    ...ARTICLES.map((a) => ({
      url: `${SITE_URL}/learn/${a.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
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
