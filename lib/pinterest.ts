import { catName, money, affiliateUrl, couponWrapUrl, type Product } from './data'
import { unproxied } from './catalog-shared'

/**
 * Ported from the original Kawaii Katz app: builds a Pinterest "Pin it" share
 * that links to the add-to-cart deep link (affiliate + coupon applied), with a
 * keyword-rich caption and smart, category/keyword/seasonal hashtags.
 */

type Pinnable = {
  id: string
  name: string
  vendor: string
  cat: string
  price: number
  image: string
  url: string
  domain?: string
  /** Overrides the pin's destination. See pinProductPage(). */
  pinUrl?: string
  /**
   * A hashtag to place ahead of the automatic ones, overriding seasonalTag().
   * Set by the gift guides: seasonalTag() is month-based and returns
   * ChristmasGiftIdeas only in November and December, which is right for a Pin
   * taken off the shop floor and wrong for one taken off the Christmas guide in
   * August — when, Pinterest being three months ahead of every season, it is
   * most worth pinning.
   */
  tag?: string
  /**
   * The category word the caption should use, overriding the product's own.
   *
   * Set by the RSS feeds and by anything else pinning FROM a collection. The
   * caption used to read the product's `cat` unconditionally, which meant the
   * plushies feed published six items captioned "a kawaii blind box pick" and
   * one as "a kawaii kitchen pick": a Hello Kitty plush toy, three Astronaut
   * plush figures, and the plushie water bottle covers. All correctly
   * categorised as products, all wrong for the board they were being pinned to.
   *
   * That is not cosmetic. A Pin's first save should match its board's topic,
   * and a plushies board full of Pins calling themselves blind boxes is a topic
   * mismatch on every one of them.
   *
   * Same shape as `tag` above and for the same reason: the collection knows
   * something about the context of this Pin that the product record cannot.
   */
  catLead?: string
  /**
   * The hashtag pool to draw from, overriding the product's own category.
   *
   * The other half of the same defect `catLead` fixes, and it shipped because
   * the fix was checked by reading the prose and not the tags. A Hello Kitty
   * plush on the plushies feed had its caption corrected to "a kawaii plushie
   * pick" and still went out carrying #BlindBoxUnboxing and
   * #KawaiiCollectibles, because those come from the product record and it is
   * genuinely a `collect` row.
   *
   * Hashtags are how Pinterest reads a Pin's topic, so this half arguably
   * matters more than the sentence: a plushies board whose Pins are tagged as
   * blind boxes is telling Pinterest the board is about blind boxes.
   *
   * Empty for a season, deliberately. A Christmas guide holds every category
   * at once, its own `tag` already leads every Pin, and the product's own tags
   * are the accurate ones for the rest.
   */
  catTags?: string[]
  /**
   * The aesthetic word the caption leads with, default "kawaii".
   *
   * Set by the Decora boards (lib/decora.ts), which are a second Pinterest
   * vocabulary over the same shelf. "A kawaii top pick" is the shop floor's
   * sentence and it is the wrong one on a board about Japanese street fashion:
   * that room sells to somebody building an outfit, not to somebody buying a
   * plushie, and the whole reason it has its own boards is that the two should
   * not blend.
   */
  style?: string
  /** The closing sentence, default the storefront's. Same reason as `style`. */
  tail?: string
}

/**
 * What a collection knows about a Pin that the product record does not.
 *
 * One object rather than three loose props because all three always travel
 * together, always come from a Board, and each has been added separately to the
 * same four call sites in turn.
 */
export type PinContext = {
  tag?: string
  catLead?: string
  catTags?: string[]
  style?: string
  tail?: string
}

const PIN_TAGS_BY_CAT: Record<string, string[]> = {
  plush: ['KawaiiPlushies', 'PlushieCollection', 'CutePlushies', 'SoftToys', 'PlushieLover'],
  collect: ['BlindBoxUnboxing', 'KawaiiCollectibles', 'DesignerToys', 'ToyCollection', 'CollectibleFigures'],
  stationery: ['KawaiiStationery', 'CuteStationery', 'StationeryAddict', 'PlannerSupplies', 'KawaiiStickers'],
  apparel: ['KawaiiFashion', 'CuteOutfits', 'KawaiiClothing', 'KidsFashion', 'KawaiiStyle'],
  accessories: ['KawaiiAccessories', 'CuteAccessories', 'KawaiiBackpack', 'KidsAccessories', 'AccessoryHaul'],
  home: ['KawaiiRoomDecor', 'CuteHomeDecor', 'KawaiiBedroom', 'KidsRoomDecor', 'AestheticRoom'],
  kitchen: ['KawaiiBento', 'CuteLunchBox', 'BentoBox', 'KidsLunchIdeas', 'KawaiiKitchen'],
  puzzle: ['JigsawPuzzle', 'FamilyGameNight', 'PuzzleLover', 'KidsPuzzles', 'PuzzleTime'],
  learning: ['MontessoriToys', 'WoodenToys', 'EducationalToys', 'ToddlerLearning', 'OpenEndedPlay'],
  tech: ['KawaiiTech', 'CuteGadgets', 'GamingSetup', 'KawaiiDesk', 'TechAccessories'],
  food: ['JapaneseSnacks', 'KawaiiSnacks', 'AsianSnacks', 'SnackHaul', 'SnackLover'],
  charms: ['CuteKeychain', 'KawaiiCharms', 'BagCharm', 'KeychainCollection', 'KawaiiAccessories'],
  other: ['KawaiiFinds', 'CuteStuff', 'KawaiiShop', 'KawaiiAesthetic', 'KawaiiGifts'],
}
const PIN_TAGS_UNIVERSAL = ['KawaiiKatz', 'KawaiiAesthetic', 'KawaiiGifts']
const PIN_TAGS_KEYWORD: [RegExp, string][] = [
  [/bunny|rabbit/i, 'BunnyPlush'], [/\bcat\b|kitty|neko/i, 'CatLover'], [/bear/i, 'TeddyBear'],
  [/dog|puppy|shiba|corgi/i, 'PuppyPlush'], [/frog/i, 'FrogPlush'], [/axolotl/i, 'AxolotlPlush'],
  [/duck/i, 'DuckPlush'], [/dino|dinosaur/i, 'DinoPlush'], [/panda/i, 'PandaPlush'],
  [/strawberry/i, 'StrawberryKawaii'], [/mushroom/i, 'CottagecoreDecor'],
  [/backpack/i, 'KawaiiBackpack'], [/keychain|key chain|charm/i, 'CuteKeychain'],
  [/sticker/i, 'StickerObsession'], [/lunch|bento/i, 'KidsLunchIdeas'],
  [/water bottle|tumbler/i, 'CuteWaterBottle'], [/pen\b|pencil/i, 'StationeryHaul'],
  [/hoodie|sweater/i, 'KawaiiOutfit'], [/socks/i, 'CuteSocks'],
  [/night ?light|lamp/i, 'RoomDecorIdeas'], [/pillow|cushion/i, 'CuteThrowPillow'],
  [/blind box|blindbox/i, 'BlindBox'], [/squish/i, 'SquishyToy'],
]

function seasonalTag(): string {
  const m = new Date().getMonth()
  if (m === 10 || m === 11) return 'ChristmasGiftIdeas'
  if (m === 0) return 'NewYearTreat'
  if (m === 1) return 'ValentinesGift'
  if (m === 6 || m === 7) return 'BackToSchool'
  if (m === 9) return 'HalloweenKawaii'
  return ''
}
function tagToken(s: string): string {
  return String(s || '').replace(/[^A-Za-z0-9]+/g, '')
}

function pinHashtags(o: Pinnable): string[] {
  const out: string[] = []
  const seen: Record<string, boolean> = {}
  const add = (tag: string) => {
    tag = tagToken(tag)
    if (!tag) return
    const low = tag.toLowerCase()
    if (seen[low]) return
    seen[low] = true
    out.push(tag)
  }
  const cat = o.cat || 'other'
  const pool = (o.catTags?.length ? o.catTags : PIN_TAGS_BY_CAT[cat]) || PIN_TAGS_BY_CAT.other
  // First, so it survives the slice(0, 5) below whatever else matches.
  if (o.tag) add(o.tag)
  add(pool[0]); add(pool[1])
  const name = String(o.name || '')
  for (const [re, tag] of PIN_TAGS_KEYWORD) {
    if (re.test(name)) { add(tag); break }
  }
  // Only when the caller has not named a season itself. #BackToSchool next to
  // #ChristmasGiftIdeas on the same Pin is worse than either alone.
  const seas = o.tag ? '' : seasonalTag()
  if (seas && ['plush', 'collect', 'home', 'stationery', 'kitchen'].includes(cat)) add(seas)
  add(PIN_TAGS_UNIVERSAL[0])
  for (let j = 2; j < pool.length && out.length < 5; j++) add(pool[j])
  return out.slice(0, 5)
}

function pinCartUrl(o: Pinnable): string {
  const base = o.url || o.domain || ''
  return couponWrapUrl(affiliateUrl(base, o.vendor), o.vendor)
}

/**
 * The caption a Pin carries. Exported because the RSS feeds build the same
 * caption server-side — a Pin that Pinterest creates from a feed should read
 * exactly like one a person made with the button, `#ad` included. Two callers,
 * one function; a second copy would drift and the drifting half would be the
 * one nobody reads, because nobody reads their own RSS.
 *
 * Pure: no window, no Date beyond seasonalTag(), safe in a route handler.
 */
export function pinCaption(o: Pinnable): string {
  return pinDescription(o)
}

/**
 * The singular noun a caption uses for each category.
 *
 * Derived from catName() for years, by lowercasing, cutting at " & " and
 * stripping a trailing "s" — which works for "Plushies" and breaks on the two
 * that do not pluralise that way. "Blind Boxes & Collectibles" became
 * "blind boxe" and "Accessories" became "accessorie", so 993 of 4,426 products
 * carried a typo into every Pin caption and every RSS description.
 *
 * Spelled out rather than fixed with a cleverer regex: there are twelve of
 * them, they change about once a year, and a written list cannot be wrong in a
 * new way when someone adds the thirteenth.
 */
const CAT_LEAD: Record<string, string> = {
  plush: 'plushie',
  collect: 'blind box',
  stationery: 'stationery',
  apparel: 'apparel',
  accessories: 'accessory',
  home: 'home decor',
  kitchen: 'kitchen',
  puzzle: 'puzzle',
  learning: 'wooden toy',
  tech: 'tech',
  food: 'snack',
  charms: 'charm',
  other: 'gift',
}

function pinDescription(o: Pinnable): string {
  const name = (o.name || '').trim()
  const vendor = (o.vendor || '').trim()
  const cName = catName(o.cat || 'other')
  const cLead =
    o.catLead ??
    CAT_LEAD[o.cat || 'other'] ??
    cName.toLowerCase().replace(/ & .*/, '').replace(/s$/, '')
  const tags = pinHashtags(o)
  const priceTxt = Number(o.price) > 0 ? ` Just ${money(o.price)}.` : ''
  const style = o.style || 'kawaii'
  const tail = o.tail || 'Cute, clever & kind finds curated on Kawaii Katz.'
  const body = `${name}: a ${style} ${cLead} pick from ${vendor}.${priceTxt} ${tail}`
  const hashline = ' #ad ' + tags.map((t) => '#' + t).join(' ')
  return (body.slice(0, 480 - hashline.length) + hashline).slice(0, 480)
}

export function pinItUrl(o: Pinnable): string {
  // Every caller passes the proxied image, because that is what the cards
  // render — a root-relative /api/img path. Pinterest cannot resolve one and
  // says so: "Parameter 'image_url' … is not a valid URL format". Unwrap it
  // back to the vendor's CDN URL; see the note on unproxied().
  const img = unproxied(o.image || '')
  const url = o.pinUrl || pinCartUrl(o)
  const desc = pinDescription(o)
  // Omit `media` entirely rather than sending something Pinterest will reject.
  // Without it the composer lets the pinner choose an image off the destination
  // page, which is a working pin; with a bad one it is an error dialog.
  const media = /^https?:\/\//i.test(img) ? '&media=' + encodeURIComponent(img) : ''
  return (
    'https://www.pinterest.com/pin/create/button/?url=' +
    encodeURIComponent(url) +
    media +
    '&description=' +
    encodeURIComponent(desc)
  )
}

/** Opens the Pinterest "Pin it" composer in a popup (falls back to same-tab). */
export function openPin(o: Pinnable): void {
  const u = pinItUrl(o)
  try {
    window.open(u, '_blank', 'noopener,width=760,height=680')
  } catch {
    window.location.href = u
  }
}

/**
 * NOTE: there is deliberately no wrapper that pins the affiliate deep link.
 *
 * There used to be — `pinProduct` — and every pin button in the app called it,
 * which made every pin this site produced an affiliate pin. Pinterest's
 * community guidelines limit those "repetitively or in large volumes", and a
 * shop with 4,400 products and a pin button on each one is exactly the shape
 * that limit is aimed at.
 *
 * Keeping both would have been worse than removing one: two functions that
 * differ only in destination, with nothing to stop the wrong one being picked
 * next time. See pinProductPage below — it is now the only way to pin.
 */

/**
 * Pins the Kawaii Katz product page instead of the merchant deep link.
 *
 * The difference is not cosmetic. A pin at the vendor's affiliate URL IS an
 * affiliate pin, and Pinterest's community guidelines limit those "repetitively
 * or in large volumes". A pin at /p/<id> is a link to our own page on our own
 * domain — the affiliate hop happens after the visitor arrives and chooses to
 * leave. It also lands them somewhere the Gift Finder and the taste profile can
 * work, rather than bouncing them straight off the site.
 *
 * `pinUrl` overrides the destination; everything else — the image, the caption,
 * the hashtags — is unchanged, because all of that was already right.
 */
export function pinProductPage(
  p: Product,
  opts?: PinContext & { origin?: string }
): void {
  const base = opts?.origin || (typeof window !== 'undefined' ? window.location.origin : '')
  openPin({
    id: p.id,
    name: p.name,
    vendor: p.vendor,
    cat: p.cat,
    price: p.price,
    image: p.image,
    url: p.url || p.domain,
    domain: p.domain,
    pinUrl: `${base}/p/${p.id}`,
    tag: opts?.tag,
    catLead: opts?.catLead,
    catTags: opts?.catTags,
    style: opts?.style,
    tail: opts?.tail,
  })
}

/**
 * Pins a COLLECTION rather than a product: a gift guide, or a shelf on /decora.
 *
 * This is the Pin that is actually worth making. A collection URL keeps working
 * for a whole season, holds dozens of products behind one click, and is the
 * shape of thing Pinterest search rewards, where a Pin per product made in
 * volume is the shape its community guidelines limit.
 *
 * Generalised out of pinGuide, which was hardcoded to `/gifts/<slug>` and to
 * the gift-guide hashtag set. The Decora shelves need the same Pin at a
 * different path with a different vocabulary, and a second copy of this would
 * have drifted the moment one of them was fixed.
 *
 * `image` may be a product's proxied `/api/img` path, a site-relative asset, or
 * an absolute URL. The first is unproxied because robots.txt disallows `/api/`,
 * so Pinterest is not permitted to fetch it. That trap has now been hit four
 * times: the Pin button, og:image, the RSS feeds, and this.
 */
export function pinCollection(o: {
  /** Site-relative destination, e.g. `/gifts/christmas` or `/decora#bags`. */
  path: string
  title: string
  tagline: string
  /** Leads the hashtags, overriding the month-based seasonalTag(). */
  tag: string
  /** The pool under it. Defaults to the gift-guide set. */
  tags?: string[]
  /** Closing sentence. Defaults to the storefront's. */
  tail?: string
  image: string
  origin?: string
}): void {
  const base = o.origin || (typeof window !== 'undefined' ? window.location.origin : '')
  const raw = unproxied(o.image || '')
  const abs = /^https?:\/\//i.test(raw) ? raw : raw.startsWith('/') ? `${base}${raw}` : ''
  const media = abs ? '&media=' + encodeURIComponent(abs) : ''
  const pool = o.tags?.length ? o.tags : ['KawaiiGifts', 'KawaiiKatz', 'GiftGuide']
  // Deduped, because a board's lead hashtag is usually in its own pool too and
  // "#DecoraKei ... #DecoraKei" in one caption reads as a script wrote it.
  // pinHashtags() already does this for product Pins; this is the same rule.
  const seen = new Set<string>()
  const tags = ['#ad']
  for (const t of [o.tag, ...pool]) {
    const tok = tagToken(t)
    if (!tok || seen.has(tok.toLowerCase())) continue
    seen.add(tok.toLowerCase())
    tags.push('#' + tok)
  }
  const tail = o.tail || 'Curated on Kawaii Katz.'
  // A tagline that already ends in a full stop does not need the one the
  // template adds. Section blurbs are written as sentences; guide taglines are
  // not, and stripping one that is not there is a no-op.
  const line = String(o.tagline || '').replace(/[.\s]+$/, '')
  const desc = `${o.title}: ${line}. ${tail} ${tags.join(' ')}`.slice(0, 480)
  const u =
    'https://www.pinterest.com/pin/create/button/?url=' +
    encodeURIComponent(`${base}${o.path}`) +
    media +
    '&description=' +
    encodeURIComponent(desc)
  try {
    window.open(u, '_blank', 'noopener,width=760,height=680')
  } catch {
    window.location.href = u
  }
}

/**
 * Pins a gift guide itself rather than one product in it.
 *
 * `cover` supplies the image; without a product there is nothing for the
 * composer to show.
 */
export function pinGuide(o: {
  slug: string
  title: string
  tagline: string
  tag: string
  cover: Product
  origin?: string
}): void {
  pinCollection({
    path: `/gifts/${o.slug}`,
    title: o.title,
    tagline: o.tagline,
    tag: o.tag,
    image: o.cover.image || '',
    origin: o.origin,
  })
}
