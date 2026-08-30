import 'server-only'

/**
 * Partner prospects — application paperwork, not runtime config.
 *
 * Nothing in this file builds a link or ships a product. It records which
 * programme to apply to for each candidate merchant, on which network, and what
 * has actually been verified about them, so the next person to work on
 * partnerships starts from what was already found rather than re-running the
 * same searches.
 *
 * It is `server-only` for the same reason Legal-Leaf keeps its impact.com table
 * out of public/app.js: the storefront has no use for a list of the rates we are
 * chasing, and every byte a client component imports is served to every visitor.
 * Do NOT import this from a `'use client'` file — the barrier is the point.
 *
 * -----------------------------------------------------------------------------
 * WHY THESE FOUR ARE NOT IN VENDORS
 *
 * Every one of them is a good fit for Ada's brief, and none can be ingested by
 * the machinery this site has. `lib/catalog-source.ts` reads Shopify's
 * products.json and nothing else; these four run Salesforce Commerce Cloud or
 * their own stacks, so a row in VENDORS would register a vendor that returns
 * zero products forever. Tokyo Tiger already showed how that reads from outside:
 * `ok: true`, a shelf that is quietly short, and nothing in the logs.
 *
 * Two honest routes exist for them, and both are their own piece of work:
 *   1. A per-merchant scraper, the shape Legal-Leaf uses for Natural Smoke Shop.
 *   2. A showcase page (VendorConfig.showcase, as BRKOX has) that links the
 *      merchant's own collections through the affiliate redirect without
 *      ingesting a catalogue at all. Cheaper, and for Hot Topic and Claire's
 *      probably the right answer: their catalogues are enormous and their
 *      appeal is the brand, not a grid of individual rows.
 *
 * -----------------------------------------------------------------------------
 * VERIFICATION STATUS, STATED PLAINLY
 *
 * Everything below comes from public search on 2026-08-22. Egress to merchant
 * and network hosts is refused by the proxy in the container this was written
 * in, so NOT ONE of these rates was read off the network's own dashboard. Treat
 * `rate` and `cookie` as leads to confirm at application time, not as terms.
 * The one field that is worth more than the rest is `awinMerchantId`, because
 * it is the value affiliateUrl() would actually use — and a wrong one credits
 * somebody else's programme, so confirm it in the AWIN UI before it is used.
 */

export type PartnerProspect = {
  merchant: string
  domain: string
  /** Where the programme lives. 'rakuten' is called out separately from
   *  'impact' on purpose — see RAKUTEN_MIGRATION below. */
  network: 'impact' | 'awin' | 'rakuten' | 'cj' | 'refersion' | 'goaffpro' | 'direct' | 'unknown'
  /** Published rate, unconfirmed. */
  rate: string
  cookie: string
  /** Why Ada would want it on the shelf. */
  fit: string
  /** What has to happen before it could ship, beyond an approval. */
  blocker: string
  /** AWIN advertiser id where one was found. Feeds VendorConfig.awinMerchantId
   *  if this merchant ever gets an ingest path. CONFIRM BEFORE USE. */
  awinMerchantId?: string
}

/**
 * THE SINGLE MOST USEFUL THING IN THIS FILE, if Impact is where the effort goes.
 *
 * Rakuten Advertising and impact.com announced a strategic alliance on
 * 2026-04-28: Rakuten is retiring its own tracking stack and migrating roughly
 * 2,000 advertiser programmes onto impact.com's platform, keeping its managed
 * service on top. Rakuten has historically been where the big US mall-brand
 * programmes live.
 *
 * What that means here: a merchant that reads as "Rakuten, not one of our
 * networks" today is likely to become reachable through the Impact account we
 * already hold, without a second network relationship. Before writing any of
 * these off, search the impact.com marketplace for the domain — the row may
 * simply not have existed when the 2026-08-11 export was pulled.
 */
export const RAKUTEN_MIGRATION_NOTE =
  'Rakuten programmes are migrating onto impact.com (announced 2026-04-28). ' +
  'Re-search the Impact marketplace for any merchant last seen on Rakuten.'

export const PARTNER_PROSPECTS: PartnerProspect[] = [
  {
    // Ada asked for this one by name, so it gets the most careful note.
    merchant: 'Hot Topic',
    domain: 'https://www.hottopic.com',
    network: 'rakuten',
    rate: '10% of net sale; higher for top performers',
    cookie: '14 days',
    fit:
      'Named by Ada. Runs a standing /shop/kawaii-clothes/ department plus the ' +
      'licensed anime and Sanrio ranges, which is most of the brief in one ' +
      'merchant. Sister brand BoxLunch is the same parent but sits on CJ, ' +
      'which we are not on, so it is not the cheaper way in.',
    blocker:
      'Not Shopify — no products.json. Needs a showcase page or its own ' +
      'scraper. Network placement is the open question: apply through Impact ' +
      'first given the migration above, and fall back to the HT Partner ' +
      'Program application on hottopic.com only if the marketplace has no row.',
  },
  {
    merchant: "Claire's",
    domain: 'https://www.claires.com',
    network: 'awin',
    rate: '2%',
    cookie: '30 days',
    fit:
      'The accessories half of the brief almost line for line: earrings, hair ' +
      'clips and bows, scrunchies, cat-ear headbands, bracelets, kid-safe lip ' +
      'gloss. Kid-appropriate by construction, which no other candidate can ' +
      'claim without a feed read. AWIN is a network we are already live on ' +
      '(BRKOX), so approval needs no new relationship — affiliateUrl() would ' +
      'build the deep link from AWIN_PUBLISHER_ID unchanged.',
    blocker:
      'Not Shopify. 2% is the lowest rate on this list, which argues for the ' +
      'showcase-page route rather than the cost of a bespoke scraper.',
  },
  {
    merchant: 'Smiggle',
    domain: 'https://www.smiggle.co.uk',
    network: 'awin',
    rate: '7% at launch',
    cookie: '30 days',
    fit:
      'Explicitly aimed at ages 6-12 and built entirely on bright pastel ' +
      'colourways — the safest kid-friendly signal of any merchant found. ' +
      'Stationery, pencil cases, backpacks, wallets and purses, so it fills ' +
      'the stationery and accessories shelves rather than apparel.',
    blocker: 'Not Shopify. UK-first catalogue and pricing.',
  },
  {
    merchant: 'TruffleShuffle',
    domain: 'https://www.truffleshuffle.co.uk',
    network: 'awin',
    // From the AWIN merchant profile URL, ui.awin.com/merchant-profile-terms/1465.
    // That path segment IS the advertiser id, but it was read out of a search
    // result rather than the dashboard, so it stays unconfirmed here.
    awinMerchantId: '1465',
    rate: '8%',
    cookie: '30 days',
    fit:
      'Keeps a kawaii department alongside its licensed 70s-90s ranges. ' +
      'Officially licensed throughout, which is a real trust signal for a site ' +
      'whose job is handing a shopper to a merchant.',
    blocker:
      'Platform unconfirmed. Adjacent to the brief rather than in it — this is ' +
      'nostalgia and licensing, not decora. Worth having, not worth going ' +
      'first. Note the programme forbids bidding on their brand keywords.',
  },
]

/**
 * Merchants deliberately looked at and NOT pursued, so nobody spends an
 * afternoon rediscovering them.
 *
 * The pattern in the first three is the one to watch for while shortlisting:
 * a large, cheap, drop-shipped "kawaii fashion" catalogue is usually carrying a
 * lingerie and cosplay range in the same feed. This site's kid-safety filters
 * are a backstop for the occasional bad row, not a tool for ingesting a
 * catalogue that is half unsuitable — the same judgement that removed
 * Tokyocanvas on trust grounds rather than technical ones.
 */
export const PARTNERS_REJECTED: { merchant: string; why: string }[] = [
  { merchant: 'SpreePicky', why: 'Large drop-ship catalogue carrying lingerie and adult cosplay alongside the kawaii range.' },
  { merchant: 'Modakawa', why: 'Same shape as SpreePicky — the kid-safe fraction of the feed is not worth the screening.' },
  { merchant: 'Kawaii Fashion Shop', why: 'Same. Generic drop-ship catalogue, no brand of its own.' },
  { merchant: 'Kawaii Nation', why: 'Programme pays commission in store gift cards rather than cash. Not revenue.' },
  { merchant: 'Attitude Clothing', why: 'Good kawaii department, but the programme runs on Visualsoft/Partnerize — a fifth network relationship for one merchant.' },
  { merchant: 'BoxLunch', why: 'On CJ, which we are not on. Hot Topic is the same parent company and reachable on a network we can use.' },
  { merchant: 'Etsy / Redbubble', why: 'Marketplaces, not merchants. Thousands of sellers, no single catalogue to ingest and no consistent quality to stand behind.' },

  // The 2026-08-30 GoAffPro batch. Both were APPROVED partnerships with live
  // dashboard entries, and both are dead shops. That is the finding worth
  // keeping: an approval says a programme exists, not that a store does.
  { merchant: 'Tabletop Item Shop', why: 'Dead. products.json answered HTTP 404 with Shopify\'s {"errors":"Not Found"}, meaning no store at that subdomain, and the shop could not be found by search either (confirmed by Jacob 2026-08-30). GoAffPro approval was real; the storefront was not.' },
  {
    merchant: 'GiftLAB',
    why:
      'AWIN 95201, approved 2026-08-30, and declined the same day on its own feed. ' +
      'Cloudflare blocks products.json so an AWIN datafeed reader was built for it; ' +
      'the reader works (2,426 rows parsed, 2,387 mapped) and the catalogue does not ' +
      'fit. Of 2,387 products: ZERO contain "kawaii", zero "plush", zero "Sanrio", ' +
      '31 "cute". 699 (29%) land in `other` because the classifier has no rule for ' +
      'personalised photo gifts. 21% kid-safe. 465 are near-duplicate variants, ' +
      'including 28 all-but-identical AirPod cases. product_type is EMPTY on all ' +
      '2,426 rows, so an include list cannot trim it (section 4) and there is no ' +
      'kawaii subset to keep anyway. Their own titles misspell "Persoanlized" five ' +
      'times. Adding it would have made a third of the catalogue non-kawaii.',
  },
  { merchant: 'BerryKawaii', why: 'Dead. products.json answered HTTP 402 with {"errors":"Unavailable Shop"}, which is Shopify\'s response for a frozen or paused store (confirmed by Jacob 2026-08-30). Its ref value looked correct, which is the lesson: a plausible tracking code tells you nothing about whether the shop is trading.' },
]
