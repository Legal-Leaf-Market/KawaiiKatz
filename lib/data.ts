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
  { vendor: 'Montessori & Me', domain: 'https://montessoriandme.us', prefix: 'mont', affiliateParam: 'ref=kawaiikatz', commissionPct: 15, couponCode: '', couponPct: 0 },
  { vendor: 'Mintie Lunchboxes', domain: 'https://mintielunchboxes.co.uk', prefix: 'mint', affiliateParam: 'ref=kawaiikatz', commissionPct: 10, couponCode: '', couponPct: 0 },
  { vendor: 'jigsawdepot', domain: 'https://jigsawdepot.com', prefix: 'jsd', affiliateParam: 'ref=kawaiikatz', commissionPct: 10, couponCode: '', couponPct: 0 },
  // First AWIN partner. They approached us. Display frames and cases for LEGO
  // builds — pricier and more grown-up than the rest of the catalogue, which is
  // exactly why they get their own showcase instead of being scattered through
  // a grid of plushies where nobody would find them.
  {
    vendor: 'BRKOX',
    domain: 'https://brkox.com',
    prefix: 'brkox',
    affiliateParam: '',
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
        'BRKOX makes wall frames, acrylic cases and LED kits built to fit specific LEGO® sets — ' +
        'Star Wars, F1, Technic, Harry Potter and more. Finished builds deserve better than a shelf ' +
        'they slowly gather dust on, so we gave them a room of their own.',
    },
  },
]

export const SEED_PRODUCTS: Product[] = [
  { id: 'plbl-14-inch-brown-plush-bunny', vendor: 'Plushible', domain: 'https://plushible.com', name: 'Poppy the Plush Unicorn', cat: 'plush', character: '', price: 12.99, unit: 'from', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://plushible.com/products/14-inch-brown-plush-bunny', badge: '', added: '2026-07-22', variants: [{ id: 'seed-plbl-1', title: '10 in', price: 12.99, available: true }, { id: 'seed-plbl-2', title: '34 in Jumbo', price: 49.99, available: true }], blurb: 'Soft huggable plush bunny. A classic cuddle buddy for all ages.' },
  { id: 'plbl-manhattan-toy-kreecher-pillow', vendor: 'Plushible', domain: 'https://plushible.com', name: 'Pawley the Plush Pillow Pal', cat: 'plush', character: '', price: 15.29, unit: '', onSale: true, wasPrice: 17.99, discountPct: 15, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://plushible.com/products/manhattan-toy-kreecher-pillow', badge: '', added: '2026-07-20', variants: [], blurb: 'Classic pillow pal plush — timeless and squishy-soft.' },
  { id: 'kore-spring-bun-buns-meadow-switch-case-ns-oled-ns2', vendor: 'Kore Kawaii', domain: 'https://korekawaii.com', name: 'Kawaii Bunny Meadow Switch Case', cat: 'tech', character: '', price: 36.99, unit: 'from', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 15, couponCode: '', couponPct: 0, image: '', url: 'https://korekawaii.com/products/spring-bun-buns-meadow-switch-case-ns-oled-ns2', badge: '', added: '2026-07-23', variants: [], blurb: 'Protective, adorable case for your Switch. Kawaii lifestyle brand, 9,200+ reviews.' },
  { id: 'kore-kawaii-kittys-under-sakura-switch-2-case', vendor: 'Kore Kawaii', domain: 'https://korekawaii.com', name: 'Kawaii Kitty Sakura Switch Case', cat: 'tech', character: '', price: 39.99, unit: 'from', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 15, couponCode: '', couponPct: 0, image: '', url: 'https://korekawaii.com/products/kawaii-kittys-under-sakura-switch-2-case', badge: 'Switch 2', added: '2026-07-19', variants: [], blurb: 'Sakura season kitty Switch 2 case — cosy kawaii protection.' },
  { id: 'kore-kawaii-gamer-girl-pouch-bag', vendor: 'Kore Kawaii', domain: 'https://korekawaii.com', name: 'Kawaii Gamer Girl Pouch', cat: 'accessories', character: '', price: 24.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 15, couponCode: '', couponPct: 0, image: '', url: 'https://korekawaii.com/products/kawaii-gamer-girl-pouch-bag', badge: '', added: '2026-07-21', variants: [], blurb: 'Carry your gamer gear in style — cute pouch bag from Kore Kawaii.' },
  { id: 'hkc-hello-kitty-waterproof-cooking-apron-cute-pink-kitchen-wear', vendor: 'Hello Kitty Camp', domain: 'https://hellokittycamp.com', name: 'Hello Kitty Cooking Apron', cat: 'kitchen', character: 'hellokitty', price: 16.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 10, couponCode: 'JACOBKENNEDY', couponPct: 10, image: '', url: 'https://hellokittycamp.com/products/hello-kitty-waterproof-cooking-apron-cute-pink-kitchen-wear', badge: 'Sanrio', added: '2026-07-18', variants: [], blurb: 'Official Hello Kitty waterproof kitchen apron. Cute and practical.' },
  { id: 'hkc-hello-kitty-glass-cup-with-lid-straw-cute-cartoon-mug', vendor: 'Hello Kitty Camp', domain: 'https://hellokittycamp.com', name: 'Hello Kitty Glass Cup with Lid & Straw', cat: 'kitchen', character: 'hellokitty', price: 17.69, unit: '', onSale: true, wasPrice: 23.00, discountPct: 23, commissionPct: 10, couponCode: 'JACOBKENNEDY', couponPct: 10, image: '', url: 'https://hellokittycamp.com/products/hello-kitty-glass-cup-with-lid-straw-cute-cartoon-mug', badge: 'Sanrio', added: '2026-07-16', variants: [], blurb: 'Cute Hello Kitty glass cup with lid and straw — desk and kitchen kawaii.' },
  { id: 'hkc-chefmade-hello-kitty-kitchen-egg-white-yolk-separator-baking-accessories-bakery-tools', vendor: 'Hello Kitty Camp', domain: 'https://hellokittycamp.com', name: 'Hello Kitty Egg Separator Baking Tool', cat: 'kitchen', character: 'hellokitty', price: 14.50, unit: '', onSale: true, wasPrice: 19.99, discountPct: 27, commissionPct: 10, couponCode: 'JACOBKENNEDY', couponPct: 10, image: '', url: 'https://hellokittycamp.com/products/chefmade-hello-kitty-kitchen-egg-white-yolk-separator-baking-accessories-bakery-tools', badge: 'Sanrio', added: '2026-07-12', variants: [], blurb: 'Hello Kitty baking tool — separate eggs in the most adorable way.' },
  { id: 'sqb-sleek-slip-mini-collapsible-drinking-cup', vendor: 'Squishy Bottle', domain: 'https://stopshop9.myshopify.com', name: 'Sleek Slip Collapsible Drinking Cup', cat: 'kitchen', character: '', price: 12.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 25, couponCode: 'JACOBKENNEDY', couponPct: 15, image: '', url: 'https://stopshop9.myshopify.com/products/sleek-slip-mini-collapsible-drinking-cup', badge: '25% back', added: '2026-07-11', variants: [], blurb: 'Squeeze-flat collapsible travel cup — packs down small, pops back up.' },
  { id: 'sqb-stainless-steel-bamboo-thermo-coffee-flask', vendor: 'Squishy Bottle', domain: 'https://stopshop9.myshopify.com', name: 'Stainless Steel Bamboo Thermo Flask', cat: 'kitchen', character: '', price: 18.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 25, couponCode: 'JACOBKENNEDY', couponPct: 15, image: '', url: 'https://stopshop9.myshopify.com/products/stainless-steel-bamboo-thermo-coffee-flask', badge: '', added: '2026-07-09', variants: [], blurb: 'Eco bamboo & stainless flask that keeps drinks at temp for hours.' },
  { id: 'auto-miata-red', vendor: 'Autoplush', domain: 'https://autoplush.com', name: 'Miata MX5 Car Plushie', cat: 'plush', character: 'miata', price: 32.40, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://autoplush.com/products/miata-red', badge: '', added: '2026-07-24', variants: [], blurb: 'Soft, cuddly plush car with pop-up eyes. Made for car-loving kids & fans.' },
  { id: 'auto-miata-mx5-keychain', vendor: 'Autoplush', domain: 'https://autoplush.com', name: 'Miata MX5 Keychain', cat: 'accessories', character: 'miata', price: 14.90, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://autoplush.com/products/miata-mx5-keychain', badge: '', added: '2026-07-17', variants: [], blurb: 'Mini plush car keychain — pocket-sized car-culture cute.' },
  { id: 'auto-the-defender', vendor: 'Autoplush', domain: 'https://autoplush.com', name: 'The Defender Plushie', cat: 'plush', character: 'defender', price: 34.40, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://autoplush.com/products/the-defender', badge: '', added: '2026-07-15', variants: [], blurb: 'Boxy, rugged, and impossibly soft — the Defender reimagined as a plush.' },
  { id: 'auto-the-911', vendor: 'Autoplush', domain: 'https://autoplush.com', name: 'The 911 Plushie', cat: 'plush', character: 'the911', price: 19.90, unit: '', onSale: true, wasPrice: 36.00, discountPct: 45, commissionPct: 20, couponCode: '', couponPct: 0, image: '', url: 'https://autoplush.com/products/the-911', badge: '', added: '2026-07-13', variants: [], blurb: 'The iconic 911 shape, now soft and huggable. Big discount this week.' },
  { id: 'mont-routine-chart-for-toddlers-visual-schedule-board-for-kids', vendor: 'Montessori & Me', domain: 'https://montessoriandme.us', name: 'Routine Chart for Toddlers', cat: 'learning', character: '', price: 28.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 15, couponCode: '', couponPct: 0, image: '', url: 'https://montessoriandme.us/products/routine-chart-for-toddlers-visual-schedule-board-for-kids', badge: '4.87★ 498 reviews', added: '2026-07-25', variants: [], blurb: 'Visual schedule board for kids — builds independence and routine.' },
  { id: 'mint-mintie-snug-stainless-steel-lunch-box-b-stock', vendor: 'Mintie Lunchboxes', domain: 'https://mintielunchboxes.co.uk', name: 'Mintie Snug Stainless Steel Lunch Box', cat: 'kitchen', character: '', price: 22.00, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 10, couponCode: '', couponPct: 0, image: '', url: 'https://mintielunchboxes.co.uk/products/mintie-snug-stainless-steel-lunch-box-b-stock', badge: '4.97★ · 10yr guarantee', added: '2026-07-26', variants: [], blurb: 'Leak-proof stainless lunchbox, built to last a decade of school lunches.' },
  { id: 'jsd-felt-portable-tilting-puzzle-board-puzzle-table-with-drawers-and-cover-for-up-to-1000-pieces-puzzle-newly-upgrade', vendor: 'jigsawdepot', domain: 'https://jigsawdepot.com', name: 'Portable Tilting Puzzle Board & Table', cat: 'puzzle', character: '', price: 59.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 10, couponCode: '', couponPct: 0, image: '', url: 'https://jigsawdepot.com/products/felt-portable-tilting-puzzle-board-puzzle-table-with-drawers-and-cover-for-up-to-1000-pieces-puzzle-newly-upgrade', badge: 'Up to 1000pc', added: '2026-07-14', variants: [], blurb: 'Felt-lined puzzle table with drawers — keeps pieces sorted between sessions.' },
  { id: 'jsd-1000-piece-tilting-wooden-puzzle-board-with-4-drawers-cover', vendor: 'jigsawdepot', domain: 'https://jigsawdepot.com', name: '1000-Piece Wooden Puzzle Board', cat: 'puzzle', character: '', price: 49.99, unit: '', onSale: false, wasPrice: 0, discountPct: 0, commissionPct: 10, couponCode: '', couponPct: 0, image: '', url: 'https://jigsawdepot.com/products/1000-piece-tilting-wooden-puzzle-board-with-4-drawers-cover', badge: '1000pc', added: '2026-07-27', variants: [], blurb: 'Classic family puzzle night — solid wooden board with 4 sorting drawers.' },
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
export function affiliateUrl(url: string, vendor: string): string {
  const cfg = vendorCfg(vendor)
  if (!url || !cfg) return url

  // AWIN advertisers: the commission is attributed by the redirect through
  // awin1.com, so the destination goes in `ued` and no query param is appended.
  if (cfg.awinMerchantId) {
    if (!AWIN_PUBLISHER_ID) return url // untracked, but never a broken link
    return (
      'https://www.awin1.com/cread.php' +
      `?awinmid=${encodeURIComponent(cfg.awinMerchantId)}` +
      `&awinaffid=${encodeURIComponent(AWIN_PUBLISHER_ID)}` +
      `&ued=${encodeURIComponent(url)}`
    )
  }

  if (!cfg.affiliateParam) return url
  return url + (url.includes('?') ? '&' : '?') + cfg.affiliateParam
}

/** True when a vendor is set up to earn but is not yet configured to track. */
export function isUntrackedAwin(vendor: string): boolean {
  const cfg = vendorCfg(vendor)
  return Boolean(cfg?.awinMerchantId !== undefined && (!cfg?.awinMerchantId || !AWIN_PUBLISHER_ID))
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
export function isNewItem(p: Product): boolean {
  if (!p.added) return false
  return new Date(p.added).getTime() >= Date.now() - 14 * 86400000
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
