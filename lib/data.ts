export type Product = {
  id: string
  vendor: string
  domain: string
  name: string
  cat: string
  character: string
  price: number
  unit: string
  onSale: boolean
  wasPrice: number
  discountPct: number
  commissionPct: number
  couponCode: string
  couponPct: number
  image: string
  url: string
  badge: string
  added: string
  variants: { id: string; title: string; price: number; available: boolean }[]
  blurb: string
  /**
   * Decided at scrape time, where `product_type` and tags are still around —
   * far more signal than the name alone (PROJECT_GUIDE §4). Optional because
   * SEED_PRODUCTS predate it; `isKidSafe()` re-derives a verdict for those.
   */
  kidSafe?: boolean
}

export type Category = { key: string; name: string; emoji: string }
export type VendorConfig = {
  vendor: string
  domain: string
  prefix: string
  affiliateParam: string
  commissionPct: number
  couponCode: string
  couponPct: number
  /**
   * AWIN advertisers are paid through a redirect, not a query param. When this
   * is set, `affiliateUrl` builds an awin1.com deep link and `affiliateParam`
   * is ignored — appending ?ref= to the destination would track nothing.
   */
  awinMerchantId?: string
  /**
   * Pin every product from this vendor to one category, overriding the keyword
   * classifier. For a single-purpose catalogue the classifier does more harm
   * than good: BRKOX's display frames were landing across five categories on
   * words like "wall", "case" and "frame", and 14 of them fell into
   * apparel/accessories — which are exactly the categories the coco-ssd person
   * scan runs on, so a LEGO frame was eating the image-scan budget meant for
   * real apparel.
   */
  forceCat?: string
  /**
   * Which affiliate network the programme lives on. Documentation, not runtime
   * config: nothing here builds a link (`affiliateParam` and `awinMerchantId`
   * do that). It is recorded because the four networks behave differently at
   * the point where money starts flowing, and the difference is invisible in
   * the config otherwise:
   *
   *   'impact'   — Impact pays through their own tracking link. What goes in
   *                `affiliateParam` on approval is the campaign's SubId, and
   *                until then the vendor earns NOTHING (see `pending`).
   *   'awin'     — paid by redirect through awin1.com; set `awinMerchantId`
   *                and leave `affiliateParam` empty. See affiliateUrl().
   *   'refersion' / 'goaffpro' — Shopify apps. Both attribute on a `?ref=`
   *                style query param, which is exactly what `affiliateParam`
   *                already is, so approval is a one-line change here.
   *   'direct'   — the merchant runs their own scheme, no network in between.
   */
  network?: 'impact' | 'awin' | 'refersion' | 'goaffpro' | 'direct'
  /**
   * Optional product_type allow-list. Present = ONLY these types are ingested,
   * matched case-insensitively against Shopify's `product_type`.
   *
   * Ported from ShopifyStore.include in Legal-Leaf's lib/hlm.ts, and it earns
   * its place here for the same reason it does there: a vendor's whole
   * catalogue is not necessarily a fit. An allow-list rather than a deny-list
   * on purpose — a product_type the merchant invents later stays OUT until
   * somebody looks at it, instead of silently appearing on the storefront.
   *
   * Write it from a real feed read, never a guess: `node scripts/vendor_probe.mjs
   * <domain>` prints the product_type histogram this list should be built from.
   */
  include?: string[]
  /** Optional product_type deny-list, for stores where taking everything-but is
   *  the more natural expression. Applied after `include`. */
  exclude?: string[]
  /**
   * Registered but NOT scraped. A pending vendor is one we have signed up to in
   * every other respect — network, commission, prefix — whose products.json
   * nobody has actually read yet.
   *
   * This is the piece the Impact intake was missing. The four apparel vendors
   * added on 2026-08-11 went straight onto the shelf unread, and the catalogue
   * inherited two problems from that in one move: Tokyo Tiger returned nothing
   * at all while reporting `ok: true`, and the two sock vendors landed 466
   * products that are still, today, earning zero because `affiliateParam` is
   * empty. Neither failure announced itself. `pending` is how a vendor waits in
   * the config, visibly, without either of those happening silently.
   *
   * getCatalog() skips these and says so in the log, and `/api/catalog?debug`
   * lists them under `pending` so the wait is legible from outside too.
   *
   * The sequence to clear it: run `node scripts/vendor_probe.mjs <domain>`,
   * read the histogram, write `include`/`forceCat` from what is actually in the
   * feed, confirm the affiliate approval landed and put the real tracking value
   * in `affiliateParam` (or `awinMerchantId`), THEN delete this flag.
   */
  pending?: boolean
  /** Shown on the vendor's own showcase page. */
  showcase?: {
    slug: string
    tagline: string
    emoji: string
    intro: string
  }
}

/**
 * Your AWIN publisher ID, from the AWIN dashboard (it is the `awinaffid` in
 * every link they generate). Not a secret — it appears in the URL of every
 * outbound click — so it belongs in config rather than an env var.
 *
 * If this is ever emptied, AWIN vendors fall back to a plain link to the shop:
 * the page works and the shopper gets there, but the click is UNTRACKED and
 * earns no commission. Never ship an AWIN partner without it.
 */
export const AWIN_PUBLISHER_ID = '3022399'

export const CATEGORIES: Category[] = [
  { key: 'plush', name: 'Plushies', emoji: '🧸' },
  { key: 'collect', name: 'Blind Boxes & Collectibles', emoji: '🎁' },
  { key: 'stationery', name: 'Stationery & Stickers', emoji: '✏️' },
  { key: 'apparel', name: 'Apparel', emoji: '👕' },
  { key: 'accessories', name: 'Accessories', emoji: '👜' },
  { key: 'home', name: 'Home & Decor', emoji: '🏠' },
  { key: 'kitchen', name: 'Kitchen & Lunch', emoji: '🍱' },
  { key: 'puzzle', name: 'Puzzles & Games', emoji: '🧩' },
  { key: 'learning', name: 'Learning & Wooden Toys', emoji: '📚' },
  { key: 'tech', name: 'Tech & Gaming', emoji: '🎮' },
  { key: 'food', name: 'Snacks & Drinks', emoji: '🍡' },
]

export const VENDORS: VendorConfig[] = [
  { vendor: 'Plushible', domain: 'https://plushible.com', prefix: 'plbl', affiliateParam: 'ref=kawaiikatz', commissionPct: 20, couponCode: '', couponPct: 0 },
  { vendor: 'Kore Kawaii', domain: 'https://korekawaii.com', prefix: 'kore', affiliateParam: 'ref=kawaiikatz', commissionPct: 15, couponCode: '', couponPct: 0 },
  { vendor: 'Hello Kitty Camp', domain: 'https://hellokittycamp.com', prefix: 'hkc', affiliateParam: 'ref=kawaiikatz', commissionPct: 10, couponCode: 'JACOBKENNEDY', couponPct: 10 },
  { vendor: 'Squishy Bottle', domain: 'https://stopshop9.myshopify.com', prefix: 'sqb', affiliateParam: 'ref=kawaiikatz', commissionPct: 25, couponCode: 'JACOBKENNEDY', couponPct: 15 },
  { vendor: 'Autoplush', domain: 'https://autoplush.com', prefix: 'auto', affiliateParam: 'ref=kawaiikatz', commissionPct: 20, couponCode: '', couponPct: 0 },
  // forceCat for the reason spelled out under jigsawdepot below: the vendor is
  // what disambiguates when a word cannot. Every one of these 23 products is a
  // Montessori learning toy or the nursery furniture that goes with one, and
  // the shared rules keep finding other words in them — "Rainbow Color Sorting
  // Balls in Cups" was on the kitchen shelf because of `cup`, and a "Large
  // Weaning Chair" reached learning only through the age word `toddler`, which
  // no longer decides a category (see the note on the baby rule in
  // catalog-shared). Rather than defend one 23-product vendor with a term list,
  // say what the shop is.
  { vendor: 'Montessori & Me', domain: 'https://montessoriandme.us', prefix: 'mont', affiliateParam: 'ref=kawaiikatz', commissionPct: 15, couponCode: '', couponPct: 0, forceCat: 'learning' },
  { vendor: 'Mintie Lunchboxes', domain: 'https://mintielunchboxes.co.uk', prefix: 'mint', affiliateParam: 'ref=kawaiikatz', commissionPct: 10, couponCode: '', couponPct: 0 },
  // forceCat because 21 of jigsawdepot's 41 products were NOT in Puzzles & Games:
  // 15 in Learning & Wooden Toys and 6 in Kitchen & Lunch. Every one of the 41 is
  // puzzle equipment — boards, tables, roll-up mats — and they were being read by
  // their own feature list: `sorting` (as in "6 Colored Sorting Trays") and
  // `wooden` both belong to the learning rule, which is tested before the puzzle
  // rule.
  //
  // The tempting fix is to move the puzzle rule above learning, and it is wrong.
  // Montessori & Me sells six products with "Puzzle" in the name — "Montessori 4
  // in 1 Farm Animal Block Puzzle", "Single Shape Puzzles" — and every one is
  // correctly in learning today. A toddler's wooden block puzzle IS a learning
  // toy; a wooden jigsaw puzzle table is puzzle equipment. The word cannot tell
  // those apart, so no ordering of the shared rules gets both vendors right. The
  // VENDOR is what disambiguates, which is what forceCat is for.
  //
  // It also makes the fix immune to the tags: `categorize()` reads title + tags +
  // product_type, and the six that landed in kitchen show no kitchen word in their
  // titles, so something in their tags did it. forceCat skips categorize entirely
  // rather than guessing at feed data nobody here can see.
  //
  // Note vendorDefaultCat() already maps jigsawdepot -> 'puzzle'. The intent was
  // recorded; it just could not fire, because that fallback only applies when the
  // classifier returns 'other' and here it was confidently returning the wrong
  // answer. forceCat supersedes it.
  { vendor: 'jigsawdepot', domain: 'https://jigsawdepot.com', prefix: 'jsd', affiliateParam: 'ref=kawaiikatz', commissionPct: 10, couponCode: '', couponPct: 0, forceCat: 'puzzle' },
  // ---------------------------------------------------------------------------
  // Apparel, added 2026-08-11. Found in the Impact.com marketplace export; all
  // four publish 15%, and all four are APPLIED FOR BUT NOT YET APPROVED, which
  // is why `affiliateParam` is empty (see BRKOX below for the same state). The
  // link still works and the shopper still gets there — the click simply earns
  // nothing until an approval arrives and a real param goes in. Listing before
  // approval is deliberate: payout is not an input to whether a vendor is worth
  // showing, and Ada wanted these on the shelf now.
  //
  // `apparel` was a category with a name, an emoji and zero products in it
  // until these landed.
  //
  // MEASURED on the preview deploy, 2026-08-11, via `GET /api/catalog?debug`.
  // Egress to all four hosts is refused by the proxy in the container these were
  // wired up in, so the check had to run where the app runs:
  //
  //   Sydney Sock Project   428 products   Shopify, live
  //   Vix Socks              38 products   Shopify, live
  //   Tokyo Tiger             0 products   NOTHING COMES BACK
  //
  // The zero reports `ok: true`, and that is the whole hazard in one line: `ok`
  // means the fetch did not throw, NOT that a catalogue arrived. Nothing errors,
  // nothing logs, the shelf is just short.
  //
  // Tokyo Tiger is left IN PLACE rather than deleted, because the cause is now
  // narrowed and it is not the entry below. The store is real and it is Shopify
  // — its URLs are /collections/<handle>, which is Shopify's own shape — and
  // `https://www.tokyo-tiger.com` is the right domain. So this is a fetch-level
  // block, not a config typo.
  //
  // BEWARE the obvious test. Opening `/products.json` in a browser will show
  // JSON and tell you nothing, because a browser sends a browser User-Agent and
  // fetchVendorCatalog() sends `KawaiiKatzBot/1.0`. Stores behind bot protection
  // reject the second and serve the first. Compare the two UAs against the same
  // URL; if only the bot one fails, the fix is the User-Agent, and note the
  // other nine vendors currently work with it, so change it deliberately rather
  // than reflexively.
  //
  // ALSO WORTH WATCHING: the coco-ssd adult-model scan runs on exactly the two
  // categories these vendors land in (MODEL_SCAN_CATS = apparel, accessories),
  // on a 35s budget shared across the whole build. These apparel catalogues are
  // the first real demand that budget has seen — unscanned items still ship on
  // the text filter alone, so if these are large, raise the budget rather than
  // assuming every photo was looked at.
  //
  // TOKYOCANVAS WAS REMOVED, 2026-08-12, and should not be re-added without
  // someone re-checking it first. It was applied to on 11 Aug and dropped the
  // next day on trust grounds, not technical ones: ScamAdviser rates
  // tokyocanvas.com very low (domain registered Jan 2025, WHOIS hidden, hosting
  // in Guangdong) and there is a BBB Scam Tracker complaint against it from May
  // 2025. None of that is proof, and we did not verify it ourselves — but this
  // site's job is to hand a shopper to a merchant, which is the one thing it
  // should not do on a maybe. Legal-Leaf delisted THCA King on the same
  // reasoning: a store that fails the shopper fails the only promise the site
  // makes. It was contributing 0 products, so removing it cost nothing; the
  // danger was that fixing the fetch later would have quietly started sending
  // real people there.
  // RESOLVED 2026-08-22, and the answer is not the one the comment above
  // predicted. Probed from a preview deploy with a plain `Mozilla/5.0` UA, from
  // Vercel's IPs: the host answers **HTTP 403**. Not an empty catalogue, not a
  // wrong domain, not the User-Agent — a refusal.
  //
  // So the browser-vs-bot test written above has been run and it came back
  // negative. This is host-level bot protection (Cloudflare or equivalent), and
  // there is no header that gets past it. The remaining honest options are a
  // headless-browser fetch, an Impact product feed if their programme offers
  // one, or dropping the vendor.
  //
  // It is left registered, contributing nothing, because the 403 is now recorded
  // rather than hidden behind `ok: true` — /api/catalog reports it under
  // debug.empty. Do not spend more time on the UA.
  { vendor: 'Tokyo Tiger', domain: 'https://www.tokyo-tiger.com', prefix: 'tt', affiliateParam: '', network: 'impact', commissionPct: 15, couponCode: '', couponPct: 0 },
  // Both sock vendors are single-purpose catalogues, which is the BRKOX case
  // again: the classifier reads a product's own words, and a sock named
  // "Bamboo Crew" or "Merino Ankle" contains none of the apparel keywords, so
  // it would fall through to 'other'. Pinning is safe here precisely BECAUSE
  // the catalogue is one thing. Do NOT pin Tokyo Tiger the same way — it sells
  // more than one kind of product, and a pin would flatten real categories into
  // a wrong one.
  { vendor: 'Sydney Sock Project', domain: 'https://sydneysockproject.com', prefix: 'ssp', affiliateParam: '', network: 'impact', commissionPct: 15, couponCode: '', couponPct: 0, forceCat: 'apparel' },
  { vendor: 'Vix Socks', domain: 'https://www.vixsocks.com', prefix: 'vix', affiliateParam: '', network: 'impact', commissionPct: 15, couponCode: '', couponPct: 0, forceCat: 'apparel' },

  // ---------------------------------------------------------------------------
  // Kawaii / decora / pastel-scene intake, added 2026-08-22, ALL PENDING.
  //
  // Ada's brief was the shelf, not the payout: apparel means clothes — shirts,
  // skirts, pants, lace tops, shoes — plus the accessories that make an outfit
  // decora rather than merely cute: cat ears, hair clips and bows, bracelets,
  // earrings, lip gloss. Today `apparel` holds 466 pairs of socks and nothing
  // else, so every vendor below was picked for what it puts on that shelf.
  //
  // WHY EVERY ONE OF THEM IS `pending`, WITHOUT EXCEPTION.
  //
  // None of these feeds has been read. They could not be: egress to merchant
  // hosts is refused by the proxy in the container this was wired up in, which
  // is the same wall the 2026-08-11 Impact intake hit — and that intake going
  // on the shelf unread is precisely why Tokyo Tiger sat at zero products for
  // eleven days while reporting `ok: true`. Registering these pending is the
  // fix for that failure mode, not caution for its own sake. Each needs one
  // `node scripts/vendor_probe.mjs <domain>` run from a box with open egress
  // before the flag comes off; see the `pending` doc on VendorConfig.
  //
  // They are also all Shopify, which is a selection criterion rather than a
  // coincidence — this catalogue ingests products.json and nothing else. Four
  // strong candidates are therefore NOT in this list and are recorded in
  // PARTNER_PROSPECTS below instead: Hot Topic, Claire's, Smiggle and
  // TruffleShuffle all run non-Shopify platforms, so adding a row here would
  // register a vendor that can never return a product. That is the same call
  // Legal-Leaf made keeping St. Francis Herb Farm out of SHOPIFY_STORES.
  //
  // ONE THING TO EXPECT ON THE FIRST PROBE, because it will look like a bug and
  // is not: the kid-safety filters will delete a large share of what these
  // vendors sell. `pleated skirt`, `thigh high`, `high waist`, `lace up`,
  // `chiffon` and `satin` are all in CUT_PHRASES in lib/adult-apparel.ts, and
  // they are also the plain vocabulary of a fairy-kei wardrobe. The probe
  // prints that count separately for exactly this reason. Do not loosen the
  // filter to make a number go up — read what it actually dropped first.

  // Fairy kei and decora specifically: ruffle skirts, rainbow knits, platform
  // shoes, bunny-ear headbands, star and candy jewellery. The closest match in
  // the whole search to what Ada described, and the reason it sits first.
  // Affiliate programme exists but is gated on a 10k-follower threshold, so the
  // commission is unknown until somebody applies — 0 here is "not established",
  // not "unpaid".
  // PROBED 2026-08-22 on a preview deploy. Feed reads clean; the filter caught
  // the handful of items that needed catching (thigh-highs, a cami top, a gothic
  // mini dress) and left the hair clips, cat-ear pieces, earrings and skirts.
  { vendor: 'Kawaii Babe', domain: 'https://kawaiibabe.com', prefix: 'kbabe', affiliateParam: '', network: 'direct', commissionPct: 0, couponCode: '', couponPct: 0 },
  // Apparel, jewellery, bags, plush and stationery imported from East Asia.
  // Publishes 10% on a 30-day cookie through its own on-site affiliate
  // registration, which is a Shopify affiliate app rather than a network — so
  // approval should hand back a `?ref=`-shaped value that drops straight into
  // `affiliateParam`. Widest catalogue of the six; likely to need an `include`.
  // PROBED 2026-08-22: 513 raw, 491 mapped, 6 dropped by the safety filter.
  // Lands 145 accessories and 77 apparel — the single biggest accessories
  // contribution of the intake. No `include` written on purpose: the feed's 20+
  // product_types are all on-brand (Hair Accessories, Jewellery, Bag, Slippers,
  // makeup) and 72 rows carry an EMPTY product_type, which an include list
  // cannot reach — an allow-list here would silently delete them.
  { vendor: 'The Kawaii Shoppu', domain: 'https://thekawaiishoppu.com', prefix: 'kshop', affiliateParam: '', network: 'direct', commissionPct: 10, couponCode: '', couponPct: 0 },
  // Japanese kawaii, Harajuku brands, strong on stationery and accessories.
  // Runs a published affiliate programme; rate not stated on the public page.
  // PROBED 2026-08-22 and STAYS PENDING on the evidence, which is the probe
  // doing its job: this is a Japanese SNACK importer that also sells accessories,
  // not a kawaii fashion shop. Of 1,250 rows read, the top 15 product_types are
  // all confectionery — Savory Snacks 188, Gummy Candy 167, Chocolate 123, Hard
  // Candy 113 — and only 12 landed in apparel against 132 in food.
  //
  // It also HIT THE 5-PAGE CAP at 1,250 raw for 313 mapped, so the catalogue is
  // truncated and the accessories may well be in the part we never fetched.
  // Shipping it now would flood Snacks & Drinks with several hundred Japanese
  // sweets and still not put a skirt on the apparel shelf.
  //
  // To ship it later: raise MAX_PAGES for this vendor or pin it to the
  // accessory collections, then write an `include` from a FULL type histogram —
  // the one we have is truncated to the top 20 and is all food.
  { vendor: 'Blippo', domain: 'https://www.blippo.com', prefix: 'blip', affiliateParam: '', network: 'direct', commissionPct: 0, couponCode: '', couponPct: 0, pending: true },
  // UK importer stocking ACDC RAG, Dear My Love and Hypercore — actual Harajuku
  // decora labels rather than decora-styled dropship, and it keeps a
  // /collections/decora. No affiliate programme found in public search, so this
  // one needs an approach before it needs a probe.
  // PROBED 2026-08-22, AND IT IS THE ONE. 591 raw, 449 mapped, 6 safety drops.
  // 255 apparel and 125 accessories — more apparel than every other vendor in
  // this catalogue combined, and it is the real thing rather than decora-styled
  // dropship: product_types are Tops 247, Accessories 114, Skirt 44, Dresses 18,
  // Socks 13, Outerwear 11, Trousers 10, and the labels are ACDC RAG, Dear My
  // Love, Psycho Nation, Hypercore and Listen Flavor.
  //
  // SHIPPED UNTRACKED. No affiliate programme was found for them in public
  // search, so `affiliateParam` is empty and every click earns nothing. That is
  // the deliberate BRKOX/Impact precedent — "payout is not an input to whether a
  // vendor is worth showing" — and it is now a VISIBLE state rather than a
  // silent one: isUntracked() reports it and `/api/catalog` lists it under
  // debug.untracked. They need an approach, not an application.
  //
  // WATCH THE JIRAI KEI. Dear My Love is a jirai-kei label, and that subculture
  // runs older than this site's audience. The 6 drops were the right 6 (a lace-up
  // tee, three camis, a satin tote), but re-read the feed if the range widens.
  { vendor: 'Grumpy Bunny', domain: 'https://grumpybunny.com', prefix: 'gbun', affiliateParam: '', network: 'direct', commissionPct: 0, couponCode: '', couponPct: 0 },
  // Pastel, kawaii and mental-health-positive apparel and accessories, US-made.
  // CHECK THE CATALOGUE CAREFULLY on the probe run: the brand describes part of
  // its range as "pastel goth", and this site's promise is a kid-safe shelf.
  // The filters are a backstop, not a substitute for reading the feed.
  // PROBED 2026-08-22, and this is the entry that justifies the whole `exclude`
  // mechanism, because the probe found something the safety filter CANNOT.
  //
  // 447 raw, 427 mapped, and `safetyDropped: 0` — which looks like a clean feed
  // and is not. sugarhai sells 12 Bikini Tops, 9 Bikini Bottoms, 9 Swimwear and
  // 8 Crop Tops, and the filter did not flag one of them, because
  // adultApparelHit() reads the product NAME and sugarhai names its products
  // after the artwork: the bikini tops are called "Kawaii Maneki Neko" and
  // "Jellyfish Bish". The garment is only ever named in `product_type`.
  //
  // THAT IS A GENERAL HOLE, not a sugarhai quirk: any merchant that names by
  // design rather than by garment is invisible to the text layer. Worth fixing
  // properly one day by screening product_type too. Until then, `exclude` does
  // it precisely and without touching CUT_PHRASES.
  //
  // What is left is the good part and it is substantial: 96 T-shirts, 78
  // Hoodies, 26 Leggings and 178 stickers.
  //
  // ALSO WORTH A HUMAN EYE: the range is pastel-goth as well as pastel, and some
  // titles ("Dead Inside Kitty Cat") are not the register Ada asked for even
  // though nothing about them is unsafe.
  {
    vendor: 'sugarhai',
    domain: 'https://www.sugarhai.com',
    prefix: 'sugar',
    affiliateParam: '',
    network: 'direct',
    commissionPct: 0,
    couponCode: '',
    couponPct: 0,
    exclude: ['Bikini Top', 'Bikini Bottom', 'Swimwear', 'Crop Top'],
  },
  // Not apparel — the one exception in this intake, and deliberate. It is the
  // only candidate found whose affiliate programme is confirmed on a network we
  // already use (Refersion, 10%), and its stated audience is toy reviewers and
  // parents, so it is the cleanest kid-friendly signal of the six. Sensory toys
  // and craft kits; expect it to land in 'puzzle' or 'learning', not 'apparel'.
  // PROBED 2026-08-22 and STAYS PENDING, for a taxonomy reason rather than a
  // trust one. 162 raw, 136 mapped — but 67 of those 136 land in 'other', because
  // this catalogue is slime and there is no category in CATEGORIES that means
  // "sensory toy". The 11 that reached 'accessories' are worse than useless:
  // a tub of slime is not an accessory, and `accessories` is a MODEL_SCAN_CAT,
  // so those 11 would each burn a slice of the coco-ssd budget.
  //
  // It also publishes 16 rows with product_type "hide", which is a merchant's
  // own do-not-show marker and must be excluded whenever this does ship.
  //
  // Shipping it needs a new category (and a chip, and an emoji), which is a
  // bigger change than an intake. Kept registered because it is the only
  // candidate found whose programme is confirmed on a network we already use.
  { vendor: 'Kawaii Slime Company', domain: 'https://kawaiislimecompany.com', prefix: 'kslime', affiliateParam: '', network: 'refersion', commissionPct: 10, couponCode: '', couponPct: 0, pending: true, exclude: ['hide'] },

  // Sixth of the batch (2026-08-30). Apparel-led by name, which is the one
  // category on this site with a filter in front of it: lib/adult-apparel.ts
  // drops adult-model and suggestive-cut clothing, and §4 records that its
  // CUT_PHRASES list is also, word for word, the vocabulary of a fairy-kei
  // wardrobe. On a sample of twelve typical decora items, seven were dropped.
  //
  // So the number to read first for this vendor is not the category split but
  // the kid-safety drop count. A high number is the filter working as written,
  // not a bug, and the fix for a genuine false positive is a narrow KID_SAFE
  // entry and never a loosened CUT_PHRASES (§7).
  //
  // MEASURED 2026-08-30 (build log, §4): the fetch THREW rather than returning
  // a status. `fetch failed` from a Vercel build is DNS or a refused
  // connection, so the host did not answer at all.
  //
  // This is the one result of the batch that deserves a second look rather than
  // a conclusion. An HTTP status is the server talking; a thrown fetch can also
  // be a transient resolver failure on the build machine. Re-probe once before
  // writing this vendor off. If it throws again, the domain is not live.
  //
  // If it does come back, the number to read first is the kid-safety drop count
  // rather than the category split, for the reason above.
  { vendor: 'Kawaii Fashion Store', domain: 'https://kawaiifashionstore.com', prefix: 'kfs', affiliateParam: 'ref=kawaiikatz', network: 'goaffpro', commissionPct: 0, couponCode: '', couponPct: 0, pending: true },

  // Fifth of the batch (2026-08-30), and the one whose name promises the best
  // fit of all of them. Which is worth being slightly suspicious of.
  //
  // THE RISK HERE IS OVERLAP, NOT FIT. A shop named for the category is either
  // a genuine curator or a dropshipper reselling the same AliExpress stock that
  // Kore Kawaii and Kawaii Babe already carry. That is not a hypothetical
  // problem for this catalogue, because de-duplication cannot catch it:
  // getCatalog() keys its byId map on `${prefix}-${handle}`, so the identical
  // product from two vendors has two different ids and appears twice, once
  // under each shop, at two different prices.
  //
  // A visitor sees the same plushie twice in one grid and the site stops
  // reading as curation, which is the whole proposition. Compare this feed's
  // names against the live catalogue before the flag comes off, not just the
  // category split. A high overlap is a reason to decline a vendor even when
  // every product is individually fine.
  //
  // MEASURED 2026-08-30 (build log, §4): products.json answers HTTP 404 with
  // server=cloudflare and an HTML body, not Shopify's `{"errors":"Not Found"}`
  // JSON. An HTML 404 from Cloudflare means we are talking to an edge, not to a
  // Shopify storefront, so either the shop is not Shopify or products.json has
  // been removed.
  //
  // IMPORTANT DISTINCTION: this does not mean the shop is dead. It means we
  // cannot INGEST it. The storefront may be perfectly live in a browser, which
  // puts it in §4c's "not every good merchant can be ingested" bucket alongside
  // Hot Topic and Claire's: a showcase page or nothing, never a VENDORS row
  // that returns zero products forever. Open it in a browser before deciding.
  //
  // The overlap question below was never reached.
  { vendor: 'Best of Kawaii', domain: 'https://bestofkawaii.com', prefix: 'bok', affiliateParam: 'ref=kawaiikatz', network: 'goaffpro', commissionPct: 0, couponCode: '', couponPct: 0, pending: true },

  // Fourth of the same batch (2026-08-30). On category this is the easiest fit
  // of the four: plush is the biggest shelf we have, and a Minecraft plush is a
  // plush toy in a way that a photo blanket or a dice tray is not.
  //
  // TWO THINGS TO SETTLE BEFORE IT SHIPS, and neither is a category question.
  //
  // 1. IS THE STOCK LICENSED? A standalone shop on a `minecraftplushies.com`
  //    domain selling Minecraft plush is either an official licensee or it is
  //    not, and the second case matters more here than it would on most sites:
  //    /learn carries "How to spot a fake Nendoroid" and "Sanrio: real or
  //    fake?". A storefront that teaches people to spot counterfeits and then
  //    earns commission on them has undermined the only thing it sells, which
  //    is trust. Check for a licence statement, a Mojang or Microsoft
  //    attribution, or an authorised-reseller note before the flag comes off.
  //
  // 2. IT IS A LICENCE, AND §4e ALREADY HAS A RULE ABOUT THOSE. Plushible's
  //    NASCAR and college rows are excluded from the guides via
  //    SPORTS_LICENCE_TERMS, not because they are bad products but because they
  //    are a different market from a kawaii guide. Minecraft is a softer case
  //    than a college mascot — it is a children's property with real crossover
  //    into cute plush — but "it is plush" is not by itself the answer. Read
  //    the names in the probe output.
  //
  // MEASURED 2026-08-30 (build log, §4): products.json answers HTTP 404 with no
  // server header and a body of `{ "message": "" }`. That is NOT Shopify's
  // `{"errors":"Not Found"}` shape, so this storefront is on some other
  // platform and this site reads Shopify and nothing else.
  //
  // Same distinction as Best of Kawaii: unreadable is not the same as dead. If
  // the shop is live in a browser it is a §4c showcase-or-nothing candidate,
  // never a VENDORS row. But settle the licensing question FIRST, because it
  // decides whether we want them at all and costs nothing to check.
  { vendor: 'Minecraft Plushies', domain: 'https://minecraftplushies.com', prefix: 'mine', affiliateParam: 'ref=kawaiikatz', network: 'goaffpro', commissionPct: 0, couponCode: '', couponPct: 0, pending: true },

  // GoAffPro, and Jacob believes the approval landed without him noticing
  // (surfaced 2026-08-30). GoAffPro attributes on a query param like Refersion
  // and Impact, so approval really is a one-line change here (§4c) and there is
  // no awin1.com redirect to build.
  //
  // *** THE REF VALUE WAS A TYPO. CONFIRMED AND CORRECTED 2026-08-30. ***
  //
  // The link supplied was https://cozykawaii.shop/?ref=kawaittkatz — "kawaitt",
  // with two t's, where all eight other tracked vendors use `ref=kawaiikatz`.
  // It was recorded here EXACTLY as supplied rather than silently corrected,
  // because only the GoAffPro dashboard knew which was real: had the account
  // been created under a misspelled handle, kawaittkatz would have been the
  // working code and "fixing" it would have broken the tracking.
  //
  // Jacob checked and corrected it in GoAffPro on 2026-08-30. kawaiikatz is
  // right, and is what ships.
  //
  // This is precisely the failure §4 warns about. A wrong ref is not an error
  // anyone sees: the link resolves, the shopper buys, the merchant keeps the
  // commission, and nothing on this site or in any dashboard says a word. The
  // Sydney Sock Project has been live and untracked since 2026-08-11 for a
  // related reason. Ten minutes reading a dashboard beat finding it in a
  // payout report six months from now.
  //
  // MEASURED 2026-08-30 (build log, §4). The feed reads: 719 products, 710
  // survive mapping, 0 dropped by the adult filter, 616 of 710 kid-safe. Those
  // numbers are healthy and they are not the story. THE NAMES ARE.
  //
  //   1. IT IS SUBSTANTIALLY A PET SHOP. Pet Beds (28), Pet Sweaters (11), Cat
  //      Scratchers, Cat Trees & Towers, Harnesses, Bolster Beds, Pillow Beds,
  //      Pet Mat, Floor Rug (23), Bath Mats, Slippers (24). And categorize()
  //      files most of it as `plush`: "Kawaii Winter Warm Cushion Bed for Cats
  //      & Puppies" comes back plush, at $73.50. That is precisely the defect
  //      removed from the plushies board on this same day, and
  //      PLUSH_NOT_A_TOY_TERMS would not catch these because they are worded
  //      "Cushion Bed", not "pet bed". Taking this vendor re-opens a bug that
  //      took a full pass to close.
  //
  //   2. THE STOCK IS OTHER PEOPLE'S CHARACTERS. Duolingo Owl, Snoopy tote and
  //      shoulder bags, Rilakkuma, Hangyodon, SKZOO, "Love & Deepspace". No
  //      dropshipper holds those four licences at once. Same concern as
  //      Minecraft Plushies above, and it lands harder here because /learn
  //      carries two articles teaching people to spot counterfeits.
  //
  //   3. THE PRICES ARE WRONG FOR THIS SHELF. A $73.50 pet bed, a $130 ride-on
  //      car, and a $2,545.32 humanoid dance robot, against a catalogue median
  //      nearer $25.
  //
  //   4. THE TITLES ARE THE DROPSHIP SIGNATURE. Every one is "Kawaii X - Soft
  //      Stuffed Y", generated, em dash included.
  //
  // DECIDED 2026-08-30: shipped on the narrow include list below rather than
  // declined. It keeps the eight genuine plush types and drops every pet bed,
  // cat tree, floor rug, slipper, harness, tote bag and robot, so points 1, 3
  // and 4 above are handled in config. Do NOT paste the probe's own suggested
  // include list, which happily included all of those.
  //
  // POINT 2 IS NOT HANDLED AND CANNOT BE HERE. `include` gates on
  // product_type, so the Duolingo, Rilakkuma, Hangyodon and SKZOO plush stay:
  // they are filed under "Stuffed Animals" like everything else. Only the
  // Snoopy bags left, and only because bags left. Whether to carry another
  // brand's characters from a shop that plainly does not hold the licence is a
  // judgement about who we send shoppers to, and it stays open with the vendor
  // live.
  //
  // The include list below is WRITTEN AND READY, so shipping this vendor is a
  // one-line change: delete `pending` once the ref is confirmed. It keeps the
  // eight genuine plush types (462 of 719) and drops every pet bed, cat tree,
  // floor rug, slipper, harness, tote and robot. It is deliberately NOT the
  // list the probe suggested, which included all of those.
  //
  // What it does NOT solve is the licensing question in point 2 above. That is
  // a judgement, not a filter.
  {
    vendor: 'CozyKawaii',
    domain: 'https://cozykawaii.shop',
    prefix: 'cozy',
    affiliateParam: 'ref=kawaiikatz',
    network: 'goaffpro',
    commissionPct: 0,
    couponCode: '',
    couponPct: 0,
    include: [
      'Stuffed Animals',
      'Stuffed Animals (Giant)',
      'Stuffed Animals 1',
      'Stuffed Animals 2',
      'Stuffed Animals 3',
      'Plush Toy',
      'Plush Pillow',
      'Dolls',
    ],
  },

  // Third AWIN partner, and like BRKOX and MamaRaya they approached us
  // (approved 2026-08-30). GiftLAB sell personalised photo gifts: custom face
  // socks, photo blankets and tapestries, printed mugs and calendars. AWIN
  // advertiser 95201, 10-15% on a 30-day cookie, ShopWindow reporting 2,426
  // products.
  //
  // THE FEED IS BEHIND CLOUDFLARE AND STAYS PENDING INDEFINITELY. Probed
  // 2026-08-30 from a Vercel build (the build-log recipe, §4), which is a
  // datacentre IP sending Mozilla/5.0:
  //
  //   /products.json                     403
  //   /collections/all/products.json     403
  //   /sitemap.xml                       403
  //
  //   all three: server=cloudflare, and the body is the "Just a moment..."
  //   interstitial rather than an error page.
  //
  // A challenge on sitemap.xml is the tell. That is a static file every crawler
  // on earth requests, so this is a site-wide bot rule and not a closed JSON
  // endpoint. It is the Tokyo Tiger shape exactly (§4), and the conclusion
  // recorded there holds here without re-testing it: no User-Agent gets past
  // host-level protection.
  //
  // So products.json can never ingest this merchant, and per §4c a merchant we
  // cannot ingest needs an ingest path of its own rather than a row that
  // returns zero products forever. The difference from Tokyo Tiger is that the
  // fallback here is cheap and already paid for: we are on AWIN, and AWIN's
  // ShopWindow carries the whole catalogue. That needs a datafeed URL from the
  // AWIN Toolbox, which is a credential nobody has fetched yet, and a reader
  // for it — a real change, not a config edit.
  //
  // SHIPPED 2026-08-30 once AWIN_FEEDS was set. The scrape is still impossible
  // and always will be; what changed is that the catalogue now arrives from the
  // network instead. lib/awin-feed.ts pools every configured feed and this
  // vendor takes the rows whose merchant_id is 95201.
  //
  // Whether personalised photo gifts belong on a kawaii shelf at all is still
  // unanswered and is the question to settle BEFORE building a ShopWindow
  // reader. Custom face socks are a different market from a plushie, and §4e's
  // rule is that anything pinned is the public face of the brand. If the answer
  // is yes-but-separately, a showcase page is the shape, as BRKOX got.
  //
  // commissionPct stays 0 until the rate is confirmed in the dashboard rather
  // than read off a programme description, the same as MamaRaya and BRKOX.
  { vendor: 'GiftLAB', domain: 'https://www.giftlab.com', prefix: 'glab', affiliateParam: '', network: 'awin', awinMerchantId: '95201', commissionPct: 0, couponCode: '', couponPct: 0 },

  // Second AWIN partner, and like BRKOX they came to us (2026-08-24).
  // Personalised baby and nursery goods: custom cotton-rope baskets with a
  // name on them, newborn and baby-shower gifts, kids' backpacks and lunch
  // bags. A better fit for the kid-safe filter than anything else in here —
  // this is a shelf of things bought FOR a child by an adult, which is what
  // the Gift Finder's "For a kid" mode is for.
  //
  // Probed 2026-08-24 (build-log recipe, §4). Both halves are done, so it ships:
  //
  //   52 products, 52 survive mapping — nothing dropped for stock or safety.
  //   0 of the 19 apparel/accessory rows would be cut by the phrase filter,
  //   which is the cleanest result any vendor here has returned.
  //   48 of 52 (92%) carry the kid-safe flag, the highest in the catalogue.
  //
  // NO `include` list, deliberately. 16 of the 52 rows have an EMPTY
  // product_type, and an include list cannot reach an empty type — writing one
  // from the histogram would silently delete 31% of the shelf. The feed holds
  // no gift cards, samples or subscriptions, so there is nothing to keep out.
  {
    vendor: 'MamaRaya',
    domain: 'https://www.mamaraya.com',
    prefix: 'mama',
    affiliateParam: '',
    network: 'awin',
    awinMerchantId: '126891',
    // Not yet confirmed from the AWIN dashboard — 0 until it is, so nothing
    // downstream quotes a rate we invented.
    commissionPct: 0,
    couponCode: '',
    couponPct: 0,
  },

  // First AWIN partner. They approached us. Display frames and cases for LEGO
  // builds — pricier and more grown-up than the rest of the catalogue, which is
  // exactly why they get their own showcase instead of being scattered through
  // a grid of plushies where nobody would find them.
  {
    vendor: 'BRKOX',
    domain: 'https://brkox.com',
    prefix: 'brkox',
    affiliateParam: '',
    network: 'awin',
    // BRKOX's AWIN advertiser id (the `awinmid` in any link AWIN generates for
    // this programme). Supplied by the user 2026-08-08.
    awinMerchantId: '129093',
    commissionPct: 0,
    couponCode: '',
    couponPct: 0,
    forceCat: 'collect',
    showcase: {
      slug: 'brkox',
      emoji: '🧱',
      tagline: 'Display frames for the builds you are proudest of',
      intro:
        'BRKOX makes wall frames, acrylic cases and LED kits built to fit specific LEGO® sets: ' +
        'Star Wars, F1, Technic, Harry Potter and more. Finished builds deserve better than a shelf ' +
        'they slowly gather dust on, so we gave them a room of their own.',
    },
  },
]

/**
 * A showcase page for a merchant we CANNOT ingest.
 *
 * The existing `VendorConfig.showcase` (BRKOX) renders a grid of scraped
 * products: /brkox calls getCatalog() and filters to that vendor. That only
 * works for a Shopify merchant with an open products.json. Hot Topic, Claire's,
 * Smiggle and TruffleShuffle are all strong fits on networks we use and none of
 * them runs Shopify, so there is no feed, no grid, and a row in VENDORS would
 * register a vendor that returns zero products forever — the Tokyo Tiger
 * failure by construction.
 *
 * This is the other half: a curated brand page that links into the merchant's
 * OWN category pages through the affiliate redirect. No catalogue, no prices,
 * no cart. It is a signpost, and it is exactly what the AWIN applications in
 * docs/affiliate-applications.md describe us doing — written that way so the
 * application and the site agree.
 *
 * WHY EVERY ENTRY IS `pending` TODAY, and why that is not caution.
 *
 * An AWIN deep link needs the advertiser id, and an advertiser id is issued on
 * approval. We hold none of them: Claire's and Smiggle have not been applied to
 * yet, and TruffleShuffle's 1465 was read off a public profile URL rather than
 * the dashboard. Without an id, awinDeepLink() correctly returns the plain
 * destination — so an ungated page would be a branded funnel handing our
 * traffic to a merchant for free, which is the exact problem the untracked sock
 * vendors already illustrate.
 *
 * To ship one: put the real advertiser id in `awinMerchantId`, delete
 * `pending`, done. generateStaticParams() picks it up and the sitemap follows.
 */
export type LinkShowcase = {
  /** URL segment. Lives at the site root, beside /brkox. */
  slug: string
  merchant: string
  /** Their homepage. Used for the fallback link and the visible domain. */
  domain: string
  emoji: string
  tagline: string
  intro: string
  /** AWIN advertiser id, issued on approval. Empty = every link is untracked. */
  awinMerchantId: string
  /** Curated entry points into the merchant's own site. */
  sections: { label: string; emoji: string; blurb: string; url: string }[]
  /** Anything a shopper should know before they click through. */
  note?: string
  /** No advertiser id yet — no page is generated. See the note above. */
  pending?: boolean
}

export const LINK_SHOWCASES: LinkShowcase[] = [
  {
    slug: 'claires',
    merchant: "Claire's",
    domain: 'https://www.claires.com',
    emoji: '💎',
    tagline: 'The accessories aisle, and nothing but',
    intro:
      "Claire's is where most of us got our ears pierced, and it is still the widest range of " +
      'hair clips, bows, scrunchies, cat-ear headbands, stud earrings and kid-safe lip gloss ' +
      'anywhere. We cannot list their pieces individually, since they are not on a platform we ' +
      'can read, so this is a way in to the parts of their shop worth your time.',
    awinMerchantId: '',
    sections: [
      { label: 'Hair accessories', emoji: '🎀', blurb: 'Clips, bows, claw clips and scrunchies.', url: 'https://www.claires.com/us/accessories/hair-accessories' },
      { label: 'Earrings', emoji: '✨', blurb: 'Studs, hoops and sensitive-skin ranges.', url: 'https://www.claires.com/us/jewelry/earrings' },
      { label: 'Jewellery', emoji: '💫', blurb: 'Necklaces, bracelets and friendship sets.', url: 'https://www.claires.com/us/jewelry' },
      { label: 'Costume & cat ears', emoji: '🐱', blurb: 'Ears, tiaras and dress-up headbands.', url: 'https://www.claires.com/us/accessories' },
      { label: 'Kids beauty', emoji: '💄', blurb: 'Lip gloss, nail sets and body glitter.', url: 'https://www.claires.com/us/beauty' },
    ],
    pending: true,
  },
  {
    slug: 'smiggle',
    merchant: 'Smiggle',
    domain: 'https://www.smiggle.co.uk',
    emoji: '✏️',
    tagline: 'Stationery loud enough to be a personality',
    intro:
      'Smiggle makes pencil cases, backpacks and drink bottles for 6-to-12s in colours that can ' +
      'be seen from space, which is the entire point. It is the closest thing to this site\'s ' +
      'own aesthetic that a high-street brand has ever produced.',
    awinMerchantId: '',
    note: 'UK shop, prices in GBP, and delivery is UK-first.',
    sections: [
      { label: 'Pencil cases', emoji: '🖊️', blurb: 'The ones with too many compartments.', url: 'https://www.smiggle.co.uk/shop/en/smiggleuk/pencil-cases' },
      { label: 'Backpacks', emoji: '🎒', blurb: 'School bags, and the hardtop ones.', url: 'https://www.smiggle.co.uk/shop/en/smiggleuk/bags' },
      { label: 'Lunch & drink bottles', emoji: '🍱', blurb: 'Lunchboxes, bottles and snack pots.', url: 'https://www.smiggle.co.uk/shop/en/smiggleuk/lunch-boxes-drink-bottles' },
      { label: 'Notebooks & stationery', emoji: '📓', blurb: 'Journals, pens and desk things.', url: 'https://www.smiggle.co.uk/shop/en/smiggleuk/stationery' },
    ],
    pending: true,
  },
]

/** Link showcases with an advertiser id, i.e. the ones that get a page. */
export function liveLinkShowcases(): LinkShowcase[] {
  return LINK_SHOWCASES.filter((s) => !s.pending)
}

export function linkShowcase(slug: string): LinkShowcase | undefined {
  return LINK_SHOWCASES.find((s) => s.slug === slug)
}

export const SEED_PRODUCTS: Product[] = [
  { id: 'plbl-14-inch-brown-plush-bunny', vendor: 'Plushible', domain: 'https://plushible.com', name: 'Poppy the Plush Unicorn', cat: 'plush', character: '', price: 12.99, unit: 'from', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://plushible.com/products/14-inch-brown-plush-bunny', badge: '', added: '2026-07-22', variants: [{ id: 'seed-plbl-1', title: '10 in', price: 12.99, available: true }, { id: 'seed-plbl-2', title: '34 in Jumbo', price: 49.99, available: true }], blurb: 'Soft huggable plush bunny. A classic cuddle buddy for all ages.' },
  { id: 'plbl-manhattan-toy-kreecher-pillow', vendor: 'Plushible', domain: 'https://plushible.com', name: 'Pawley the Plush Pillow Pal', cat: 'plush', character: '', price: 15.29, unit: '', onSale: true, wasPrice: 17.99, discountPct: 15, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://plushible.com/products/manhattan-toy-kreecher-pillow', badge: '', added: '2026-07-20', variants: [], blurb: 'Classic pillow pal plush, timeless and squishy-soft.' },
  { id: 'kore-spring-bun-buns-meadow-switch-case-ns-oled-ns2', vendor: 'Kore Kawaii', domain: 'https://korekawaii.com', name: 'Kawaii Bunny Meadow Switch Case', cat: 'tech', character: '', price: 36.99, unit: 'from', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 15, couponCode: '', couponPct: 0, image: '', url: 'https://korekawaii.com/products/spring-bun-buns-meadow-switch-case-ns-oled-ns2', badge: '', added: '2026-07-23', variants: [], blurb: 'Protective, adorable case for your Switch. Kawaii lifestyle brand, 9,200+ reviews.' },
  { id: 'kore-kawaii-kittys-under-sakura-switch-2-case', vendor: 'Kore Kawaii', domain: 'https://korekawaii.com', name: 'Kawaii Kitty Sakura Switch Case', cat: 'tech', character: '', price: 39.99, unit: 'from', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 15, couponCode: '', couponPct: 0, image: '', url: 'https://korekawaii.com/products/kawaii-kittys-under-sakura-switch-2-case', badge: 'Switch 2', added: '2026-07-19', variants: [], blurb: 'Sakura season kitty Switch 2 case, cosy kawaii protection.' },
  { id: 'kore-kawaii-gamer-girl-pouch-bag', vendor: 'Kore Kawaii', domain: 'https://korekawaii.com', name: 'Kawaii Gamer Girl Pouch', cat: 'accessories', character: '', price: 24.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 15, couponCode: '', couponPct: 0, image: '', url: 'https://korekawaii.com/products/kawaii-gamer-girl-pouch-bag', badge: '', added: '2026-07-21', variants: [], blurb: 'Carry your gamer gear in style, cute pouch bag from Kore Kawaii.' },
  { id: 'hkc-hello-kitty-waterproof-cooking-apron-cute-pink-kitchen-wear', vendor: 'Hello Kitty Camp', domain: 'https://hellokittycamp.com', name: 'Hello Kitty Cooking Apron', cat: 'kitchen', character: 'hellokitty', price: 16.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 10, couponCode: 'JACOBKENNEDY', couponPct: 10, image: '', url: 'https://hellokittycamp.com/products/hello-kitty-waterproof-cooking-apron-cute-pink-kitchen-wear', badge: 'Sanrio', added: '2026-07-18', variants: [], blurb: 'Official Hello Kitty waterproof kitchen apron. Cute and practical.' },
  { id: 'hkc-hello-kitty-glass-cup-with-lid-straw-cute-cartoon-mug', vendor: 'Hello Kitty Camp', domain: 'https://hellokittycamp.com', name: 'Hello Kitty Glass Cup with Lid & Straw', cat: 'kitchen', character: 'hellokitty', price: 17.69, unit: '', onSale: true, wasPrice: 23.00, discountPct: 23, commissionPct: 10, couponCode: 'JACOBKENNEDY', couponPct: 10, image: '', url: 'https://hellokittycamp.com/products/hello-kitty-glass-cup-with-lid-straw-cute-cartoon-mug', badge: 'Sanrio', added: '2026-07-16', variants: [], blurb: 'Cute Hello Kitty glass cup with lid and straw, desk and kitchen kawaii.' },
  { id: 'hkc-chefmade-hello-kitty-kitchen-egg-white-yolk-separator-baking-accessories-bakery-tools', vendor: 'Hello Kitty Camp', domain: 'https://hellokittycamp.com', name: 'Hello Kitty Egg Separator Baking Tool', cat: 'kitchen', character: 'hellokitty', price: 14.50, unit: '', onSale: true, wasPrice: 19.99, discountPct: 27, commissionPct: 10, couponCode: 'JACOBKENNEDY', couponPct: 10, image: '', url: 'https://hellokittycamp.com/products/chefmade-hello-kitty-kitchen-egg-white-yolk-separator-baking-accessories-bakery-tools', badge: 'Sanrio', added: '2026-07-12', variants: [], blurb: 'Hello Kitty baking tool, separate eggs in the most adorable way.' },
  { id: 'sqb-sleek-slip-mini-collapsible-drinking-cup', vendor: 'Squishy Bottle', domain: 'https://stopshop9.myshopify.com', name: 'Sleek Slip Collapsible Drinking Cup', cat: 'kitchen', character: '', price: 12.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 25, couponCode: 'JACOBKENNEDY', couponPct: 15, image: '', url: 'https://stopshop9.myshopify.com/products/sleek-slip-mini-collapsible-drinking-cup', badge: '25% back', added: '2026-07-11', variants: [], blurb: 'Squeeze-flat collapsible travel cup, packs down small, pops back up.' },
  { id: 'sqb-stainless-steel-bamboo-thermo-coffee-flask', vendor: 'Squishy Bottle', domain: 'https://stopshop9.myshopify.com', name: 'Stainless Steel Bamboo Thermo Flask', cat: 'kitchen', character: '', price: 18.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 25, couponCode: 'JACOBKENNEDY', couponPct: 15, image: '', url: 'https://stopshop9.myshopify.com/products/stainless-steel-bamboo-thermo-coffee-flask', badge: '', added: '2026-07-09', variants: [], blurb: 'Eco bamboo & stainless flask that keeps drinks at temp for hours.' },
  { id: 'auto-miata-red', vendor: 'Autoplush', domain: 'https://autoplush.com', name: 'Miata MX5 Car Plushie', cat: 'plush', character: 'miata', price: 32.40, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://autoplush.com/products/miata-red', badge: '', added: '2026-07-24', variants: [], blurb: 'Soft, cuddly plush car with pop-up eyes. Made for car-loving kids & fans.' },
  { id: 'auto-miata-mx5-keychain', vendor: 'Autoplush', domain: 'https://autoplush.com', name: 'Miata MX5 Keychain', cat: 'accessories', character: 'miata', price: 14.90, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://autoplush.com/products/miata-mx5-keychain', badge: '', added: '2026-07-17', variants: [], blurb: 'Mini plush car keychain, pocket-sized car-culture cute.' },
  { id: 'auto-the-defender', vendor: 'Autoplush', domain: 'https://autoplush.com', name: 'The Defender Plushie', cat: 'plush', character: 'defender', price: 34.40, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://autoplush.com/products/the-defender', badge: '', added: '2026-07-15', variants: [], blurb: 'Boxy, rugged, and impossibly soft, the Defender reimagined as a plush.' },
  { id: 'auto-the-911', vendor: 'Autoplush', domain: 'https://autoplush.com', name: 'The 911 Plushie', cat: 'plush', character: 'the911', price: 19.90, unit: '', onSale: true, wasPrice: 36.00, discountPct: 45, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://autoplush.com/products/the-911', badge: '', added: '2026-07-13', variants: [], blurb: 'The iconic 911 shape, now soft and huggable. Big discount this week.' },
  { id: 'mont-routine-chart-for-toddlers-visual-schedule-board-for-kids', vendor: 'Montessori & Me', domain: 'https://montessoriandme.us', name: 'Routine Chart for Toddlers', cat: 'learning', character: '', price: 28.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 15, couponCode: '', couponPct: 0, image: '', url: 'https://montessoriandme.us/products/routine-chart-for-toddlers-visual-schedule-board-for-kids', badge: '4.87★ 498 reviews', added: '2026-07-25', variants: [], blurb: 'Visual schedule board for kids, builds independence and routine.' },
  { id: 'mint-mintie-snug-stainless-steel-lunch-box-b-stock', vendor: 'Mintie Lunchboxes', domain: 'https://mintielunchboxes.co.uk', name: 'Mintie Snug Stainless Steel Lunch Box', cat: 'kitchen', character: '', price: 22.00, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 10, couponCode: '', couponPct: 0, image: '', url: 'https://mintielunchboxes.co.uk/products/mintie-snug-stainless-steel-lunch-box-b-stock', badge: '4.97★ · 10yr guarantee', added: '2026-07-26', variants: [], blurb: 'Leak-proof stainless lunchbox, built to last a decade of school lunches.' },
  { id: 'jsd-felt-portable-tilting-puzzle-board-puzzle-table-with-drawers-and-cover-for-up-to-1000-pieces-puzzle-newly-upgrade', vendor: 'jigsawdepot', domain: 'https://jigsawdepot.com', name: 'Portable Tilting Puzzle Board & Table', cat: 'puzzle', character: '', price: 59.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 10, couponCode: '', couponPct: 0, image: '', url: 'https://jigsawdepot.com/products/felt-portable-tilting-puzzle-board-puzzle-table-with-drawers-and-cover-for-up-to-1000-pieces-puzzle-newly-upgrade', badge: 'Up to 1000pc', added: '2026-07-14', variants: [], blurb: 'Felt-lined puzzle table with drawers, keeps pieces sorted between sessions.' },
  { id: 'jsd-1000-piece-tilting-wooden-puzzle-board-with-4-drawers-cover', vendor: 'jigsawdepot', domain: 'https://jigsawdepot.com', name: '1000-Piece Wooden Puzzle Board', cat: 'puzzle', character: '', price: 49.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 10, couponCode: '', couponPct: 0, image: '', url: 'https://jigsawdepot.com/products/1000-piece-tilting-wooden-puzzle-board-with-4-drawers-cover', badge: '1000pc', added: '2026-07-27', variants: [], blurb: 'Classic family puzzle night, solid wooden board with 4 sorting drawers.' },
]

export function catName(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.name ?? 'Other'
}
export function catEmoji(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.emoji ?? '🌸'
}
export function vendorCfg(vendor: string): VendorConfig | undefined {
  return VENDORS.find((v) => v.vendor === vendor)
}
/**
 * Build an AWIN deep link to `url` for advertiser `merchantId`.
 *
 * Hoisted out of affiliateUrl() when the link showcases arrived, so that the
 * awin1.com URL shape has exactly one definition. Two copies of it would drift,
 * and the drift would be silent in the worst way: a link that still redirects
 * the shopper to the right page while crediting nobody. Nothing would error and
 * the money would simply not arrive.
 *
 * Returns the plain destination when either id is missing — untracked, but
 * never a broken link. That is the standing rule here: the shopper always gets
 * where they were going.
 */
export function awinDeepLink(url: string, merchantId: string): string {
  if (!url) return url
  if (!merchantId || !AWIN_PUBLISHER_ID) return url
  return (
    'https://www.awin1.com/cread.php' +
    `?awinmid=${encodeURIComponent(merchantId)}` +
    `&awinaffid=${encodeURIComponent(AWIN_PUBLISHER_ID)}` +
    `&ued=${encodeURIComponent(url)}`
  )
}

export function affiliateUrl(url: string, vendor: string): string {
  const cfg = vendorCfg(vendor)
  if (!url || !cfg) return url

  /**
   * ALREADY TRACKED LINKS PASS THROUGH UNTOUCHED.
   *
   * A product that came from an AWIN datafeed carries `aw_deep_link`, which is
   * an awin1.com redirect AWIN built. Wrapping it again would produce an
   * awin1.com link whose destination is another awin1.com link: the shopper
   * would still arrive, eventually, and the click would be attributed to the
   * OUTER hop only, so the inner one silently earns nothing. That is the
   * untracked-vendor failure wearing a working link as a disguise.
   */
  if (/^https?:\/\/(www\.)?awin1\.com\//i.test(url)) return url

  // AWIN advertisers: the commission is attributed by the redirect through
  // awin1.com, so the destination goes in `ued` and no query param is appended.
  if (cfg.awinMerchantId) return awinDeepLink(url, cfg.awinMerchantId)

  if (!cfg.affiliateParam) return url
  return url + (url.includes('?') ? '&' : '?') + cfg.affiliateParam
}

/** True when a vendor is set up to earn but is not yet configured to track. */
export function isUntrackedAwin(vendor: string): boolean {
  const cfg = vendorCfg(vendor)
  return Boolean(cfg?.awinMerchantId !== undefined && (!cfg?.awinMerchantId || !AWIN_PUBLISHER_ID))
}

/**
 * True when clicks to this vendor earn nothing, whatever the reason.
 *
 * `isUntrackedAwin` only ever looked at AWIN, and the gap that left is not
 * theoretical: Sydney Sock Project and Vix Socks between them put 466 products
 * on the shelf on 2026-08-11 with an empty `affiliateParam`, and every outbound
 * click since has been free traffic for the merchant. Nothing in the config or
 * the UI said so, because the only untracked-vendor test in the codebase
 * returned false for anything that was not AWIN.
 *
 * The link still works and the shopper still arrives — that is the deliberate
 * choice recorded on those entries, and this does not change it. It just makes
 * the state answerable, which is what `/api/catalog?debug` reports it from.
 */
export function isUntracked(vendor: string): boolean {
  const cfg = vendorCfg(vendor)
  if (!cfg) return false
  if (cfg.awinMerchantId !== undefined) return isUntrackedAwin(vendor)
  return !cfg.affiliateParam
}

/**
 * The vendors that actually get scraped. `pending` ones are registered but
 * unread, so they are skipped everywhere a catalogue is built — see the
 * `pending` doc on VendorConfig for how a vendor leaves this state.
 */
export function liveVendors(): VendorConfig[] {
  return VENDORS.filter((v) => !v.pending)
}

export function pendingVendors(): VendorConfig[] {
  return VENDORS.filter((v) => v.pending)
}

/** Vendors with a dedicated showcase page. */
export function showcaseVendors(): VendorConfig[] {
  return VENDORS.filter((v) => v.showcase)
}
export function couponWrapUrl(url: string, vendor: string): string {
  const cfg = vendorCfg(vendor)
  if (!cfg?.couponCode || !cfg?.couponPct || !url) return url
  const m = url.match(/^(https?:\/\/[^/]+)(\/.*)?$/)
  if (!m) return url
  return m[1] + '/discount/' + encodeURIComponent(cfg.couponCode) + '?redirect=' + encodeURIComponent(m[2] ?? '/')
}
export function shopUrl(product: Product): string {
  return couponWrapUrl(affiliateUrl(product.url || product.domain, product.vendor), product.vendor)
}
export function money(n: number): string {
  return '$' + Number(n).toFixed(2)
}
/**
 * Cutoff for the "NEW" badge, snapped to UTC midnight.
 *
 * Rounding matters for correctness, not tidiness: pages are prerendered and can
 * be served hours later, so a raw `Date.now()` let a product sitting near the
 * 14-day boundary count as new on the server and not on the client. That is a
 * hydration mismatch, and React answers a mismatch by discarding the server
 * HTML and re-rendering everything. Snapping to the day means both sides agree
 * for the whole UTC day.
 */
export function newItemCutoff(): number {
  const now = new Date()
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return utcMidnight - 14 * 86400000
}

export function isNewItem(p: Product): boolean {
  if (!p.added) return false
  return new Date(p.added).getTime() >= newItemCutoff()
}

export const PRICE_BUCKETS = [
  { key: 'u15', label: 'Under $15', min: 0, max: 15 },
  { key: '15-30', label: '$15–$30', min: 15, max: 30 },
  { key: '30-60', label: '$30–$60', min: 30, max: 60 },
  { key: '60up', label: '$60+', min: 60, max: Infinity },
]

export type AdaPick = {
  id: string
  name: string
  vendor: string
  cat: string
  price: number
  image: string
  url: string
  ts: number
}

/**
 * Curated picks that show in Ada's Picks by default for every visitor.
 * IDs match live catalog handles, so the rail hydrates real images/prices.
 */
export const DEFAULT_ADA_PICKS: AdaPick[] = [
  { id: 'auto-miata-red', name: 'Miata MX5 Car Plushie', vendor: 'Autoplush', cat: 'plush', price: 32.40, image: '', url: 'https://autoplush.com/products/miata-red', ts: 1000 },
  { id: 'kore-spring-bun-buns-meadow-switch-case-ns-oled-ns2', name: 'Kawaii Bunny Meadow Switch Case', vendor: 'Kore Kawaii', cat: 'tech', price: 36.99, image: '', url: 'https://korekawaii.com/products/spring-bun-buns-meadow-switch-case-ns-oled-ns2', ts: 900 },
  { id: 'plbl-14-inch-brown-plush-bunny', name: '14 Inch Brown Plush Bunny', vendor: 'Plushible', cat: 'plush', price: 12.99, image: '', url: 'https://plushible.com/products/14-inch-brown-plush-bunny', ts: 800 },
  { id: 'hkc-hello-kitty-glass-cup-with-lid-straw-cute-cartoon-mug', name: 'Hello Kitty Glass Cup with Lid & Straw', vendor: 'Hello Kitty Camp', cat: 'kitchen', price: 17.69, image: '', url: 'https://hellokittycamp.com/products/hello-kitty-glass-cup-with-lid-straw-cute-cartoon-mug', ts: 700 },
  { id: 'auto-skyline-r33', name: 'Skyline R34 Plushie', vendor: 'Autoplush', cat: 'plush', price: 32.40, image: '', url: 'https://autoplush.com/products/skyline-r33', ts: 600 },
  { id: 'mont-routine-chart-for-toddlers-visual-schedule-board-for-kids', name: 'Routine Chart for Toddlers', vendor: 'Montessori & Me', cat: 'learning', price: 28.99, image: '', url: 'https://montessoriandme.us/products/routine-chart-for-toddlers-visual-schedule-board-for-kids', ts: 500 },
]
