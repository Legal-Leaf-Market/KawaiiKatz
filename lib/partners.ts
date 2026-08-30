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

/**
 * THE DECORA SEARCH, 2026-08-30. Read this before hunting for another one.
 *
 * Ada has wanted more decora vendors since the beginning, and /decora is now a
 * room built to take them as a list rather than as new pages. Both network
 * directories were searched in full: GoAffPro's 22,429 stores and AWIN's 20,000
 * advertisers, matched word-anchored on the J-fashion vocabulary.
 *
 * THE ANSWER IS THAT THEY ARE ALL ON GOAFFPRO AND NONE ARE ON AWIN.
 *
 * AWIN, term by term across programme name, description and URL:
 *   kawaii 0, harajuku 0, j-fashion 0, manga 0, otaku 0, gyaru 0, menhera 0.
 *   lolita 3, and two of those are cosplay-costume shops. sanrio 1, which is a
 *   noodle brand. Every `decora` hit was Portuguese or an interior-decor shop,
 *   because `decora` is a substring of DECORATION and of decoracao. That is the
 *   advent/ADVENTURE bug wearing a different hat, and it is why the search is
 *   word-anchored (see lib/boards.ts).
 *
 * So do not spend another afternoon in the AWIN marketplace for this niche.
 * AWIN is where the big retail programmes are, and GiftLAB proved its
 * ShopWindow datafeed is worth having when a shop is Cloudflare-blocked, but
 * it has no decora shelf to sell.
 *
 * The GoAffPro candidates are below. NONE has been probed: this container has
 * no egress to merchant hosts, so "does it answer products.json and is it
 * actually decora" still needs the section 4 build-log probe recipe, and every
 * one of them goes in with `pending: true` (section 4c, the intake of
 * 2026-08-30 where six of seven approvals turned out to be unreadable).
 */
export const DECORA_SEARCH_NOTE =
  'GoAffPro has the decora shelf; AWIN has none (0 kawaii, 0 harajuku, 0 j-fashion ' +
  'across 20,000 advertisers, searched 2026-08-30). Do not re-run the AWIN hunt.'

export const PARTNER_PROSPECTS: PartnerProspect[] = [
  /* ---- The decora shortlist, GoAffPro, 2026-08-30. Unprobed. ---- */
  {
    merchant: 'Lolita Harajuku',
    domain: 'https://lolita-harajuku.myshopify.com',
    network: 'goaffpro',
    rate: '10%',
    cookie: '180 days, which is the longest in either directory',
    fit: 'The single best keyword match in 42,000 programmes across both networks. Names the aesthetic twice.',
    blocker: 'Unprobed. A myshopify.com subdomain often means a small or dormant shop, which is exactly the BerryKawaii and Tabletop shape, so read the feed before believing the listing.',
  },
  {
    merchant: 'SparkX Harajuku',
    domain: 'https://sparkx-harajuku.com',
    network: 'goaffpro',
    rate: '10%',
    cookie: 'unstated',
    fit: 'Harajuku by name on its own domain, which is a better sign of a real shop than a myshopify subdomain.',
    blocker: 'Unprobed.',
  },
  {
    merchant: 'Kawaii Unicorn',
    domain: 'https://kawaii-unicorn.com',
    network: 'goaffpro',
    rate: '15%',
    cookie: 'unstated',
    fit: 'Highest rate of the kawaii cluster. Own domain.',
    blocker: 'Unprobed, and the name suggests general kawaii rather than decora, so it may be a main-grid vendor rather than a /decora source.',
  },
  {
    merchant: 'KawaiiMoriStore',
    domain: 'https://shop.kawaiimoristore.com',
    network: 'goaffpro',
    rate: '10%',
    cookie: 'unstated',
    fit: 'Kawaii on its own domain.',
    blocker: 'Unprobed.',
  },
  {
    merchant: 'Kawaii mood',
    domain: 'https://kawaiimood.com',
    network: 'goaffpro',
    rate: '10%',
    cookie: 'unstated',
    fit: 'Kawaii on its own domain.',
    blocker: 'Unprobed.',
  },
  {
    merchant: 'Egirldoll',
    domain: 'https://egirldoll.com',
    network: 'goaffpro',
    rate: '10%',
    cookie: 'unstated',
    fit: 'E-girl and alt fashion, adjacent to the decora room rather than in it. Worth a look for the same tween audience.',
    blocker: 'Unprobed, and the aesthetic needs Ada\'s eye before it goes near a page aimed at tweens.',
  },
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
  { merchant: 'BerryKawaii', why: 'Dead. products.json answered HTTP 402 with {"errors":"Unavailable Shop"}, which is Shopify\'s response for a frozen or paused store (confirmed by Jacob 2026-08-30). Its ref value looked correct, which is the lesson: a plausible tracking code tells you nothing about whether the shop is trading.' },

  // DELISTED rather than never-listed, and the distinction is the point. This
  // shop was live on the shelf for over a month at the highest commission rate
  // we carry. It was removed on a brand judgement, not a technical one, and
  // nothing about it was broken.
  // Turned up by the decora search of 2026-08-30 and written down so it is
  // never surfaced again by a keyword match on "Japanese".
  { merchant: 'Liebe Seele', why: 'NEVER. A Japanese premium bondage and fetish retailer, GoAffPro, 20%. It matched the J-fashion search on "Japanese" alone. Same rejection class as SpreePicky and Modakawa but without the borderline: there is no kid-safe fraction of this catalogue and this site sells to tweens.' },

  { merchant: 'Autoplush', why: 'Delisted 2026-08-30 by Jacob and Ada. Twelve plush cars at 20% commission, the highest rate we carry, and the feed worked fine. It is a car-culture brand rather than a kawaii one: the photography does not sit next to the rest of the shelf and the products were never a fit, they were inventory taken on early to make the catalogue look fuller. Four guides had to name the vendor in notVendors to keep a Tesla Model X off a board called Kawaii Plushies, which is the tell that the exclusion belonged upstream. Do not re-add on the commission rate alone; that is what put it here the first time.' },
]
