import { VENDORS, type Product } from './data'
import { isKidSafeText } from './kid-safe'

// Route vendor CDN images through our own proxy so strict hotlink-protected
// stores (which reject cross-origin <img> requests) still render. Autoplush &
// others that allow hotlinking are unaffected — the proxy just re-serves them.
export function proxied(src: string): string {
  if (!src) return ''
  if (!/^https?:\/\//i.test(src)) return src
  return `/api/img?u=${encodeURIComponent(src)}`
}

/**
 * Inverse of proxied(): recover the vendor's own CDN URL from a proxy path.
 *
 * `proxied()` returns a ROOT-RELATIVE path, which is right for an <img> on our
 * own page and wrong for anything that leaves the site. Pinterest was being
 * handed `/api/img?u=…` as the image to pin and rejected it — "Parameter
 * 'image_url' … is not a valid URL format" — because a share target has no base
 * to resolve it against. The layout already learned this once for og:image; the
 * note there says a bare path is rejected by every social scraper.
 *
 * Unwrapping to the CDN URL rather than absolutising to
 * https://www.kawaiikatz.com/api/img?u=… on purpose. Two reasons, either
 * sufficient: the CDN URL is the actual image rather than a redirect through us,
 * and robots.txt disallows `/api/` — so pointing a crawler that respects it at
 * our proxy would be asking for a fetch we have told it not to make.
 *
 * Anything that is not a proxy path is returned untouched, so this is safe to
 * call on a raw URL, an empty string, or an already-unwrapped value.
 */
export function unproxied(src: string): string {
  if (!src || !src.startsWith('/api/img?')) return src
  try {
    return new URLSearchParams(src.slice(src.indexOf('?') + 1)).get('u') || src
  } catch {
    return src
  }
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

/**
 * Like hasAny, but each term must match as a whole word.
 *
 * hasAny is a substring test, which is fine for a term long enough to be its own
 * word ('backpack', 'scrunchie') and actively wrong for a short one. Two short
 * terms in the accessories rule were misfiling products across the catalogue:
 *
 *   'pin'  is a substring of PINK. Every product whose title, tags or blurb
 *          said "pink" and that reached the accessories rule was filed as an
 *          accessory — on a site where a large share of the catalogue is pink,
 *          and where the home rule sits BELOW accessories, so pink blankets,
 *          pink lamps and pink wall decor all landed there.
 *   'ring' is a substring of SPRING (and string, watering, offering). Same
 *          shape of failure: "Spring Meadow" anything became an accessory.
 *
 * That is not only a wrong chip on a card. `accessories` is one of
 * MODEL_SCAN_CATS, so every one of those products was queued for the coco-ssd
 * person scan and spending a share of its 35s build budget — the budget meant
 * for the real apparel photos. It is the same failure the BRKOX forceCat comment
 * describes, arriving by a different route.
 *
 * Use this for any term short enough to live inside a longer word. Terms that
 * cannot (still the majority) stay on hasAny, which is cheaper.
 */
const WORD_RX = new Map<string, RegExp>()
function hasWord(hay: string, terms: string[]): boolean {
  for (const t of terms) {
    let rx = WORD_RX.get(t)
    if (!rx) {
      rx = new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + 's?([^a-z0-9]|$)')
      WORD_RX.set(t, rx)
    }
    if (rx.test(hay)) return true
  }
  return false
}

// Hoisted so the garment guard and the plush rule read the SAME list. Two copies
// would drift, and the drift would be silent: a term added to the rule but not the
// guard turns that product into apparel without anything failing.
const PLUSH_TERMS = ['plush', 'plushie', 'plushy', 'stuffed', 'teddy', 'rag doll', 'hand puppet', 'finger puppet', 'puppet', 'snugible', 'blankie', 'cuddle', 'cuddly', 'soft toy', 'soft plush', 'pillow pet', 'gund', 'squishmallow', 'jumbo plush', 'plush figure']

/**
 * Nouns that mean "an object, not a thing you eat".
 *
 * The food rule is gated on this, because in a kawaii catalogue almost
 * everything is *shaped* like something edible. Matched as whole words, and
 * deliberately excluding nouns that can themselves be groceries — 'box', 'tin',
 * 'jar', 'can' and 'pack' are NOT here, because real snacks come in all five.
 */
const FOOD_FORM_NOUNS = [
  // carried
  'bag', 'handbag', 'backpack', 'tote', 'pouch', 'pouches', 'purse', 'wallet', 'case',
  // worn
  'hat', 'cap', 'beanie', 'glove', 'jacket', 'coat', 'dress', 'dresses', 'skirt',
  'vest', 'tights', 'leggings', 'pant', 'trouser', 'scarf', 'scarves', 'sock',
  'shirt', 'tee', 'hoodie', 'sweater', 'sweatshirt', 'sweatpant', 'jogger', 'tracksuit',
  'slipper', 'apron', 'wig',
  'costume', 'shade', 'sunglasses', 'beret', 'headband', 'hairband',
  // desk & paper
  'sticker', 'decal', 'eraser', 'notebook', 'notepad', 'note pad', 'sticky note',
  'journal', 'planner', 'pin', 'badge',
  // soft furnishings & decor
  // 'night light', not a bare 'light': drink copy is full of "a light,
  // refreshing…", which was sending real sparkling water to the home shelf.
  'pillow', 'cushion', 'blanket', 'towel', 'tapestry', 'rug', 'lamp', 'night light', 'candle',
  // hard goods
  'keychain', 'keyring', 'charm', 'stand', 'holder', 'grip', 'tray', 'coaster',
  // No 'bottle', 'mug' or 'tumbler': the kitchen rule already claims those and
  // runs first, so listing them here could only ever block a real bottled drink.
  'magnet', 'lanyard', 'piggy bank', 'money box',
  // jewellery & beauty
  'earring', 'necklace', 'bracelet', 'glaze', 'gloss', 'balm',
  // toys that merely look edible
  'squishy', 'squishie', 'squishies', 'squish', 'figure', 'figurine', 'plushie',
]

/**
 * Names that only ever belong to something you eat or drink. Kept separate from
 * the food vocabulary because these can run BEFORE the rules that claim 'bag'
 * and 'bottle' — packaging nouns that a snack shares with a handbag.
 *
 * Matched as whole words, not substrings: 'fanta' is inside FANTASY and
 * FANTASIA, 'lotte' inside LOTTERY, 'oreo' inside MOREOVER. A fantasy fox
 * plushie is not a soft drink.
 */
const GROCERY_BRANDS = [
  'fanta', 'coca-cola', 'coca cola', 'pepsi', 'sprite', 'minute maid', 'sangaria',
  'qdol', 'ocean bomb', 'calpis', 'yakult', 'ramune',
  'cheetos', 'doritos', 'lay\'s', 'calbee', 'pringles', 'chips ahoy', 'oreo',
  'pocky', 'kit kat', 'kitkat', 'hi-chew', 'meiji', 'glico', 'morinaga', 'lotte',
  'samyang', 'buldak', 'nongshim', 'nissin',
]

/**
 * Nouns a snack's own packaging uses. They cannot disqualify a brand match — a
 * bag of Lay's is still Lay's — so the brand rule screens on everything in
 * FOOD_FORM_NOUNS except these. The generic food vocabulary still screens on
 * the full list, where 'bag' really does mean the thing is a handbag.
 */
const PACKAGING_NOUNS = new Set(['bag', 'case', 'tray', 'pouch', 'pouches'])
const BRAND_FORM_NOUNS = FOOD_FORM_NOUNS.filter((n) => !PACKAGING_NOUNS.has(n))

export function categorize(hay: string): string {
  hay = (hay || '').toLowerCase()
  if (hasAny(hay, ['infant', 'newborn', 'swaddle', 'onesie', 'pacifier', 'teether', 'teething', 'bassinet', 'baby rattle', 'baby gym', 'tummy time', 'baby mobile', 'baby carrier', 'montessori baby'])) return 'learning'
  // Grocery brands, high — above the rules that own 'bag' and 'bottle'. A bag of
  // Lay's was being filed as an accessory and a 500ml Fanta as kitchenware,
  // because a snack's packaging is described with the same nouns as the objects
  // this catalogue mostly sells. A brand name is the one unambiguous signal:
  // nothing called Doritos is a hair clip. Still behind the form guard, so a
  // Pocky plushie stays a plushie.
  if (
    !hasAny(hay, PLUSH_TERMS) && !hasWord(hay, BRAND_FORM_NOUNS) &&
    hasWord(hay, GROCERY_BRANDS)
  ) return 'food'
  if (hasAny(hay, ['bag charm', 'bagcharm', 'bag-charm', 'keychain', 'key chain', 'key ring', 'keyring', 'phone charm', 'purse charm', 'hanging charm', 'dangle charm', 'strap charm', 'airpod charm', 'pendant charm', ' charm', 'charm ', 'charms'])) return 'accessories'
  // Decora and pastel-scene accessories: the cat ears, hair clips, bows,
  // bracelets, earrings and lip gloss that make an outfit rather than merely
  // decorate a shelf. Added 2026-08-22 with the kawaii/decora vendor intake,
  // because none of this vocabulary existed in the classifier and all of it
  // fell through to 'other' — a cat-ear headband matched no rule at all.
  //
  // Placed HIGH, next to the charm rule, and regex-anchored like the garment
  // test below. High because these nouns are the most specific thing a title
  // can say and the loose rules underneath would otherwise claim them first
  // ('hat' is a substring of nothing useful here, but 'pin' and 'ring' are).
  //
  // No plush guard on this first group, unlike the garment test: a headband is
  // not a plushie however plush it is, and "plush cat ears headband" is a
  // perfectly ordinary product name in this niche.
  if (/(^|[^a-z0-9])(head|hair) ?bands?([^a-z0-9]|$)|(^|[^a-z0-9])hair ?(clips?|pins?|ties?|bows?|forks?)([^a-z0-9]|$)|(^|[^a-z0-9])(barrettes?|claw clips?|scrunchies?|bobby pins?)([^a-z0-9]|$)/.test(hay)) return 'accessories'
  // Jewellery and kid-safe beauty. Bare 'ring' is deliberately NOT here: it
  // would claim jigsawdepot's "Ring Matching Game" and Montessori & Me's
  // stacking rings, both of which the puzzle and learning rules below get right
  // today. 'earring' is unambiguous, so it is.
  if (/(^|[^a-z0-9])(earrings?|necklaces?|bracelets?|bangles?|anklets?|chokers?|brooch(es)?|lip ?gloss|lip ?glazes?|lipsticks?|lip ?balms?|nail (polish|stickers?|wraps?)|press[- ]on nails)([^a-z0-9]|$)/.test(hay)) return 'accessories'
  // "Cat ears" needs TWO guards, and the second one was learned the hard way.
  //
  // The plush guard, because in this catalogue the phrase is equally the name of
  // a headband and a description of a plushie's face.
  //
  // The GARMENT guard, because animal ears are just as often sewn onto a hoodie
  // or a beanie as sold on their own — and this rule sits above the garment test,
  // so without it the garment loses. Measured on a real feed: Grumpy Bunny's
  // "Psycho Nation black & white bunny ears hoodie" and Hypercore's "cat ears
  // beanie" both moved from apparel to accessories when this rule was added.
  // A hoodie with ears on it is a hoodie.
  if (
    !hasAny(hay, PLUSH_TERMS) &&
    !/\b(hoodies?|beanies?|hats?|caps?|sweaters?|sweatshirts?|cardigans?|shirts?|dress(es)?|jumpers?|coats?|jackets?)\b/.test(hay) &&
    /(^|[^a-z0-9])(cat|kitty|neko|bunny|bear|fox|devil|angel) ?ears?([^a-z0-9]|$)/.test(hay)
  ) {
    return 'accessories'
  }
  if (hasAny(hay, ['blind box', 'blindbox', 'popmart', 'pop mart', 'hippers', 'dimoo', 'mighty jaxx', 'sonny angel', 'smiski', 'labubu', 'collectible', 'figurine', 'figure', 'mystery box', 'mystery bag', 'lucky egg', 'series figures'])) return 'collect'
  if (hasAny(hay, ['switch case', 'nintendo switch', 'phone case', 'samsung phone case', 'iphone case', 'ipad case', 'airpods', 'keyboard', 'keycaps', 'mousepad', 'desk pad', 'gaming', 'controller', 'console', 'usb', 'charging', 'charger', 'handheld fan', 'neck fan'])) return 'tech'
  // An unambiguous garment noun beats an age word or a print theme. Every rule
  // in this function matches on SUBSTRINGS in listed order, so before this test
  // existed "Toddler T-Shirt" was filed under 'learning' (on `toddler`) and
  // "Youth Tee Ramen Bowl" under 'kitchen' (on `bowl`) — a kids' tee and a
  // ramen-print tee, neither of them on the apparel shelf. That is not
  // hypothetical: it is what a Japanese-themed apparel vendor's catalogue is
  // made of.
  //
  // This test is regex-anchored while the rest of the function is not, and that
  // is the point. The loose apparel rule below still carries 'tee', which as a
  // bare substring also matches "canteen" and "teether" — safe only because it
  // sits after the kitchen and baby rules that claim those words first. Moving
  // it earlier would break them, so the early test takes word boundaries and
  // only the nouns that cannot mean anything else. 'dress', 'hat' and 'shirt'
  // deliberately stay below ('dress' matches "dressing").
  // ...but an explicit PLUSH signal still wins. Plushible's "Snugible | Blanket
  // Hoodie & Pillow" is a wearable, so the garment test claimed all 56 of them
  // for apparel — and `snugible` being in the plush list at all is somebody
  // deciding, on purpose, that these belong in Plushies. A soft-goods hybrid is
  // classified by what it IS, not by the one word in its name that is a garment.
  //
  // Widened 2026-08-22 for Ada's brief, which is clothes: shirts, skirts,
  // pants, lace tops, shoes. Every noun added here is one that cannot mean
  // anything else in this catalogue, tested at word boundaries, and checked
  // against the existing vendors before being added:
  //   'skirt'      — no other meaning. 'mini skirt' is caught by the safety
  //                  filter long before this rule ever runs.
  //   'overalls'   — PLURAL ONLY, because "overall length" is ordinary product
  //                  copy and would drag furniture and puzzle boards in.
  //   'leggings', 'jeans', 'blouse', 'cardigan', 'jumpsuit', 'romper',
  //   'dungarees', 'pyjamas'/'pajamas' — unambiguous garment nouns.
  //   'pants'/'trousers' — 'pants' is safe at a word boundary; as a substring
  //                  it would have matched nothing here anyway, but the anchor
  //                  keeps it that way if somebody ever sells a "pantsuit".
  // Deliberately still NOT here: 'top' (laptop, stopwatch, tabletop), 'dress'
  // (dressing table, dress-up pretend play, which is a learning toy), 'shoes'
  // and 'boots' (the loose rule below already has them, after the rules that
  // claim "boot tray" and similar). Moving those up buys nothing and costs the
  // rules underneath.
  if (!hasAny(hay, PLUSH_TERMS) && /\bt-?shirts?\b|\btees?\b|\bhoodies?\b|\bsweatshirts?\b|\bsweaters?\b|\bsocks\b|\bskirts?\b|\bleggings\b|\bjeans\b|\bblouses?\b|\bcardigans?\b|\bjumpsuits?\b|\brompers?\b|\bdungarees\b|\boveralls\b|\bpants\b|\btrousers\b|\bp[yj]jamas\b/.test(hay)) return 'apparel'
  if (hasAny(hay, ['snack pot', 'spare lid', 'replacement seal', 'lunchbox spare lid', 'water bottle', 'stainless steel cup', 'stainless steel water bottle', 'stainless steel lunch box', 'bento', 'lunchbox', 'lunch box', 'lunch', 'mug', 'tumbler', 'bottle', 'cup', 'thermos', 'food jar', 'stainless', 'kitchen', 'plate', 'bowl', 'drinking straw', 'reusable straw', 'silicone straw', 'straw lid', 'straw cup', 'drinkware', 'cookie cutter', 'baking set', 'mold', 'apron'])) return 'kitchen'
  if (hasAny(hay, PLUSH_TERMS)) return 'plush'
  // Food comes AFTER plush, and behind a guard, because in a kawaii catalogue
  // almost everything is *shaped* like something edible. Before both, the food
  // rule was claiming Plushible's "Chocolate Strawberry Snugible | Blanket
  // Hoodie & Pillow" on 'chocolate', a "Cute Tea Party Bag" on 'tea party' and
  // a "Candy Lover's Tote Bag" on 'candy'. The guard is what separates a snack
  // from an object with a snack printed on it — "Cookie Monster" and "Mochi
  // Bunny" are plushies, not groceries.
  //
  // Vocabulary widened for drinks, which the rule never had at all: it knew
  // 'ramune' and 'ocean bomb' by brand but not 'drink', 'boba' or 'milk tea',
  // so a Pusheen fizzy drink and a Keroppi matcha boba were reaching the home
  // rule and being filed as decor.
  if (!hasWord(hay, FOOD_FORM_NOUNS)) {
    if (hasAny(hay, [
      // drinks
      'ramune', 'sparkling water', 'ocean bomb', 'fizzy drink', 'soft drink',
      'energy drink', 'milk tea', 'bubble tea', 'boba', 'iced tea', 'lemonade',
      'melon soda', 'cream soda',
      // instant / savoury
      'ramen', 'instant noodle', 'cup noodle', 'yakisoba', 'udon', 'furikake',
      'senbei', 'dagashi', 'seaweed snack', 'rice cracker', 'potato chips',
    ])) return 'food'
    if (hasWord(hay, ['soda', 'juice', 'cola'])) return 'food'
  }

  if (hasAny(hay, ['montessori', 'wooden', 'learning', 'educational', 'busy board', 'fine motor', 'activity board', 'weather board', 'alphabet', 'toddler', 'matching game', 'tower challenge', 'pretend play'])) return 'learning'
  if (hasWord(hay, ['counting', 'stacking', 'sorting', 'math', 'hape', 'rattle'])) return 'learning'
  if (hasAny(hay, ['puzzle', 'jigsaw', '500pc', '1000pc', 'pieces', 'tilting board', 'puzzle table', 'board game', 'yo-yo', 'kite', 'ring matching game'])) return 'puzzle'
  if (hasAny(hay, ['sticker', 'notebook', 'journal', 'planner', 'pen', 'pencil', 'washi', 'memo', 'stationery', 'eraser', 'marker', 'highlighter', 'stapler', 'desk clock'])) return 'stationery'
  // The loose apparel rule. Everything here is a substring test, which is only
  // safe because the kitchen, food, plush, learning, puzzle and stationery rules
  // above have already claimed the words that collide ('tee' inside "canteen"
  // and "teether" is the standing example).
  //
  // The 2026-08-22 additions are the rest of Ada's list — the pieces of a
  // decora or fairy-kei outfit that are not covered by the anchored test above:
  // outerwear, legwear, footwear and the layering pieces. 'platform' earns its
  // place on its own because platform shoes are a fairy-kei staple and the word
  // is never used any other way in this catalogue.
  if (hasAny(hay, ['hoodie', 'shirt', 't shirt', 't-shirt', 'tee', 'dress', 'pajamas', 'pyjamas', 'bucket hat', 'visor', 'outfit', 'sneakers', 'shoes', 'platform shoes', 'platform boots', 'platform sandals', 'mary jane', 'boots', 'sandals', 'slippers', 'socks', 'sweater', 'sweatshirt', 'beanie', 'kimono', 'swim vest', 'float suit', 'blanket hoodie', 'cardigan', 'jacket', 'coat', 'tights', 'leg warmer', 'legwarmer', 'arm warmer', 'armwarmer', 'apron dress', 'pinafore', 'jumper', 'tunic', 'lace top', 'lace shirt', 'lace blouse'])) return 'apparel'
  // 'hat' and 'vest' are the same hazard as 'pin' and 'ring', and they belong to
  // this rule rather than the accessories one, so they get the same treatment.
  //
  // 'hat'  is a substring of THAT, and `hay` includes the blurb — so a product
  //        whose description contained the word "that" and which reached this
  //        rule was filed as apparel. "Kawaii wall lamp that glows softly"
  //        classified as apparel before this line existed. That is a pre-existing
  //        bug, not one introduced with the decora terms; it is fixed here
  //        because this is the rule it lives in.
  // 'vest' is a substring of HARVEST (and invest). This one WAS introduced with
  //        the decora terms — 'vest' was added for the layering pieces and
  //        immediately reclassified "harvest moon wall art" out of home.
  //
  // Both still match what they are meant to: hasWord appends an optional plural,
  // so 'vest' catches "swim vest" and "vests", 'hat' catches "hats".
  if (hasWord(hay, ['hat', 'vest'])) return 'apparel'
  // 'ring' and 'pin' moved off hasAny and onto hasWord — see the note on
  // hasWord for what they were matching ("spring", "pink") and why it mattered
  // more than a wrong chip. Everything else stays on the cheaper substring test.
  if (hasAny(hay, ['bag', 'backpack', 'ita backpack', 'messenger bag', 'cosmetic bag', 'pouch', 'tote', 'purse', 'wallet', 'necklace', 'bracelet', 'earring', 'hair ties', 'hair clip', 'scrunchie', 'umbrella', 'badge', 'wristband', 'sunglasses'])) return 'accessories'
  if (hasWord(hay, ['ring', 'pin', 'brooch', 'choker', 'anklet', 'bangle'])) return 'accessories'
  // Same split, same reason. Four terms here are substrings of common unrelated
  // words and were pulling products onto the home shelf on nothing:
  //   'mat'   ⊂ MATCHA — and this is a kawaii catalogue, so matcha is
  //           everywhere. A Keroppi matcha boba milk tea was filed as home decor.
  //   'light' ⊂ DELIGHT, LIGHTWEIGHT, HIGHLIGHT, LIGHTNING
  //   'wall'  ⊂ WALLET
  //   'tent'  ⊂ CONTENT, POTENTIAL
  // 60 of the 200 products classified `home` rested on one of these and nothing
  // else. 'frame' and 'clock' stay in the substring list: they collide with
  // nothing in this catalogue, and anchoring 'frame' would lose "framed".
  //
  // The second list is vocabulary this rule never had. Anchoring the four terms
  // above took away the accident that had been carrying real homeware here:
  // a tissue box, a toothbrush container, cat-paw bookends and a coin bank were
  // all landing on the home shelf because their blurbs happened to contain
  // "matcha" or "delight". They deserve to arrive on purpose — including the
  // storage shelf that started this, which was on the children's-learning shelf
  // because it is "shaped like an ice cream cone".
  if (hasAny(hay, ['blanket', 'pillow', 'bedding', 'duvet', 'quilt', 'cover set', 'rug', 'frame', 'photo frame', 'picture frame', 'plaque', 'hanger', 'decor', 'lamp', 'mirror', 'clock', 'play tent', 'furniture', 'sofa', 'coffee table'])) return 'home'
  if (hasAny(hay, ['tissue box', 'toothbrush', 'bookend', 'coin bank', 'money bank', 'piggy bank', 'soap dish', 'toilet', 'curtain', 'storage shelf', 'storage box', 'storage rack', 'organizer', 'organiser', 'trinket dish', 'incense holder', 'plant pot', 'planter', 'waste bin', 'laundry'])) return 'home'
  if (hasWord(hay, ['vase', 'shelf', 'poster', 'wall art'])) return 'home'
  if (hasWord(hay, ['mat', 'wall', 'light', 'tent'])) return 'home'
  // Sweets vocabulary, last. These words are not reliable evidence of food in
  // this catalogue — they are how it describes a LOOK. 'candycore' sneakers, a
  // "Lovecore Lolly" belt chain, a "Cherry Puppy" jacket, a chocolate-brown
  // plaid dress. Run high they claimed all of those; run here, apparel,
  // accessories, stationery and home have already taken what is theirs and what
  // is left is much more likely to be an actual sweet.
  if (!hasWord(hay, FOOD_FORM_NOUNS)) {
    if (hasAny(hay, ['candy', 'chocolate', 'gummy', 'gummies', 'marshmallow',
      'lollipop', 'wafer', 'biscuit', 'caramel', 'popcorn', 'macaron',
      'dorayaki', 'daifuku', 'konpeito', 'lychee flavor', 'lemon lime',
      'white peach', 'tea party'])) return 'food'
    if (hasWord(hay, ['jelly', 'pudding', 'snack', 'pez', 'mochi', 'cookie', 'noodle', 'chips', 'crisps'])) return 'food'
  }
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

/**
 * Case-insensitive product_type gate, from VendorConfig.include / .exclude.
 *
 * Ported from Legal-Leaf's mapShopify(). Absent config it is a no-op, which is
 * every vendor on the shelf today — it exists for the intake ahead of it, where
 * a merchant like The Kawaii Shoppu sells apparel, jewellery, bags, plush AND
 * stationery out of one feed and we may want only part of that.
 *
 * `include` is an allow-list rather than a deny-list on purpose: a product_type
 * the merchant invents later stays OUT until somebody looks at it, instead of
 * appearing on the storefront unannounced.
 */
function typeAllowed(cfg: typeof VENDORS[number], productType: string): boolean {
  const t = String(productType || '').trim().toLowerCase()
  if (cfg.include?.length && !cfg.include.some((x) => x.trim().toLowerCase() === t)) return false
  if (cfg.exclude?.length && cfg.exclude.some((x) => x.trim().toLowerCase() === t)) return false
  return true
}

export function mapShopifyProducts(
  cfg: typeof VENDORS[number],
  raw: ShopifyProductRaw[]
): Product[] {
  const out: Product[] = []
  for (const p of raw || []) {
    if (!p || !p.handle) continue
    if (!typeAllowed(cfg, p.product_type ?? '')) continue
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
    /**
     * `<style>` and `<script>` bodies go FIRST, element and all.
     *
     * Stripping tags with /<[^>]*>/ removes `<style>` and `</style>` and leaves
     * everything between them — which is CSS. MamaRaya ships a styled
     * description block on most of its products, so 28 of its 52 rows had a
     * blurb reading `.maw-tote { --maw-ink: #302f2d; … }`. That is what the
     * cards showed, what categorize() classified on, and — since product pages
     * exist — what a pin's landing page offered as its description and its
     * <meta name="description">.
     */
    let blurb = String(p.body_html || '')
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    // Backstop for CSS that got through anyway — an unclosed <style>, which no
    // regex can bound. A blurb reading `.a { color: red }` is worse than no
    // blurb at all: it is shown on the card, used as a product page's
    // description and its <meta name="description">, and fed to categorize().
    // Nothing is a legitimate outcome here; gibberish never is.
    if (/\{[^}]*[a-z-]+\s*:[^}]*\}/.test(blurb)) blurb = ''
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
      kidSafe: isKidSafeText(hay, cat, p.title || ''),
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
