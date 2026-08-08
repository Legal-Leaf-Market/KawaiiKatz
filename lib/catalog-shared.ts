import { VENDORS, type Product } from './data'

// Route vendor CDN images through our own proxy so strict hotlink-protected
// stores (which reject cross-origin <img> requests) still render. Autoplush &
// others that allow hotlinking are unaffected — the proxy just re-serves them.
export function proxied(src: string): string {
  if (!src) return ''
  if (!/^https?:\/\//i.test(src)) return src
  return `/api/img?u=${encodeURIComponent(src)}`
}

// ---------------------------------------------------------------------------
// Content safety — keep the catalog kid-appropriate (ported from original)
// ---------------------------------------------------------------------------
const UNSAFE_TERMS = [
  // --- original list (kept verbatim) ---
  'sexy', 'seductive', 'lingerie', 'bodysuit', 'body suit', 'bodycon', 'body con', 'corset', 'bustier',
  'fishnet', 'garter', 'babydoll', 'baby doll', 'negligee', 'nightie', 'teddy lingerie', 'lace teddy',
  'bodystocking', 'thong', 'g-string', 'gstring', 'crotchless', 'boudoir', 'clubwear', 'cleavage',
  'see through', 'see-through', 'sheer', 'micro skirt', 'string bikini', 'bralette', 'pole dance',
  'bunny girl', 'bunnygirl', 'maid outfit', 'maid dress', 'maid costume', 'cosplay', 'roleplay costume',
  'erotic', 'fetish', 'bdsm', 'kink', 'nsfw', '18+', 'adults only', 'adult only', 'xxx',
  // --- extended risqué-apparel coverage (revealing / tight / adult-model fits) ---
  'mini skirt', 'miniskirt', 'micro mini', 'micro-mini', 'micro bikini',
  'tight fit', 'tight-fitting', 'tight fitting', 'form fitting', 'form-fitting', 'skin tight', 'skin-tight',
  'crop top', 'cropped top', 'tube top', 'halter top',
  'low cut', 'low-cut', 'low rise', 'low-rise',
  'backless', 'strapless', 'off shoulder', 'off-shoulder', 'off the shoulder', 'cold shoulder cutout',
  'high slit', 'thigh slit', 'side slit', 'leg slit',
  'hot pants', 'short shorts', 'booty shorts', 'micro shorts', 'daisy dukes',
  'plunging neckline', 'deep neckline', 'deep-v', 'deep v neck', 'deep v-neck',
  'cut out dress', 'cutout dress', 'cut-out dress',
  'revealing', 'risque', 'risqué', 'provocative', 'suggestive', 'racy',
  'strip tease', 'striptease', 'stripper', 'topless', 'strapless mini',
  'waist trainer', 'waist cincher', 'adult model', 'full body model',
]
const SAFE_EXCEPTIONS: RegExp[] = [
  /kinkajou/, /garter\s*snake/, /snake\s*garter/,
  /(baby|infant|newborn|toddler|kids?|child(ren)?s?)\s+(\w+\s+){0,2}bodysuit/,
  /bodysuit\s+(for\s+)?(baby|babies|infant|newborn|toddler|kids?)/,
  /sheer\s*(joy|delight|bliss|fun|magic)/,
  /corset\s*(back)?\s*(binder|folder|notebook)/,
  /teddy\s*bear/, /teddy\s*plush/,
  // Furniture/homeware that legitimately uses "backless" (allow words between,
  // e.g. "backless wooden stool", "backless kids booster seat").
  /backless\b[\w\s]*\b(stool|bench|chair|booster|highchair|high\s*chair|seat|sofa|step)/,
  // Craft/decor uses of "strip" that must not be caught by stripper/strip-tease rules.
  /(sticker|led|light|comic|test|washi|bacon|film)\s*strip/,
]
const TERM_RX = UNSAFE_TERMS.map((t) => {
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  return new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)', 'i')
})
function contentSafe(hay: string): boolean {
  const s = hay.toLowerCase()
  for (const ex of SAFE_EXCEPTIONS) if (ex.test(s)) return true
  for (const rx of TERM_RX) if (rx.test(s)) return false
  return true
}

// ---------------------------------------------------------------------------
// Category + character detection (ported from original wcCategorize_)
// ---------------------------------------------------------------------------
function hasAny(hay: string, terms: string[]): boolean {
  for (const t of terms) if (hay.indexOf(t) !== -1) return true
  return false
}

export function categorize(hay: string): string {
  hay = (hay || '').toLowerCase()
  if (hasAny(hay, ['infant', 'newborn', 'swaddle', 'onesie', 'pacifier', 'teether', 'teething', 'bassinet', 'baby rattle', 'baby gym', 'tummy time', 'baby mobile', 'baby carrier', 'montessori baby'])) return 'learning'
  if (hasAny(hay, ['bag charm', 'bagcharm', 'bag-charm', 'keychain', 'key chain', 'key ring', 'keyring', 'phone charm', 'purse charm', 'hanging charm', 'dangle charm', 'strap charm', 'airpod charm', 'pendant charm', ' charm', 'charm ', 'charms'])) return 'accessories'
  if (hasAny(hay, ['blind box', 'blindbox', 'popmart', 'pop mart', 'hippers', 'dimoo', 'mighty jaxx', 'sonny angel', 'smiski', 'labubu', 'collectible', 'figurine', 'figure', 'mystery box', 'mystery bag', 'lucky egg', 'series figures'])) return 'collect'
  if (hasAny(hay, ['switch case', 'nintendo switch', 'phone case', 'samsung phone case', 'iphone case', 'ipad case', 'airpods', 'keyboard', 'keycaps', 'mousepad', 'desk pad', 'gaming', 'controller', 'console', 'usb', 'charging', 'charger', 'handheld fan', 'neck fan'])) return 'tech'
  if (hasAny(hay, ['snack pot', 'spare lid', 'replacement seal', 'lunchbox spare lid', 'water bottle', 'stainless steel cup', 'stainless steel water bottle', 'stainless steel lunch box', 'bento', 'lunchbox', 'lunch box', 'lunch', 'mug', 'tumbler', 'bottle', 'cup', 'thermos', 'food jar', 'stainless', 'kitchen', 'plate', 'bowl', 'drinking straw', 'reusable straw', 'silicone straw', 'straw lid', 'straw cup', 'drinkware', 'cookie cutter', 'baking set', 'mold', 'apron'])) return 'kitchen'
  if (hasAny(hay, ['ramen', 'ramune', 'sparkling water', 'ocean bomb', 'pez', 'buldak', 'samyang', 'soda', 'lychee flavor', 'lemon lime', 'white peach', 'candy', 'chocolate', 'gummy', 'tea party'])) return 'food'
  if (hasAny(hay, ['plush', 'plushie', 'plushy', 'stuffed', 'teddy', 'rag doll', 'hand puppet', 'finger puppet', 'puppet', 'snugible', 'blankie', 'cuddle', 'cuddly', 'soft toy', 'soft plush', 'pillow pet', 'gund', 'squishmallow', 'jumbo plush', 'plush figure'])) return 'plush'
  if (hasAny(hay, ['montessori', 'wooden', 'learning', 'educational', 'busy board', 'fine motor', 'activity board', 'weather board', 'counting', 'alphabet', 'stacking', 'sorting', 'toddler', 'math', 'hape', 'rattle', 'matching game', 'tower challenge', 'pretend play'])) return 'learning'
  if (hasAny(hay, ['puzzle', 'jigsaw', '500pc', '1000pc', 'pieces', 'tilting board', 'puzzle table', 'board game', 'yo-yo', 'kite', 'ring matching game'])) return 'puzzle'
  if (hasAny(hay, ['sticker', 'notebook', 'journal', 'planner', 'pen', 'pencil', 'washi', 'memo', 'stationery', 'eraser', 'marker', 'highlighter', 'stapler', 'desk clock'])) return 'stationery'
  if (hasAny(hay, ['hoodie', 'shirt', 't shirt', 't-shirt', 'tee', 'dress', 'pajamas', 'pyjamas', 'hat', 'bucket hat', 'visor', 'outfit', 'sneakers', 'shoes', 'platform shoes', 'socks', 'sweater', 'sweatshirt', 'beanie', 'kimono', 'swim vest', 'float suit', 'blanket hoodie'])) return 'apparel'
  if (hasAny(hay, ['bag', 'backpack', 'ita backpack', 'messenger bag', 'cosmetic bag', 'pouch', 'tote', 'purse', 'wallet', 'necklace', 'bracelet', 'earring', 'ring', 'hair ties', 'hair clip', 'scrunchie', 'umbrella', 'pin', 'badge'])) return 'accessories'
  if (hasAny(hay, ['blanket', 'pillow', 'bedding', 'duvet', 'quilt', 'cover set', 'mat', 'rug', 'frame', 'photo frame', 'picture frame', 'plaque', 'hanger', 'wall', 'decor', 'lamp', 'light', 'mirror', 'clock', 'tent', 'play tent', 'furniture', 'sofa', 'coffee table'])) return 'home'
  return 'other'
}

const CHARACTERS: { key: string; rx: RegExp }[] = [
  { key: 'hellokitty', rx: /hello ?kitty/ }, { key: 'kuromi', rx: /kuromi/ },
  { key: 'mymelody', rx: /my ?melody/ }, { key: 'cinnamoroll', rx: /cinnamoroll|cinnamon ?roll/ },
  { key: 'pompompurin', rx: /pompompurin|pom ?pom ?purin/ }, { key: 'keroppi', rx: /keroppi/ },
  { key: 'pochacco', rx: /pochacco/ }, { key: 'badtzmaru', rx: /badtz ?-?maru/ },
  { key: 'gudetama', rx: /gudetama/ }, { key: 'littletwinstars', rx: /twin ?stars|kiki ?& ?lala/ },
  { key: 'sonnyangel', rx: /sonny ?angel/ }, { key: 'smiski', rx: /smiski/ },
  { key: 'labubu', rx: /labubu/ }, { key: 'pikachu', rx: /pokemon|pikachu|poke ?ball/ },
  { key: 'rilakkuma', rx: /rilakkuma/ }, { key: 'pusheen', rx: /pusheen/ },
  { key: 'sanriomix', rx: /sanrio/ },
]
export function detectCharacter(hay: string): string {
  const s = (hay || '').toLowerCase()
  for (const c of CHARACTERS) if (c.rx.test(s)) return c.key
  return ''
}

function vendorDefaultCat(vendor: string): string {
  const v = vendor.toLowerCase()
  if (v === 'montessori & me') return 'learning'
  if (v === 'mintie lunchboxes') return 'kitchen'
  if (v === 'jigsawdepot') return 'puzzle'
  if (v === 'autoplush') return 'plush'
  // Display frames and cases exist to show off collections, so they belong with
  // collectibles rather than in home decor, where the classifier's "wall / frame"
  // wording would otherwise drop them.
  if (v === 'brkox') return 'collect'
  return 'other'
}

// ---------------------------------------------------------------------------
// Shopify product mapping (ported from original mapShopify_)
// ---------------------------------------------------------------------------
interface ShopifyVariant { id: number | string; title?: string; price?: string | number; available?: boolean; compare_at_price?: string | number | null }
interface ShopifyProductRaw {
  handle?: string
  title?: string
  product_type?: string
  tags?: string | string[]
  body_html?: string
  published_at?: string
  created_at?: string
  images?: { src: string }[]
  image?: { src: string }
  variants?: ShopifyVariant[]
}

export function mapShopifyProducts(
  cfg: typeof VENDORS[number],
  raw: ShopifyProductRaw[]
): Product[] {
  const out: Product[] = []
  for (const p of raw || []) {
    if (!p || !p.handle) continue
    const vars = (p.variants || [])
      .filter((v) => v.available !== false)
      .map((v) => ({
        id: String(v.id),
        title: v.title && v.title !== 'Default Title' ? v.title : '',
        price: Number(v.price) || 0,
        available: true,
        compareAt: Number(v.compare_at_price) || 0,
      }))
    if (!vars.length) continue

    const img = proxied(p.images?.[0]?.src ?? p.image?.src ?? '')
    const prices = vars.map((v) => v.price).filter((n) => n > 0)
    const minP = prices.length ? Math.min(...prices) : 0
    let blurb = String(p.body_html || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (blurb.length > 140) blurb = blurb.slice(0, 137) + '...'

    const tagsStr = Array.isArray(p.tags) ? p.tags.join(' ') : String(p.tags || '')
    const hay = `${p.title || ''} ${p.product_type || ''} ${tagsStr} ${blurb}`
    if (!contentSafe(hay)) continue

    // Sale detection from compare_at_price
    const chosen = vars.find((v) => v.price === minP) ?? vars[0]
    const compare = chosen.compareAt
    const onSale = compare > 0 && compare > minP
    const discountPct = onSale ? Math.round((1 - minP / compare) * 100) : 0

    // A pinned category wins outright — see VendorConfig.forceCat.
    let cat = cfg.forceCat ?? categorize(hay)
    if (cat === 'other') cat = vendorDefaultCat(cfg.vendor)

    out.push({
      id: `${cfg.prefix}-${p.handle}`,
      vendor: cfg.vendor,
      domain: cfg.domain,
      name: p.title || '',
      cat,
      character: detectCharacter(hay),
      price: minP,
      unit: vars.length > 1 ? 'from' : '',
      onSale,
      wasPrice: onSale ? compare : 0,
      discountPct,
      commissionPct: cfg.commissionPct,
      couponCode: cfg.couponCode,
      couponPct: cfg.couponPct,
      image: img,
      url: `${cfg.domain}/products/${p.handle}`,
      badge: '',
      added: p.published_at || p.created_at || '',
      variants: vars.map(({ id, title, price, available }) => ({ id, title, price, available })),
      blurb,
    })
  }
  return out
}
