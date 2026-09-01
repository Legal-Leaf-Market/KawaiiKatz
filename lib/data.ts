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
  /**
   * The merchant's description at greater length, for SHOWCASE VENDORS ONLY.
   *
   * `blurb` is cut to 140 characters at scrape time and that is right for a
   * card in a grid of two thousand. It is wrong for a page about six products:
   * /everblog's cards offered a "read more" that revealed nothing, because
   * there was nothing more to reveal.
   *
   * Undefined everywhere else, on purpose. Next's data cache rejects an entry
   * over 2MB and Kore Kawaii already maps to 1.41MB (§4b), so a fuller
   * description on all 6,700 products would silently stop that vendor caching
   * and no error would say so. A showcase vendor is a handful of rows by
   * definition, which is exactly why it can afford prose.
   */
  details?: string
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
   * Which shop engine to READ. Not the same question as `network`, which is
   * who pays: a merchant can be on GoAffPro and run WooCommerce, and three of
   * them are.
   *
   * Omitted means Shopify, because eleven of twelve vendors are and defaulting
   * the other way would silently break all of them. 'woo' routes to the
   * WooCommerce Store API instead of products.json.
   *
   * It is stated rather than sniffed. Probing every vendor for every engine on
   * every build costs a round trip per door per vendor to learn something that
   * changes roughly never, and a sniffer that guesses wrong fails by scraping
   * nothing and reporting a healthy zero.
   */
  platform?: 'shopify' | 'woo' | 'ld'
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

  // Kawaii Unicorn. Joined GoAffPro 2026-08-30, and the tracking value is REAL:
  // Jacob's own link is https://kawaii-unicorn.com/?ref=kawaiikatz.
  //
  // Still `pending: true`, and §7 is why: clearing the flag needs BOTH halves,
  // a tracking value AND a feed somebody has read. This has the first. The
  // second cannot be done from a Claude Code container - the proxy refuses
  // merchant hosts - so it goes through §4's build-log probe recipe, and the
  // flag comes off in the commit that reads the numbers.
  //
  // The number to read first is the kid-safety drop count, not the category
  // split. This came off the decora shortlist, and §4 records what that filter
  // does to a decora wardrobe: `pleated skirt`, `thigh high`, `lace up`,
  // `chiffon` and `satin` are all in CUT_PHRASES and are also the plain
  // vocabulary of the clothes we signed them for.
  // LIVE 2026-08-30. Probed from a build log (§4): 1,234 products map cleanly
  // across apparel 589, plush 151, home 124, accessories 114, collect 62,
  // stationery 46, puzzle 39. The kid-safety number, which is the one to read
  // first: 703 in scanned categories, **8** dropped. That is the cleanest feed
  // any vendor has returned.
  //
  // NO `include` LIST, and §4 says why: the feed carries empty product_types,
  // and an include list cannot reach an empty type, so writing one would
  // silently delete that share of the shelf. MamaRaya is the worked example.
  //
  // It is a UNICORN shop - rainbow bedding, onesies, lamps, headbands - so it
  // is general kawaii and belongs on the main grid, not in the decora room.
  { vendor: 'Kawaii Unicorn', domain: 'https://kawaii-unicorn.com', prefix: 'kuni', affiliateParam: 'ref=kawaiikatz', network: 'goaffpro', commissionPct: 15, couponCode: '', couponPct: 0 },

  // KawaiiMoriStore. Joined GoAffPro the same sitting, same real tracking value
  // (https://shop.kawaiimoristore.com/?ref=kawaiikatz). Same pending rule.
  //
  // NOTE the `shop.` subdomain: that is where its storefront lives, so it is
  // where products.json must be read from, and the apex would answer for a
  // different site. §4c's lesson about reading the response body rather than
  // the status applies here more than usual.
  // LIVE 2026-08-30, and it is a J-FASHION shop rather than a kawaii one, which
  // the listing did not say and the feed did: Clothing Tops 520, Dresses 304,
  // Skirts 277, and titles reading "Sweet Princess Lolita", "Dawn Keeper Lolita
  // Skirt", "Sweet Jirai Kei Set", "Prince Ouji Set", "Cyberpunk Hooded Jacket".
  // That is the decora room's vocabulary, so it is a SOURCE_SHOPS entry as well
  // as a main-grid vendor. 943 of 1,250 survive mapping.
  //
  // HITS THE 5-PAGE CAP, like Kore Kawaii and Kawaii Babe, so part of this
  // catalogue has never been ingested (§4).
  //
  // 156 of 784 are dropped by the kid-safety phrase filter, which is 20% and is
  // the highest of any vendor here. Read that before assuming it is a bug: the
  // phrases are "lace up" (37), "high waist" (37), "slit" (20), "camisole" (12),
  // "halter" (11), "chiffon", "satin", "pleated skirt". §4 records exactly this
  // - CUT_PHRASES is tuned for suggestive cuts and that is also, word for word,
  // the vocabulary of a lolita wardrobe. It is the filter working as written.
  // A genuine false positive gets a narrow KID_SAFE entry, never a loosened
  // CUT_PHRASES (§7).
  { vendor: 'KawaiiMoriStore', domain: 'https://shop.kawaiimoristore.com', prefix: 'kmori', affiliateParam: 'ref=kawaiikatz', network: 'goaffpro', commissionPct: 10, couponCode: '', couponPct: 0 },

  // Kawaii mood. Tracking is real (https://kawaiimood.com/?ref=kawaiikatz) and
  // the shop is NOT. Probed 2026-08-30:
  //
  //   HTTP 402, server: cloudflare, body: {"errors":"Unavailable Shop"}
  //
  // That is a FROZEN Shopify store, which §4c spells out as distinct from a 404
  // (no store at all) and from a 403 interstitial (Cloudflare bot rule). The
  // affiliate dashboard shows it as an approved partner in good standing, which
  // is exactly the gap `pending` exists to cover. Nobody saw a vendor with no
  // products because it never went live.
  //
  // Left pending rather than deleted: a frozen store can be unfrozen, and the
  // approval survives. Re-probe before writing it off (§4).
  { vendor: 'Kawaii mood', domain: 'https://kawaiimood.com', prefix: 'kmood', affiliateParam: 'ref=kawaiikatz', network: 'goaffpro', commissionPct: 10, couponCode: '', couponPct: 0, pending: true },

  // THE ANIME CLUSTER, 2026-08-31. Five GoAffPro programmes approved in one
  // afternoon, and the ANIME_SHOPS doc further down carries the full reasoning:
  // one operator, five keyword domains, one identical rate on one identical
  // window, niched by product rather than by branding.
  //
  // ON THE MAIN GRID, not only on /anime. Anime bedding, backpacks, jackets,
  // kimono and jigsaws are all things this catalogue already sells in other
  // forms, so keeping them off the main feed would be filing them by supplier
  // rather than by what they are, which is the one thing a browse-first
  // catalogue must never do.
  //
  // EVERY ONE IS PENDING AND NONE HAS AN `include` LIST, because nobody has
  // read a single one of these feeds. §4's rule, and the reason for it is the
  // reason it is a rule: guess too wide and the shelf fills with gift cards,
  // guess too narrow and the vendor matches nothing and reads as a shop with
  // no stock. `platform` is unconfirmed too. GoAffPro is overwhelmingly a
  // Shopify app, which makes products.json likely and does not make it true.
  //
  // THE TRACKING VALUE IS THE SISTER SITE'S. `verdastudio` is the code these
  // merchants issued, and they issued it to the Verda Studio account. It pays
  // the same person; what it cannot do is tell the two sites apart in
  // reporting. Every other GoAffPro row above carries `ref=kawaiikatz`. One
  // form per merchant from this account fixes it, one line each.
  //
  // animeswimsuit.com is the sixth and is deliberately absent. See ANIME_SHOPS.
    // READ 2026-09-01 through the real mapper, 4 pages, 353 rows in the feed,
  // 351 surviving. Categories are franchise names end to end: Ghibli, Jujutsu
  // Kaisen, Haikyuu, Dragon Ball, My Hero Academia, Naruto, One Piece, Demon
  // Slayer, Tokyo Ghoul, Attack on Titan. $17.99 to $138, median $99.89.
  //
  // NO include LIST, deliberately. The categories here are franchises rather
  // than product types, and a new series arrives every season: an allow-list
  // would silently hide new stock and read as a shop that stopped restocking.
  // The shop sells exactly one kind of thing, so there is nothing to allow-list
  // against.
  //
  // forceCat BECAUSE THE CLASSIFIER SCATTERED IT. 323 of 351 landed in `home`
  // and the rest did not: 11 in apparel, 10 in stationery, 2 in plush, one each
  // in puzzle and food. Every one of them is a duvet. "Demon Slayer Bedding -
  // Kamado Tanjiro Nezuko Soft Bedding" was filed as stationery. The vendor is
  // what disambiguates when a word cannot, same call as jigsawdepot and
  // Montessori & Me.
  { vendor: 'Anime Bedding', domain: 'https://animebed.com', platform: 'woo', forceCat: 'home', prefix: 'abed', affiliateParam: 'ref=verdastudio', network: 'goaffpro', commissionPct: 15, couponCode: '', couponPct: 0 },
  { vendor: 'Anime Backpacks', domain: 'https://animebackpack.com', platform: 'ld', forceCat: 'accessories', prefix: 'abpk', affiliateParam: 'ref=verdastudio', network: 'goaffpro', commissionPct: 15, couponCode: '', couponPct: 0, pending: true },
    // READ 2026-09-01, 9 pages, 822 rows, 715 surviving. The 107 dropped are the
  // adult-apparel text filter doing its job on a garment catalogue, which is
  // the highest count of any vendor here and is expected on this category.
  // $39.95 to $125.95, median $59.95.
  //
  // forceCat FOR THE SAME REASON AS THE BEDDING SHOP: 639 of 715 reached
  // apparel on their own and the strays went somewhere indefensible, 45 into
  // tech and 18 into plush. A Pokemon bomber jacket is not a gadget.
  //
  // IT ALSO PUTS 715 GARMENT PHOTOS INTO THE coco-ssd SCAN QUEUE, because
  // `apparel` is one of MODEL_SCAN_CATS, and that is a real trade rather than a
  // free win. The scan is budgeted at 35 seconds and fails open, so the build
  // cannot hang on it; what happens instead is that the same budget now covers
  // far more images, so a smaller share of EVERY apparel vendor's photos gets
  // scanned. Not a safety hole, because the text filter is the backstop and
  // already removed 107 rows from this vendor on its own, but the image layer
  // is thinner across the site than it was. Raise budgetMs in catalog-source if
  // that stops being an acceptable trade.
  { vendor: 'Anime Jacket', domain: 'https://animejacket.com', platform: 'woo', forceCat: 'apparel', prefix: 'ajkt', affiliateParam: 'ref=verdastudio', network: 'goaffpro', commissionPct: 15, couponCode: '', couponPct: 0 },
  { vendor: 'Anime Kimono', domain: 'https://animekimono.com', platform: 'ld', forceCat: 'apparel', prefix: 'akim', affiliateParam: 'ref=verdastudio', network: 'goaffpro', commissionPct: 15, couponCode: '', couponPct: 0, pending: true },
    // READ 2026-09-01, 4 pages, 391 rows, 379 surviving. The cleanest of the
  // three by a distance: 366 of 379 classify as `puzzle` unaided, so NO
  // forceCat, and `puzzle` is a kid-native category so only 3 rows lack
  // positive kid-safety evidence against 275 and 561 on the other two.
  //
  // IT ALSO CARRIED THE ONE THING THAT HAD NO BUSINESS HERE: a 100cm replica
  // katana at $124, uncategorised, which would have sat on a kid-facing shelf
  // between two Ghibli jigsaws. It is blocked by the replica-weapon rule in
  // catalog-shared rather than by an include list here, because the problem is
  // not this shop's taxonomy, it is that no shop on this site should ever be
  // able to list a replica weapon.
  { vendor: 'Anime Puzzles', domain: 'https://animepuzzle.com', platform: 'woo', prefix: 'apzl', affiliateParam: 'ref=verdastudio', network: 'goaffpro', commissionPct: 15, couponCode: '', couponPct: 0 },

  // Everblog US. AWIN 128579, joined 2026-08-31, 10% on a 30-day cookie.
  //
  // NOT KAWAII, and researched before it was added rather than after. It is a
  // real product with a real reputation: FridgeCal 13.4" at $239 and HomeCal
  // 21.5" at $349, no subscription, 4.7/5 across 358 Trustpilot reviews, and
  // reviewed by Notebookcheck, The Gadgeteer, TWICE and Poc Network. Its own
  // /products/ and /collections/ URLs say Shopify, so unlike GiftLAB it should
  // be readable.
  //
  // The FIT is the open question and it is not the usual one. This is not a
  // cute product, and $239 next to a $12 plushie on the main grid would look
  // like a mis-click. But the site already runs a thread of parent-facing
  // stock - MamaRaya's baby gifts, Montessori & Me's routine charts - and this
  // is a chore-and-rewards board for families. So the honest home is a SHOWCASE
  // page (VendorConfig.showcase, as BRKOX and GiftLAB have), never a row in the
  // grid.
  //
  // Two things to watch, neither disqualifying. The programme launched
  // 2026-07-16 and its terms were revised hours before we joined, so it is six
  // weeks old; and its AWIN ShopWindow reads "Total Products 0, Last Updated
  // Never", which is the merchant not having set up their datafeed. We scrape
  // products.json directly, so that costs us nothing, but it is a sign of how
  // new the programme is. Auto-validation is 45 days, so a first payment is a
  // long way out.
  //
  // The programme names a code, EVER10, and it is deliberately NOT in
  // couponCode: the terms say it may be promoted but never say what it takes
  // off. A code shown beside "saves 0%" is worse than no code, and inventing a
  // percentage is the one thing this file must not do.
  //
  // LIVE 2026-08-31 on Jacob's call, unprobed. §7 wants a read feed AND real
  // tracking; this has the tracking and the research (a Shopify storefront, 358
  // Trustpilot reviews, four independent hardware reviews) but not the feed.
  // The risk that buys is small and known: if products.json does not answer,
  // getCatalog skips the vendor silently and nothing appears, which is the
  // benign half of the failure modes. The probe still lists it and reads it on
  // the next build, so the number arrives either way.
  {
    vendor: 'Everblog US',
    domain: 'https://everblog.com',
    prefix: 'ever',
    affiliateParam: '',
    awinMerchantId: '128579',
    network: 'awin',
    commissionPct: 10,
    couponCode: '',
    couponPct: 0,
    // A SHOWCASE, which also holds it out of the main grid: useLiveCatalog
    // keeps showcase vendors out of `products` precisely because they have a
    // room of their own. That is the point here. A $349 wall calendar sitting
    // between a $12 plushie and a pencil case reads as a mis-click, and the
    // grid is the one surface whose whole job is looking coherent.
    showcase: {
      slug: 'everblog',
      emoji: '📅',
      tagline: 'The family calendar on the fridge, for the people buying the plushies',
      intro:
        'Everblog make a digital calendar that hangs on the fridge or the wall and keeps a ' +
        'household straight: everyone gets a profile, chores turn into stars, and the shopping ' +
        'list stops living on four different phones. It is not kawaii and it is not pretending ' +
        'to be. It is here because the person buying a plushie for a seven year old is usually ' +
        'the person running the seven year old\'s week.',
    },
  },

  // Egirldoll. Fourth of the sitting, tracking real
  // (https://egirldoll.com/?ref=kawaiikatz).
  //
  // THIS ONE NEEDS A JUDGEMENT AND NOT JUST A PROBE, and the prospect note said
  // so before it was signed: "the aesthetic needs Ada's eye before it goes near
  // a page aimed at tweens". E-girl and alt fashion sit next to the decora room
  // rather than in it, and this site's own kid-safe toggle exists because a
  // parent is trusting it.
  //
  // So the probe answers whether it is INGESTABLE. Whether it belongs is Ada
  // and Jacob's call on the actual photographs, the way Autoplush was decided
  // (§4f-b): a brand question, not a technical one, and the highest commission
  // rate on the site did not save that one.
  //
  // PROBED 2026-08-31, and it is the most ingestable feed of the whole intake:
  // 1,250 rows (it HITS the 5-page cap, so this is a floor and not a count),
  // 951 survive mapping, and the product_type histogram is a proper merchant
  // taxonomy rather than the empty column MamaRaya had. It is also, on the
  // numbers, a clothes shop and nothing else: 789 of 951 land in `apparel`,
  // and Clothing Tops + Dresses + Skirts alone are 1,106 of the raw feed.
  //
  // THE FILTER NUMBER IS THE ONE TO READ, and §4 says to read it first on any
  // J-fashion vendor: 148 of 799 would be dropped by the kid-safety phrase
  // filter, 19%. That is the highest share of any vendor here (KawaiiMoriStore
  // was 156 of 784 and Kawaii Unicorn 8 of 703), and the leading terms are
  // "high waist" (43), "lace up" (28) and "camisole" (15) - the plain
  // vocabulary of a lolita wardrobe, so the filter is working as written and
  // NOT to be loosened for it (§7).
  //
  // It stays pending. Nothing technical is blocking it now; the open question
  // is the one the note above states, and it is not a question code answers.
  { vendor: 'Egirldoll', domain: 'https://egirldoll.com', prefix: 'egd', affiliateParam: 'ref=kawaiikatz', network: 'goaffpro', commissionPct: 10, couponCode: '', couponPct: 0, pending: true },

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
  // Same distinction Best of Kawaii used to carry (it is in PARTNERS_REJECTED
  // now, confirmed dead twice): unreadable is not the same as dead. If
  // the shop is live in a browser it is a §4c showcase-or-nothing candidate,
  // never a VENDORS row. But settle the licensing question FIRST, because it
  // decides whether we want them at all and costs nothing to check.

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
  //      dropshipper holds those four licences at once. Same concern
  //      Minecraft Plushies raised, and it lands harder here because /learn
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

  // Third AWIN partner (approved 2026-08-30). Personalised photo gifts: custom
  // face socks and aprons, photo AirPod cases, printed blankets and puzzles.
  //
  // ON ITS OWN PAGE, AND THAT IS THE WHOLE REASON IT IS HERE AT ALL.
  //
  // The feed was read in full before this row existed, and on kawaii signal it
  // fails outright: of 2,387 mapped products, ZERO contain "kawaii", zero
  // "plush", zero "Sanrio", and 31 contain "cute". 699 land in `other` because
  // categorize() has no rule for personalised photo gifts. Dropped into the
  // main grid it would make a third of the catalogue not-kawaii.
  //
  // So it does not go in the main grid. It gets a showcase, for exactly the
  // reason BRKOX has one: a real partner whose stock is a different shape from
  // the shelf, given a room of its own rather than scattered through a grid of
  // plushies where it would help nobody. BRKOX is currently the best-performing
  // thing this site puts on Pinterest, which is the evidence that the shape
  // works.
  //
  // It cannot be trimmed with `include`: product_type is EMPTY on all 2,426
  // feed rows (§4), so an allow-list can reach none of them.
  //
  // STILL `pending` UNTIL THE FEED ACTUALLY FETCHES FROM A SERVER. It shipped
  // once already on 2026-08-30 and produced `fetched: 0`, because the URLs
  // supplied were ui.awin.com/productdata-darwin-download/..., and ui.awin.com
  // is the logged-in dashboard. The API host is productdata.awin.com. The
  // reader itself is proven: handed the real 2,426-row file it parsed every row
  // and mapped 2,387. Only the URL is unresolved.
  {
    vendor: 'GiftLAB',
    domain: 'https://www.giftlab.com',
    prefix: 'glab',
    affiliateParam: '',
    network: 'awin',
    awinMerchantId: '95201',
    commissionPct: 0,
    couponCode: '',
    couponPct: 0,
    pending: true,
    showcase: {
      slug: 'giftlab',
      emoji: '🎁',
      tagline: 'Put a face on it: personalised photo gifts, printed to order',
      intro:
        'GiftLAB print your photos onto things people actually use. Custom face socks and aprons, ' +
        'photo AirPod cases, printed blankets, puzzles and keyrings. Not kawaii, and not pretending ' +
        'to be, which is why it has a room of its own: this is the shelf for the gift that only ' +
        'works because it is unmistakably about one person.',
    },
  },

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

/**
 * THE ANIME HALL — /anime.
 *
 * A third shape, and it exists because neither of the first two fits.
 * `VendorConfig.showcase` (BRKOX) renders scraped products and needs a feed we
 * have read. `LinkShowcase` (Claire's, Smiggle) is one merchant per page and is
 * hard-wired to AWIN's redirect. What arrived on 2026-08-31 is five approved
 * GoAffPro merchants who belong together on ONE page and whose catalogues
 * nobody has read.
 *
 * WHY ONE PAGE AND NOT FIVE. They are one operator. The sister site's registry
 * spotted the pattern before a single application went in, and the approvals
 * confirmed it with data: five programmes, five keyword domains, and every one
 * of them paying an identical rate on an identical window. Five separate brand
 * pages would present one supplier as five partners, which is the failure that
 * makes a comparison site worthless. One hall presents it as what it is: a
 * cluster of anime shops, each holding a different shelf.
 *
 * WHY NO PRODUCTS AND NO DEEP LINKS. Every link here points at a merchant's
 * home page, and that is deliberate rather than lazy. The only URL on these
 * five domains that is certain to exist is the one their affiliate programme is
 * attached to. Nothing in this container can reach them to check anything
 * deeper, so a curated `/collections/...` link would be a guess, and a guessed
 * deep link does not degrade politely: it 404s in front of a shopper who
 * already trusted us enough to click. Sections get added when somebody has
 * opened the shops in a real browser, and not before.
 *
 * WHY THE SWIMWEAR SHOP IS NOT HERE, AND MUST NOT BE ADDED LATER. The cluster
 * has six domains and this page carries five. `animeswimsuit.com` was left off
 * by Jacob's own call on 2026-08-31, and the reasoning is the whole reason this
 * site has a `CUT_PHRASES` list at all: Kawaii Katz is the kid-facing sibling.
 * The phrase filter cannot help here, because it screens ingested product
 * titles and nothing on this page is ingested. A human deciding which shops to
 * name IS the filter on a page of hand-written links, and it has already been
 * applied. Do not "complete the set".
 *
 * THE TRACKING CODE IS THE SISTER SITE'S, AND THAT IS A KNOWN COST.
 * `ref=verdastudio` is the code these five merchants issued, and they issued it
 * to the Verda Studio account. It pays, and it pays the same person. What it
 * does not do is separate the two sites' earnings: a sale driven from here
 * lands in Verda Studio's GoAffPro reporting, so neither dashboard can answer
 * "which site earned this". Every other GoAffPro row on this site carries
 * `ref=kawaiikatz` for exactly that reason.
 *
 * The fix is one form per merchant from the Kawaii Katz account and then one
 * line per shop below. Until then the choice is between merged reporting and
 * handing five merchants free traffic, and the sock vendors already settled
 * which of those is worse: 466 products with an empty `affiliateParam` earned
 * nothing at all, and nothing in the UI said so.
 */
export type AnimeShop = {
  key: string
  merchant: string
  /** Home page. The one URL on this domain we know exists. */
  domain: string
  emoji: string
  /** Two or three words. Sits under the name. */
  tagline: string
  blurb: string
  /** What is actually on their shelves. Chips, not links. */
  shelves: string[]
  /**
   * Query param appended to the destination, GoAffPro's `?ref=` shape. Empty
   * means the link earns nothing, and the page says so rather than hiding it.
   */
  affiliateParam: string
  /** Tailwind-ready accent, so the five cards read as five shops. */
  accent: string
}

export const ANIME_SHOPS: AnimeShop[] = [
  {
    key: 'animebed',
    merchant: 'Anime Bedding',
    domain: 'https://animebed.com',
    emoji: '🛏️',
    tagline: 'Your favourite series, at duvet scale',
    blurb:
      'Duvet covers, pillowcases and full bedding sets printed with anime art. It is the ' +
      'biggest surface in a bedroom and the one nobody thinks to decorate, which is why a ' +
      'set here changes a room more than anything else on this page.',
    shelves: ['Duvet covers', 'Bedding sets', 'Pillowcases', 'Throw blankets'],
    affiliateParam: 'ref=verdastudio',
    accent: '#b79cff',
  },
  {
    key: 'animebackpack',
    merchant: 'Anime Backpacks',
    domain: 'https://animebackpack.com',
    emoji: '🎒',
    tagline: 'School bags with a fandom on them',
    blurb:
      'Backpacks, rucksacks and shoulder bags in anime prints. The one item on this page ' +
      'that gets used every single day, which makes it the one where the print actually ' +
      'has to be good.',
    shelves: ['Backpacks', 'School bags', 'Shoulder bags', 'Drawstring bags'],
    affiliateParam: 'ref=verdastudio',
    accent: '#7fc4d4',
  },
  {
    key: 'animejacket',
    merchant: 'Anime Jacket',
    domain: 'https://animejacket.com',
    emoji: '🧥',
    tagline: 'Bombers, hoodies and varsity coats',
    blurb:
      'Jackets and hoodies built around anime artwork rather than a logo slapped on a ' +
      'blank. Bomber and varsity cuts, embroidered as often as printed.',
    shelves: ['Bomber jackets', 'Hoodies', 'Varsity coats', 'Windbreakers'],
    affiliateParam: 'ref=verdastudio',
    accent: '#ff8a65',
  },
  {
    key: 'animekimono',
    merchant: 'Anime Kimono',
    domain: 'https://animekimono.com',
    emoji: '👘',
    tagline: 'Haori, yukata and kimono cardigans',
    blurb:
      'The loose open-front layer that goes over everything else, in anime prints and in ' +
      'plain traditional patterns. The most wearable piece of costume on this page: it ' +
      'reads as a cardigan anywhere that is not a convention.',
    shelves: ['Haori jackets', 'Yukata', 'Kimono cardigans', 'Obi belts'],
    affiliateParam: 'ref=verdastudio',
    accent: '#f2a2c0',
  },
  {
    key: 'animepuzzle',
    merchant: 'Anime Puzzles',
    domain: 'https://animepuzzle.com',
    emoji: '🧩',
    tagline: 'Key art, one thousand pieces at a time',
    blurb:
      'Jigsaws printed with anime key art, mostly in the 300 to 1000 piece range. A poster ' +
      'you have to earn, and the quietest thing on this page by a distance.',
    shelves: ['1000 piece', '500 piece', 'Kids puzzles', 'Poster art'],
    affiliateParam: 'ref=verdastudio',
    accent: '#8fd0a8',
  },
]

/** Append a shop's tracking param to one of its URLs. Empty param = untouched. */
export function animeShopUrl(shop: AnimeShop, url?: string): string {
  const dest = url || shop.domain
  if (!shop.affiliateParam) return dest
  return dest + (dest.includes('?') ? '&' : '?') + shop.affiliateParam
}

/** True when every shop on the hall is tracked, i.e. the page earns. */
export function animeHallTracked(): boolean {
  return ANIME_SHOPS.every((s) => Boolean(s.affiliateParam))
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

/**
 * Which vendor a product id belongs to, read off its prefix.
 *
 * Ids are minted as `<prefix>-<handle>` in mapShopifyProducts, so the prefix is
 * already a vendor key and nothing new has to be stored to use it. Matched
 * longest-first because the prefixes are not a fixed length and `k` prefixes
 * overlap: `kore-`, `kbabe-`, `kshop-`, `kmori-`, `kuni-`, `kslime-`, `kfs-`.
 *
 * Returns undefined for an id that matches nothing, and the one caller treats
 * that as "build the whole catalogue" rather than as an error.
 */
const PREFIXES_LONGEST_FIRST = [...VENDORS]
  .sort((a, b) => b.prefix.length - a.prefix.length)

export function vendorForId(id: string): string | undefined {
  return PREFIXES_LONGEST_FIRST.find((v) => id.startsWith(v.prefix + '-'))?.vendor
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

