import { VENDORS, type Product } from './data'
import { isKidSafeText } from './kid-safe'

// Route vendor CDN images through our own proxy so strict hotlink-protected
// stores (which reject cross-origin <img> requests) still render. Vendors that
// allow hotlinking are unaffected — the proxy just re-serves them.
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
/**
 * Decode the handful of HTML entities a merchant title actually carries.
 *
 * WooCommerce returns product names HTML-encoded, so a real feed hands over
 * "Ghibli Puzzles &#8211; Kiki&#8217;s Delivery Service" and the card prints
 * that character for character. The Shopify path never needed this because
 * products.json gives plain text, which is exactly why the first Woo mapper
 * did not have it: the blurb was being cleaned and the NAME was not.
 *
 * Numeric entities are handled generally; the five named ones are the only
 * named entities that appear in practice, and a full table would be a
 * dependency for nothing.
 */
export function decodeEntities(input: string): string {
  return String(input || '')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * A REPLICA WEAPON IS NOT MERCHANDISE ON A SITE FOR CHILDREN.
 *
 * Found in a real feed: a 100cm steel-look katana sitting in a jigsaw shop's
 * catalogue at $124, uncategorised, which would have gone onto a kid-facing
 * shelf between two Ghibli puzzles.
 *
 * WHY IT IS NOT JUST A WORD IN UNSAFE_TERMS. Anime merchandise is full of
 * weapon words that describe a PICTURE rather than an object: "Sword Art
 * Online" is a franchise name, "Naruto Sasuke Sword Intense Battle Soft
 * Bedding" is a duvet, and a Nichirin sword jigsaw is a jigsaw. Blocking the
 * noun would delete a large slice of legitimate stock and look like a bug.
 *
 * So the test is whether the product IS the weapon, by two signals that a
 * printed design does not produce:
 *   a length in centimetres near the weapon noun, which is how a replica is
 *   listed and never how a bedspread is;
 *   the weapon noun in the trailing product-noun position, since a duvet's
 *   title ends in "Bedding" and a puzzle's ends in "Puzzle".
 */
const REPLICA_WEAPON_RX: RegExp[] = [
  /\b\d{2,3}\s*(cm|inch|in|")\b[^.]{0,70}\b(katana|sword|blade|dagger|knife|scythe|axe)\b/i,
  /\b(katana|sword|blade|dagger|knife|scythe|nunchaku|kunai)\s*$/i,
]
function replicaWeapon(name: string): boolean {
  const n = decodeEntities(name)
  return REPLICA_WEAPON_RX.some((rx) => rx.test(n))
}

const TERM_RX = UNSAFE_TERMS.map((t) => {
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  return new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)', 'i')
})
function contentSafe(hay: string, name = ''): boolean {
  /* The weapon test reads the NAME, not the haystack, because it depends on
     where the noun sits in the title and the haystack has tags and a blurb
     glued to the end of it. It runs before the exceptions: nothing in that
     list should be able to wave a replica sword through. */
  if (name && replicaWeapon(name)) return false
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
export function hasWord(hay: string, terms: string[]): boolean {
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
  /**
   * Baby TOYS, and only toys.
   *
   * This rule used to carry 'infant', 'newborn' and 'toddler' as well, and
   * because it is the first rule in the function they beat every other signal.
   * Those are not product types — they are who the gift is for, and a shop that
   * sells baby gifts says them in the marketing copy of everything it stocks.
   * `hay` includes the blurb, so on MamaRaya's 53 products the word 'newborn'
   * alone filed 11 of them as Learning & Wooden Toys: a diaper caddy, four
   * sweater-and-socks sets, a name blanket, three baskets and an organiser
   * pouch. Nothing in that list is a toy and nothing teaches anything.
   *
   * The terms left are ones that name the object rather than the recipient. Age
   * words now decide nothing, which is correct: "newborn" tells you the size,
   * and the noun beside it tells you the category.
   *
   * Word-anchored, so 'baby gym' cannot be reached through "baby gymnastics"
   * and 'teether' stays clear of 'teethering'-style typos in tags.
   */
  if (hasWord(hay, ['pacifier', 'teether', 'teething', 'baby rattle', 'baby gym', 'tummy time', 'baby mobile', 'montessori baby'])) return 'learning'
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
  // ...but an explicit PLUSH signal still wins. (The worked example below is
  // Plushible, delisted 2026-09-01, so `snugible` matches nothing today. The
  // rule it illustrates is general and stays.) Plushible's "Snugible | Blanket
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
  // 'onesie' moved here from the baby rule above: it is a garment, and it was
  // only in that rule because that is where baby words lived — which is how an
  // adult kigurumi pyjama came to be a learning toy.
  //
  // 'swaddle' deliberately did NOT come with it. A swaddle is a blanket, not a
  // garment, and putting it here sent MamaRaya's "Personalized Baby Name
  // Blanket" to apparel — the home rule below already claims it on 'blanket',
  // which is the noun that actually names the thing.
  if (!hasAny(hay, PLUSH_TERMS) && /\bt-?shirts?\b|\btees?\b|\bhoodies?\b|\bsweatshirts?\b|\bsweaters?\b|\bsocks\b|\bskirts?\b|\bleggings\b|\bjeans\b|\bblouses?\b|\bcardigans?\b|\bjumpsuits?\b|\brompers?\b|\bdungarees\b|\boveralls\b|\bpants\b|\btrousers\b|\bp[yj]jamas\b|\bonesies?\b/.test(hay)) return 'apparel'
  /**
   * Kitchen, unless the thing is plainly a bag.
   *
   * `lunch` and even `lunch bag` are not enough on their own. MamaRaya's
   * "3-Piece School Bag Set" and "Kids Backpack Set" both say "lunch bag" in
   * the copy — truthfully, because a lunch bag is one of the three pieces — and
   * were filed as kitchenware. Four of their seven kitchen rows were backpack
   * sets.
   *
   * The guard asks what the product IS rather than what it contains. A rucksack
   * with a lunch bag in it is a bag; a lunch box that happens to mention
   * fitting in a rucksack keeps the noun that names it, because the guard is
   * word-anchored to bag words and a lunch box is not one.
   *
   * Vendors whose whole shelf is lunch gear are unaffected: Mintie Lunchboxes
   * carries forceCat, which is decided before this function is reached.
   */
  if (
    !hasWord(hay, ['backpack', 'rucksack', 'school bag', 'bag set', 'backpack set', 'book bag']) &&
    hasAny(hay, ['snack pot', 'spare lid', 'replacement seal', 'lunchbox spare lid', 'water bottle', 'stainless steel cup', 'stainless steel water bottle', 'stainless steel lunch box', 'bento', 'lunchbox', 'lunch box', 'lunch', 'mug', 'tumbler', 'bottle', 'cup', 'thermos', 'food jar', 'stainless', 'kitchen', 'plate', 'bowl', 'drinking straw', 'reusable straw', 'silicone straw', 'straw lid', 'straw cup', 'drinkware', 'cookie cutter', 'baking set', 'mold', 'apron'])
  ) return 'kitchen'
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

  // 'toddler' is gone for the same reason 'newborn' left the rule at the top:
  // it says who the thing is for, not what it is, so it turned a "Toddler
  // Backpack" into a learning toy. The comment above this rule already records
  // that it once did the same to a "Toddler T-Shirt".
  if (hasAny(hay, ['montessori', 'wooden', 'learning', 'educational', 'busy board', 'fine motor', 'activity board', 'weather board', 'alphabet', 'matching game', 'tower challenge', 'pretend play'])) return 'learning'
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

/**
 * One row of an AWIN "Awin" (standard) format product feed, reduced to the
 * columns this site reads. Create-a-Feed emits about ninety; the rest are
 * ignored rather than typed.
 */
export type AwinRow = Record<string, string>

/**
 * Map an AWIN product feed into the same `Product` shape the Shopify scraper
 * produces.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS LIVES HERE AND NOT IN lib/awin-feed.ts
 *
 * `contentSafe()` and `vendorDefaultCat()` are module-private, and the kid-safe
 * text filter is the one thing that must apply identically no matter where a
 * product came from. Widening those to exports so a second file could call them
 * would make it possible to write an ingest path that quietly skips them. The
 * transport concerns (fetch, gzip, CSV) live in lib/awin-feed.ts; the judgement
 * about what a Product is lives next to the only other function that decides it.
 *
 * -----------------------------------------------------------------------------
 * THE FEED CARRIES product_type, WHICH THE SCRAPER THROWS AWAY
 *
 * §4f records the cost of that: "plush" is an adjective as often as a noun, and
 * because the vendor's own product_type never reaches `Product`, a board has to
 * guess from the name. Here it is right there in the row, so it goes into the
 * classifier haystack. This does not fix the Shopify path, which still needs a
 * scrape change and a cache bump, but it does mean feed-sourced vendors start
 * out better classified than scraped ones.
 */
export function mapAwinRows(
  cfg: typeof VENDORS[number],
  rows: AwinRow[]
): Product[] {
  const out: Product[] = []
  const seen = new Set<string>()

  /**
   * A Create-a-Feed download can hold SEVERAL advertisers in one file, which is
   * the sensible way to buy them: one URL, one fetch, every AWIN merchant we
   * carry. It is also a silent catastrophe if nobody checks, because this
   * function stamps `vendor: cfg.vendor` on every row it maps. Handed a
   * combined feed, it would file MamaRaya's nursery baskets and BRKOX's LEGO
   * frames under GiftLAB, at GiftLAB's commission, linking to GiftLAB's
   * programme. Every product would look fine and every attribution would be
   * wrong.
   *
   * So a vendor with an awinMerchantId takes only its own rows. `merchant_id`
   * is in the standard Awin column set. A single-advertiser feed is unaffected
   * because every row already matches, and a feed with no merchant_id column at
   * all falls through rather than mapping nothing.
   */
  const wantMerchant = String(cfg.awinMerchantId || '').trim()
  const feedHasMerchantId = rows.some((r) => String(r.merchant_id || '').trim())

  for (const r of rows || []) {
    if (wantMerchant && feedHasMerchantId && String(r.merchant_id || '').trim() !== wantMerchant) continue
    const id = (r.merchant_product_id || r.aw_product_id || '').trim()
    const name = (r.product_name || '').trim()
    if (!id || !name) continue

    // A feed lists every variant as its own row, so the same merchant_product_id
    // can appear several times. First wins; without this the grid shows one
    // product once per size.
    if (seen.has(id)) continue
    seen.add(id)

    const type = (r.product_type || r.merchant_category || '').trim()
    if (!typeAllowed(cfg, type)) continue

    // in_stock is "1"/"0" in the Awin format. Treat anything explicitly zero as
    // out; treat an EMPTY value as in stock, because a merchant who does not
    // populate the column is not telling us the shelf is bare.
    if (String(r.in_stock ?? '').trim() === '0') continue
    if (String(r.is_for_sale ?? '').trim() === '0') continue

    const price = Number(r.search_price || r.display_price || 0) || 0
    if (price <= 0) continue

    let blurb = String(r.product_short_description || r.description || '')
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (/\{[^}]*[a-z-]+\s*:[^}]*\}/.test(blurb)) blurb = ''
    if (blurb.length > 140) blurb = blurb.slice(0, 137) + '...'

    // product_type and the merchant's category path both go in, which is more
    // signal than the scraper ever gets.
    const hay = `${name} ${type} ${r.merchant_product_category_path || ''} ${r.brand_name || ''} ${blurb}`
    if (!contentSafe(hay)) continue

    // rrp_price is the merchant's list price. Only a genuinely higher one is a
    // sale; feeds routinely repeat search_price into it.
    const rrp = Number(r.rrp_price || r.store_price || 0) || 0
    const onSale = rrp > price
    const discountPct = onSale ? Math.round((1 - price / rrp) * 100) : 0

    let cat = cfg.forceCat ?? categorize(hay)
    if (cat === 'other') cat = vendorDefaultCat(cfg.vendor)

    out.push({
      id: `${cfg.prefix}-${id}`,
      vendor: cfg.vendor,
      domain: cfg.domain,
      name,
      cat,
      character: detectCharacter(hay),
      kidSafe: isKidSafeText(hay, cat, name),
      price,
      unit: '',
      onSale,
      wasPrice: onSale ? rrp : 0,
      discountPct,
      commissionPct: cfg.commissionPct,
      couponCode: cfg.couponCode,
      couponPct: cfg.couponPct,
      image: proxied(r.merchant_image_url || r.aw_image_url || ''),
      // ALREADY TRACKED. aw_deep_link is an awin1.com redirect that AWIN built,
      // so affiliateUrl() must not wrap it a second time; it checks for that
      // host and returns early. See the note there.
      url: (r.aw_deep_link || r.merchant_deep_link || '').trim(),
      badge: '',
      // A feed has no first-seen date. last_updated is when the MERCHANT last
      // touched the row, which moves on every price change, so using it would
      // reshuffle the RSS feeds under Pinterest every time a price moved (§4f).
      // Left empty; catalog-source stamps it once on first ingest.
      added: '',
      variants: [],
      blurb,
    })
  }
  return out
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
    /**
     * A SHOWCASE vendor keeps the description at length; everybody else gets
     * the 140 characters a grid card can show.
     *
     * The cut is right for a tile among two thousand and wrong for a page about
     * six products, where /everblog's cards offered a "read more" that revealed
     * nothing because nothing more had been carried. Bounded rather than whole:
     * these are marketing bodies and a few hundred words of it is a wall.
     *
     * Gated on `cfg.showcase` for the reason §4b gives: Next's data cache
     * rejects an entry over 2MB, Kore Kawaii already maps to 1.41MB, and a
     * fuller description on every product would stop that vendor caching with
     * no error to say so. Showcase vendors are a handful of rows each.
     */
    const details = cfg.showcase && blurb.length > 140 ? blurb.slice(0, 1400).trim() : undefined
    if (blurb.length > 140) blurb = blurb.slice(0, 137) + '...'

    const tagsStr = Array.isArray(p.tags) ? p.tags.join(' ') : String(p.tags || '')
    const hay = `${p.title || ''} ${p.product_type || ''} ${tagsStr} ${blurb}`
    if (!contentSafe(hay, p.title || '')) continue

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
      ...(details ? { details } : {}),
    })
  }
  return out
}

/* ============================================================
   WOOCOMMERCE, the second door.
   ------------------------------------------------------------
   WHY THIS EXISTS. Until now this file knew exactly one way to
   read a merchant: Shopify's products.json. That made "we cannot
   read this shop" and "this shop has no catalogue" look identical
   from inside the codebase, and on 2026-08-31 that cost a wrong
   call: five approved merchants answered 404 on products.json and
   were nearly written off as having no feed. Three of them run
   WooCommerce and hand over their whole catalogue through the
   Store API, which is a public, unauthenticated, read-only
   endpoint built for exactly this.

   IT LIVES BESIDE mapShopifyProducts ON PURPOSE. contentSafe(),
   typeAllowed(), isKidSafeText() and vendorDefaultCat() are
   private to this module, and the kid-safety story depends on
   EVERY row passing through them whichever door it came in by. A
   mapper written in another file could only reach the exported
   half, and the half it could not reach is the half that matters.
   Keeping the two mappers adjacent also makes drift visible: if
   one grows a rule, the other is right there not having it.

   THE MINOR-UNIT TRAP, which is the one thing about this API that
   will bite. Woo returns prices as INTEGER STRINGS in the
   currency's smallest unit, with the scale in the same object:
   { price: "2499", currency_minor_unit: 2 } is $24.99, not
   $2,499. Read as a float it inflates every price by a hundred
   times, and nothing downstream would flag it: the cards would
   render, the sort would work, the filters would work, and a
   plush toy would cost three thousand dollars.
   ============================================================ */

export type WooProductRaw = {
  id?: number
  name?: string
  slug?: string
  permalink?: string
  description?: string
  short_description?: string
  type?: string
  is_in_stock?: boolean
  is_purchasable?: boolean
  date_created?: string
  prices?: {
    price?: string
    regular_price?: string
    sale_price?: string
    currency_minor_unit?: number
    price_range?: { min_amount?: string; max_amount?: string } | null
  }
  images?: { src?: string }[]
  categories?: { name?: string }[]
  tags?: { name?: string }[]
}

/** Woo's minor-unit integer string to a real number. See the trap above. */
function wooAmount(raw: string | undefined, minorUnit: number | undefined): number {
  if (raw == null || raw === '') return 0
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  const scale = Number.isFinite(minorUnit as number) ? (minorUnit as number) : 2
  return n / Math.pow(10, scale)
}

export function mapWooProducts(
  cfg: typeof VENDORS[number],
  raw: WooProductRaw[]
): Product[] {
  const out: Product[] = []
  for (const p of raw || []) {
    if (!p || !p.slug || !p.permalink) continue

    /* Woo has no product_type field. Its categories are the nearest
       equivalent and are what an include list would be written from,
       so they are what typeAllowed() is asked about: any one of them
       matching is enough. A shop with no include list is unaffected. */
    const cats = (p.categories || []).map((c) => c.name || '').filter(Boolean)
    if (cats.length && !cats.some((c) => typeAllowed(cfg, c))) continue
    if (!cats.length && !typeAllowed(cfg, '')) continue

    /* Purchasability, not just stock. A Woo catalogue carries
       non-purchasable rows (external/affiliate stubs, hidden parents)
       that render as a card with a price and cannot be bought. */
    if (p.is_in_stock === false || p.is_purchasable === false) continue

    const mu = p.prices?.currency_minor_unit
    const range = p.prices?.price_range
    const minP = range?.min_amount
      ? wooAmount(range.min_amount, mu)
      : wooAmount(p.prices?.price, mu)
    if (!(minP > 0)) continue
    const regular = wooAmount(p.prices?.regular_price, mu)

    /* Same cleaning as the Shopify path, same reason: a description
       body with a <style> block in it becomes CSS on the card, in the
       meta description, and in whatever categorize() then decides. */
    let blurb = String(p.short_description || p.description || '')
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (/\{[^}]*[a-z-]+\s*:[^}]*\}/.test(blurb)) blurb = ''
    const details = cfg.showcase && blurb.length > 140 ? blurb.slice(0, 1400).trim() : undefined
    if (blurb.length > 140) blurb = blurb.slice(0, 137) + '...'

    const tagsStr = (p.tags || []).map((t) => t.name || '').join(' ')
    /* DECODED BEFORE ANYTHING READS IT. Woo hands names over HTML-encoded, so
       an undecoded title reaches the card, the classifier haystack and the
       weapon test all three as literal "&#8211;". */
    const name = decodeEntities(p.name || '')
    const hay = `${name} ${cats.join(' ')} ${tagsStr} ${blurb}`
    if (!contentSafe(hay, name)) continue

    const onSale = regular > 0 && regular > minP
    let cat = cfg.forceCat ?? categorize(hay)
    if (cat === 'other') cat = vendorDefaultCat(cfg.vendor)

    out.push({
      id: `${cfg.prefix}-${p.slug}`,
      vendor: cfg.vendor,
      domain: cfg.domain,
      name,
      cat,
      character: detectCharacter(hay),
      kidSafe: isKidSafeText(hay, cat, name),
      price: minP,
      /* "from" when the row really does span a range. The Store API
         gives variable products a price_range and no per-variant
         rows, so a variant list cannot be built here and claiming
         one would be inventing options nobody can pick. */
      unit: range?.max_amount && wooAmount(range.max_amount, mu) > minP ? 'from' : '',
      onSale,
      wasPrice: onSale ? regular : 0,
      discountPct: onSale ? Math.round((1 - minP / regular) * 100) : 0,
      commissionPct: cfg.commissionPct,
      couponCode: cfg.couponCode,
      couponPct: cfg.couponPct,
      image: proxied(p.images?.[0]?.src ?? ''),
      /* The merchant's own permalink, verbatim. Woo installs differ on
         whether products live at /product/<slug>/ or under a nested
         category path, so a URL rebuilt from the slug 404s on some of
         them. The feed already knows the right one. */
      url: p.permalink,
      badge: '',
      added: p.date_created || '',
      variants: [],
      blurb,
      ...(details ? { details } : {}),
    })
  }
  return out
}

/* ============================================================
   JSON-LD, the third door and the last one available.
   ------------------------------------------------------------
   Two merchants have no machine-readable catalogue at all: no
   products.json, no wp-json, and no platform fingerprint in their
   HTML. What they do have is product pages, and a product page
   almost always carries schema.org Product markup, because that is
   what puts a price in a Google result. It is published for a
   crawler, which is what makes it fair game and also what makes it
   the most stable thing on the page: a redesign moves the markup
   around, a redesign that DROPS it costs the merchant its rich
   snippets, so it tends to survive.

   IT IS STILL THE WORST DOOR AND IS RANKED LAST FOR A REASON. A
   feed is one request for a whole catalogue; this is one request
   per product. That cost is why the caller caps it hard rather
   than reading everything a sitemap offers.

   SAME GATES AS EVERY OTHER DOOR. contentSafe, typeAllowed,
   isKidSafeText, vendorDefaultCat, the replica-weapon rule: all of
   it, because a row's provenance must not change what it has to
   pass to reach a child's screen.
   ============================================================ */

export type JsonLdProduct = {
  name?: string
  description?: string
  image?: unknown
  sku?: string
  offers?: unknown
  category?: string
}

/** First Product node in any ld+json block on the page, or null. */
export function findLdProduct(html: string): JsonLdProduct | null {
  const blocks = html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)
  for (const b of blocks) {
    let parsed: unknown
    try { parsed = JSON.parse(b[1].trim()) } catch { continue }
    const stack: unknown[] = [parsed]
    while (stack.length) {
      const node = stack.pop() as Record<string, unknown>
      if (!node || typeof node !== 'object') continue
      if (Array.isArray(node)) { stack.push(...node); continue }
      if (Array.isArray(node['@graph'])) stack.push(...(node['@graph'] as unknown[]))
      const t = node['@type']
      const isProduct = t === 'Product' || (Array.isArray(t) && (t as string[]).includes('Product'))
      if (isProduct && typeof node.name === 'string') return node as JsonLdProduct
    }
  }
  return null
}

/** Lowest price across whatever shape `offers` came in as. */
function ldPrice(offers: unknown): number {
  const found: number[] = []
  const walk = (o: unknown) => {
    if (!o) return
    if (Array.isArray(o)) return o.forEach(walk)
    if (typeof o !== 'object') return
    const r = o as Record<string, unknown>
    for (const k of ['price', 'lowPrice', 'lowprice']) {
      const v = r[k]
      const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
      if (Number.isFinite(n) && n > 0) found.push(n)
    }
    if (r.priceSpecification) walk(r.priceSpecification)
    if (Array.isArray(r.offers)) walk(r.offers)
  }
  walk(offers)
  return found.length ? Math.min(...found) : 0
}

function ldImage(image: unknown): string {
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return ldImage(image[0])
  if (image && typeof image === 'object') {
    const u = (image as Record<string, unknown>).url
    if (typeof u === 'string') return u
  }
  return ''
}

export function mapLdProducts(
  cfg: typeof VENDORS[number],
  rows: { url: string; ld: JsonLdProduct }[]
): Product[] {
  const out: Product[] = []
  for (const { url, ld } of rows) {
    const name = decodeEntities(String(ld.name || ''))
    if (!name || !url) continue
    if (ld.category && !typeAllowed(cfg, String(ld.category))) continue

    const price = ldPrice(ld.offers)
    if (!(price > 0)) continue   // a card with no price is not a card

    let blurb = decodeEntities(
      String(ld.description || '').replace(/<[^>]*>/g, ' ')
    ).replace(/\s+/g, ' ').trim()
    if (/\{[^}]*[a-z-]+\s*:[^}]*\}/.test(blurb)) blurb = ''
    const details = cfg.showcase && blurb.length > 140 ? blurb.slice(0, 1400).trim() : undefined
    if (blurb.length > 140) blurb = blurb.slice(0, 137) + '...'

    const hay = `${name} ${ld.category || ''} ${blurb}`
    if (!contentSafe(hay, name)) continue

    let cat = cfg.forceCat ?? categorize(hay)
    if (cat === 'other') cat = vendorDefaultCat(cfg.vendor)

    /* The slug off the merchant's own URL, so the id is stable across
       runs even though nothing here has a numeric product id. */
    const slug = url.replace(/[?#].*$/, '').replace(/\/$/, '').split('/').pop() || ''
    out.push({
      id: `${cfg.prefix}-${slug}`,
      vendor: cfg.vendor, domain: cfg.domain, name, cat,
      character: detectCharacter(hay),
      kidSafe: isKidSafeText(hay, cat, name),
      price, unit: '', onSale: false, wasPrice: 0, discountPct: 0,
      commissionPct: cfg.commissionPct, couponCode: cfg.couponCode, couponPct: cfg.couponPct,
      image: proxied(ldImage(ld.image)),
      url, badge: '', added: '', variants: [], blurb,
      ...(details ? { details } : {}),
    })
  }
  return out
}
