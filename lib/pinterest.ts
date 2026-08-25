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
  const pool = PIN_TAGS_BY_CAT[cat] || PIN_TAGS_BY_CAT.other
  add(pool[0]); add(pool[1])
  const name = String(o.name || '')
  for (const [re, tag] of PIN_TAGS_KEYWORD) {
    if (re.test(name)) { add(tag); break }
  }
  const seas = seasonalTag()
  if (seas && ['plush', 'collect', 'home', 'stationery', 'kitchen'].includes(cat)) add(seas)
  add(PIN_TAGS_UNIVERSAL[0])
  for (let j = 2; j < pool.length && out.length < 5; j++) add(pool[j])
  return out.slice(0, 5)
}

function pinCartUrl(o: Pinnable): string {
  const base = o.url || o.domain || ''
  return couponWrapUrl(affiliateUrl(base, o.vendor), o.vendor)
}

function pinDescription(o: Pinnable): string {
  const name = (o.name || '').trim()
  const vendor = (o.vendor || '').trim()
  const cName = catName(o.cat || 'other')
  const cLead = cName.toLowerCase().replace(/ & .*/, '').replace(/s$/, '')
  const tags = pinHashtags(o)
  const priceTxt = Number(o.price) > 0 ? ` Just ${money(o.price)}.` : ''
  const body = `${name} — a kawaii ${cLead} pick from ${vendor}.${priceTxt} Cute, clever & kind finds curated on Kawaii Katz.`
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

/** Convenience wrapper for a full Product. Pins the affiliate deep link. */
export function pinProduct(p: Product): void {
  openPin({
    id: p.id,
    name: p.name,
    vendor: p.vendor,
    cat: p.cat,
    price: p.price,
    image: p.image,
    url: p.url || p.domain,
    domain: p.domain,
  })
}

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
export function pinProductPage(p: Product, origin?: string): void {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
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
  })
}
