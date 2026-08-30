import { hasWord } from './catalog-shared'
import type { Product } from './data'

/**
 * The Decora room: Kawaii Katz's fashion-forward end of the catalogue.
 *
 * -----------------------------------------------------------------------------
 * A ROOM, NOT A VENDOR PAGE, AND THE DIFFERENCE IS THE POINT
 *
 * /brkox and /giftlab are showcases: one merchant each, held OUT of the main
 * grid by `VendorConfig.showcase` because their stock does not belong scattered
 * through it. This is the opposite case. Grumpy Bunny's 438 products are
 * genuinely kawaii and genuinely belong on the home page, so nothing here
 * touches VENDORS and nothing is held back.
 *
 * What this page adds is EDITORIAL: the same shelf, read as a wardrobe rather
 * than as a catalogue. That is why `SOURCES` is a list rather than a constant.
 * The brief asks for "a reusable Kawaii Katz tween/Decora world that can later
 * host additional retailers without changing the core cast or design language",
 * and a second decora shop is one string here, not a second page.
 *
 * -----------------------------------------------------------------------------
 * THE AUDIENCE IS OLDER THAN THE REST OF THE SITE
 *
 * The home page sells to somebody buying a plushie. This sells to somebody
 * building an outfit. That is a real difference in copy register: short,
 * confident, never infantilising, and never baby-pastel. The palette here is
 * hot pink, violet, black and cyan rather than the site's cream and blush, and
 * that is deliberate rather than a drift away from the house style.
 */

/**
 * Shops this room draws from.
 *
 * A LIST, AND THE PAGE IS NAMED AFTER THE AESTHETIC RATHER THAN THE SHOP.
 *
 * The first draft of this page was titled "Kawaii Katz picks from Grumpy
 * Bunny", with their name in 88px display type. Jacob's call, and the right
 * one: it reads as their page even though every word on it is ours, and that
 * is the impression the handoff brief's own legal guardrail says not to give.
 *
 * So the room is "Kawaii Katz Goes Decora" and a shop is a SOURCE on it. That
 * is not just a safer framing, it is the honest one: we are the editorial, they
 * are the checkout. It also means a second decora shop is one entry here rather
 * than a second page, which is what the brief asked for in the first place.
 */
export const SOURCES = ['Grumpy Bunny']

export type Shop = {
  vendor: string
  home: string
  /** The shop's own description of itself. Never our claim about them. */
  says: string
  shipsFrom: string
  /** Labels they name on their own storefront. Feeds ANIME MODE and the edit. */
  brands: string[]
}

/**
 * Shop facts, kept in one place because they are CLAIMS and every one has to be
 * true.
 *
 * The brief is explicit that we must not invent partnerships, endorsements,
 * shipping promises, pricing or availability. So this holds only what a shop
 * says about itself, it renders as attribution rather than as our promise, and
 * anything time-sensitive (stock, delivery dates) is deliberately absent
 * because a page cached for six hours cannot keep a promise about either.
 */
export const SHOPS: Shop[] = [
  {
    vendor: 'Grumpy Bunny',
    home: 'https://grumpybunny.com',
    says: 'authentic Japanese brands, imported directly from Japan',
    shipsFrom: 'the UK',
    brands: [
      '6% DOKIDOKI', 'ACDC RAG', 'Dear My Love', 'Gloomy Bear',
      'Hypercore', 'Listen Flavor', 'Menhera Chan', 'Sanrio', 'San-X',
    ],
  },
]

/** Every label named across every shop in the room, deduped, order preserved. */
export const ALL_BRANDS = [...new Set(SHOPS.flatMap((s) => s.brands))]

/**
 * Bag nouns, word-anchored.
 *
 * `bag` is a substring of HANDBAG and of nothing else useful, but `tote` sits
 * inside no common word and `sling` inside none either, so the anchoring is
 * cheap insurance rather than a fix for a known bug. It is the same rule every
 * term list in lib/boards.ts follows and the reason is written up there: `elf`
 * is a substring of SHELF and that class of bug has cost this codebase real
 * time twice.
 */
const BAG_TERMS = [
  'bag', 'bags', 'handbag', 'backpack', 'rucksack', 'tote', 'pouch', 'pouches',
  'purse', 'wallet', 'crossbody', 'sling bag', 'shoulder bag', 'satchel',
  'coin case', 'card case', 'phone case', 'knapsack',
]

/**
 * The character and brand vocabulary that makes something ANIME MODE.
 *
 * Sanrio is 86 of the 438 and is listed by character as well as by house,
 * because a "Kuromi" tee never says Sanrio in its name. Measured against the
 * live catalogue before this list was written: the houses alone caught 149
 * rows, adding the characters caught 31 more.
 */
const ANIME_TERMS = [
  'sanrio', 'hello kitty', 'kuromi', 'my melody', 'cinnamoroll', 'pochacco',
  'gudetama', 'keroppi', 'badtz', 'pompompurin', 'little twin stars',
  'san-x', 'rilakkuma', 'sumikko', 'gurashi', 'korilakkuma',
  'gloomy bear', 'menhera', 'chax', 'pusheen', 'sailor moon', 'card captor',
  'anime', 'manga',
]

export type DecoraSection = {
  key: string
  /** The big display word. Rebuilt as HTML type, never baked into art. */
  title: string
  /** The small kicker above it. */
  kicker: string
  blurb: string
  max: number
  match: (p: Product) => boolean
}

const nameOf = (p: Product) => String(p.name || '').toLowerCase()
const hay = (p: Product) => `${p.name} ${p.blurb ?? ''} ${p.character ?? ''}`.toLowerCase()

/**
 * Sections fill IN ORDER and a product is used once.
 *
 * Same rule as the gift guides, for the same reason: it is what makes the page
 * read as curation rather than as eight filters over one shelf. A Sanrio hoodie
 * goes in ANIME MODE rather than appearing there AND in BUILD THE FIT, and the
 * sections below it get variety instead of the same twelve tops again.
 *
 * The consequence is that ORDER IS AN EDITORIAL DECISION. New arrivals lead
 * because they are the reason to come back; anime sits after the wardrobe
 * sections because a character tee is a top first and a collab second.
 */
export const SECTIONS: DecoraSection[] = [
  {
    key: 'new',
    kicker: 'Just landed',
    title: 'New from Japan',
    blurb: 'The most recent things to reach the shelf. Picked by us, shipped by the shop.',
    max: 12,
    match: () => true,
  },
  {
    key: 'fit',
    kicker: 'Tops, skirts, trousers, outerwear',
    title: 'Build the fit',
    blurb: 'Start with one loud piece and argue with it. Layers are the whole point.',
    max: 12,
    match: (p) => p.cat === 'apparel',
  },
  {
    key: 'more',
    kicker: 'Clips, jewellery, socks',
    title: 'More is more',
    blurb: 'Then add three more clips. Decora is a volume setting, not a colour.',
    max: 12,
    match: (p) => p.cat === 'accessories' && !hasWord(nameOf(p), BAG_TERMS),
  },
  {
    key: 'bags',
    kicker: 'Bags, pouches, charms',
    title: 'Bags and chaos',
    blurb: 'Your backpack looks lonely. Fix it.',
    max: 8,
    match: (p) => hasWord(nameOf(p), BAG_TERMS),
  },
  {
    key: 'desk',
    kicker: 'Notebooks, pens, cute stuff',
    title: 'Desk but make it kawaii',
    blurb: 'Stationery that makes homework marginally less of a betrayal.',
    max: 8,
    match: (p) => p.cat === 'stationery',
  },
  {
    key: 'room',
    kicker: 'Homeware, toys, plushies',
    title: 'Room loot',
    blurb: 'For the shelf above the desk, which is currently a crime scene.',
    max: 8,
    match: (p) => p.cat === 'home' || p.cat === 'plush' || p.cat === 'kitchen',
  },
  {
    key: 'anime',
    kicker: 'Anime, manga, collabs',
    title: 'Anime mode',
    blurb: 'The houses and the characters, when the shop has them in.',
    max: 12,
    match: (p) => hasWord(hay(p), ANIME_TERMS),
  },
]

/**
 * THE EDIT: one thing from each named Japanese label.
 *
 * Not a price band and not a bestseller list, because we cannot see what sells
 * (see the note in lib/site-events.ts: our clicks are not their sales, and a
 * "most popular" rail here would be a claim nothing backs). What we CAN stand
 * behind is a tour: the brands the shop is actually known for, one piece each,
 * so the section is a map of the catalogue rather than a guess at its hits.
 *
 * Deduped by brand, so a shop that is 103 rows of ACDC RAG contributes one.
 */
export function theEdit(products: Product[], used: Set<string>, max = 9): Product[] {
  const out: Product[] = []
  for (const brand of ALL_BRANDS) {
    const term = brand.toLowerCase()
    const hit = products.find(
      (p) => !used.has(p.id) && !out.includes(p) && hay(p).includes(term)
    )
    if (hit) out.push(hit)
    if (out.length >= max) break
  }
  return out
}

/** Newest first, with anything undated last rather than first. */
function byNewest(a: Product, b: Product): number {
  const x = Date.parse(a.added || '') || 0
  const y = Date.parse(b.added || '') || 0
  return y - x
}

/**
 * A product is only eligible if it can actually be rendered and clicked.
 *
 * The image check is not defensive padding: a decora page whose tiles are empty
 * boxes is worse than a shorter page, and this catalogue is scraped, so a
 * vendor changing its CDN shows up here first.
 */
function eligible(p: Product): boolean {
  return Boolean(p && p.id && p.name && p.price > 0 && String(p.image || '').trim())
}

export type FilledSection = { section: DecoraSection; products: Product[] }

/**
 * Fill every section from the room's sources.
 *
 * Pure and deterministic: this runs during a prerender AND again in the browser
 * once the live catalogue arrives, and the two have to agree or React reports a
 * hydration mismatch. No Math.random, no Date.now beyond the `added` field the
 * data itself carries. Same rule lib/boards.ts follows and for the same reason.
 */
export function fillDecora(all: Product[]): { sections: FilledSection[]; edit: Product[] } {
  const pool = all.filter((p) => SOURCES.includes(p.vendor) && eligible(p)).sort(byNewest)

  const used = new Set<string>()
  const sections: FilledSection[] = []

  for (const section of SECTIONS) {
    const picked: Product[] = []
    for (const p of pool) {
      if (picked.length >= section.max) break
      if (used.has(p.id)) continue
      if (!section.match(p)) continue
      picked.push(p)
      used.add(p.id)
    }
    sections.push({ section, products: picked })
  }

  // The edit runs LAST and over the whole pool rather than the leftovers: it is
  // a tour of the brands, and the best piece from a brand has usually already
  // been placed. Anything it repeats is repeated on purpose.
  const edit = theEdit(pool, new Set(), 9)

  return { sections: sections.filter((s) => s.products.length > 0), edit }
}

/** Everything this room can show, for the first-paint slice and the counts. */
export function decoraPool(all: Product[]): Product[] {
  return all.filter((p) => SOURCES.includes(p.vendor) && eligible(p)).sort(byNewest)
}

/* ===========================================================================
 * THE DECORA BOARDS: a second Pinterest vocabulary, on the same page
 * ===========================================================================
 *
 * Section 4f gives every BOARDS entry a Pinterest board and an RSS feed. Those
 * boards are the kawaii side of the house and their hashtag pools say so:
 * #KawaiiPlushies, #CuteLunchBox, #KidsFashion. Pointing a decora shelf at them
 * would be the exact defect section 4f already records twice, arriving by a
 * third route: a caption and a set of tags that disagree with the board they
 * are published to. A Menhera Chan hoodie tagged #KidsFashion is not a near
 * miss, it is a different shop.
 *
 * So this is a SECOND taxonomy over the SAME shelf, with its own board names,
 * its own hashtag pools and its own caption voice. Jacob's framing, and the
 * right one: "we don't really want the kawaii and decora sides blending", and
 * "keep this all on the same pages" — a Kawaii Katz Goes Decora section of
 * boards, fed from /decora, not a second set of guide pages.
 *
 * ---------------------------------------------------------------------------
 * NO GUIDE PAGES, DELIBERATELY, AND SECTION 4b IS WHY
 *
 * Every BOARDS entry generates a guide page AND a feed. Thirty catalogue-backed
 * prerenders already cost 5.2 minutes of build (measured on be62863), and the
 * guide's own conclusion is that "the next thing added here should be a shared
 * route rather than a thirteenth pair". These boards add feeds only: their page
 * already exists at /decora, and every feed links to a section anchor on it.
 * Six routes rather than twelve, and no duplicate editorial.
 *
 * ---------------------------------------------------------------------------
 * A PRODUCT BELONGS TO EXACTLY ONE BOARD
 *
 * The page's SECTIONS are capped, so a product the cap pushes out is simply not
 * shown. A feed is not capped: it publishes everything it is given. If two
 * boards could both claim a Sanrio backpack, Pinterest would receive the same
 * product twice under our own account, which is duplicate-content behaviour on
 * the one surface where it is visible to the platform.
 *
 * So `assignBoards()` is one pass in declaration order, first claim wins, and
 * the last board is a catch-all. Order is therefore an editorial decision, and
 * it is not the page's order:
 *
 *   - Objects claim before clothes. A Kuromi pencil case is stationery to
 *     somebody searching, whatever character is on it.
 *   - Character goods claim before plain garments, because a licensed hoodie is
 *     found by the character and not by the word hoodie.
 *   - Plain garments claim last, split top from bottom, with accessories as the
 *     catch-all.
 *
 * Measured against the live catalogue, 2026-08-30, over Grumpy Bunny's 438:
 * bags 17, desk 46, anime 95, fits 37, tops 190, clips 52 — 437 of 438, the one
 * left out being a gift card. Nothing else unassigned.
 *
 * Every one of those six was then read line by line before it shipped, which is
 * what section 4f says to do and what caught the four defects in it: a Listen
 * Flavor hoodie leading the desk board (categorised `plush`), a kimono and a
 * pair of arm warmers behind it (categorised `stationery`), a knapsack on the
 * hair-clip board, and origami paper and a pad of Ghibli Post-its there too.
 * None of them was visible from /decora, because the page shows the top of a
 * capped section and a feed carries all of it.
 */

/**
 * The caption voice, and the reason it is a field rather than a constant.
 *
 * pinCaption() writes "<name>: a kawaii <noun> pick from <vendor>. ... Cute,
 * clever & kind finds curated on Kawaii Katz." That sentence is correct for the
 * shop floor and wrong here in both halves. "Kawaii" is the word this room is
 * deliberately not using — it sells to somebody building an outfit, not to
 * somebody buying a plushie — and "cute, clever & kind" is the storefront's
 * promise rather than this room's.
 *
 * Both are overrides on PinContext with the old text as the default, so every
 * existing caller is unchanged.
 */
const DECORA_STYLE = 'Harajuku'
const DECORA_TAIL = 'Japanese street style, curated on Kawaii Katz.'

export type DecoraBoard = {
  key: string
  slug: string
  /**
   * The section id on /decora a Pin from this board should land on.
   *
   * Not the same as `key`, and it cannot be. The boards are a Pinterest
   * taxonomy over the shelf; the page's SECTIONS are a wardrobe. Three boards
   * (tops, fits, clips) split what the page shows as two sections, so each
   * names the shelf a visitor arriving from that Pin should actually see.
   */
  anchor: string
  /** What to call the board in Pinterest itself. Not rendered anywhere. */
  boardName: string
  title: string
  tagline: string
  /** Leads every Pin, overriding the month-based seasonalTag(). */
  hashtag: string
  /** The noun the caption uses: "a Harajuku <catLead> pick from <vendor>". */
  catLead: string
  /** This board's hashtag pool, replacing the kawaii per-category pools. */
  pinTags: string[]
  match: (p: Product) => boolean
}

/**
 * Not pinnable, whatever board would otherwise take it.
 *
 * A gift card has a real product page, a real price and a picture of a gift
 * card. It is also the one row on the shelf that cannot be an outfit, and a
 * board seeded with one reads as an automated dump on its first Pin — which is
 * how the plushies feed introduced itself with a Tesla (section 4f).
 */
const UNPINNABLE = ['gift card', 'giftcard', 'e-gift', 'gift voucher']

const TOP_TERMS = [
  'top', 'tops', 'tee', 't-shirt', 'tshirt', 'shirt', 'blouse', 'hoodie', 'hoody',
  'sweatshirt', 'sweater', 'jumper', 'cardigan', 'crop top', 'tank', 'vest',
  'pullover', 'knit', 'jacket', 'coat', 'parka', 'windbreaker', 'blazer',
  'bomber', 'anorak', 'poncho', 'cape', 'kimono', 'yukata', 'haori', 'scarf',
  'scarves',
]

const FIT_TERMS = [
  'skirt', 'skirts', 'trousers', 'pants', 'shorts', 'jeans', 'leggings',
  'salopette', 'overalls', 'dungarees', 'joggers', 'sweatpants', 'dress',
  'dresses', 'jsk', 'romper', 'playsuit', 'jumpsuit', 'onepiece', 'socks',
  'sock', 'tights', 'stockings', 'warmer', 'legwarmers', 'shoes',
  'sneakers', 'boots', 'platform', 'sandals', 'loafers',
]

const ROOM_CATS = ['stationery', 'home', 'plush', 'kitchen', 'tech']

/**
 * Desk nouns, for the rows the category cannot help with.
 *
 * `categorize()` files a fair amount of this shop as `other` — the histogram in
 * section 4 has the general case — so origami paper, a chopsticks set and a pad
 * of Ghibli Post-its all fell past the category test and were published to a
 * board about hair clips. Naming the object is the only signal left once the
 * category has given up.
 */
const DESK_TERMS = [
  'notepad', 'post-it', 'origami', 'chopstick', 'washi tape', 'memo pad',
  'notebook', 'art book', 'letter set', 'pencil case', 'sticker sheet',
]

/**
 * Anything the wardrobe boards name, which the desk board must not take.
 *
 * "Plush" is an adjective, and section 4f already paid for learning it: Kore
 * Kawaii and Kawaii Babe file soft goods as `plush` at the source, so the
 * plushies feed published handbags, trainers and 24 blanket hoodies as "a
 * kawaii plushie pick". The same trap is here by a different door — a Listen
 * Flavor hoodie is categorised `plush`, and because a feed is ordered
 * oldest-first it was the FIRST Pin the Decora desk board would ever have made.
 * That is the Tesla, exactly, on a board about washi tape.
 *
 * A name-anchored guard rather than a term list of individual offenders: the
 * boards below already say what a garment is called, so the desk board can just
 * defer to them.
 */
const GARMENT_TERMS = [...TOP_TERMS, ...FIT_TERMS]

/**
 * `anime` and `manga` are read from the NAME only; the houses and characters
 * are read from the blurb too.
 *
 * A character never says Sanrio in its name, which is why the blurb is read at
 * all (the note on ANIME_TERMS has the measurement). But a blurb that mentions
 * anime in passing is describing an influence, not a licence: it put a
 * "Zetsukigu futuristic collar" at the head of a board called Sanrio, San-X and
 * anime fits, captioned as a character pick. Two words, one narrower rule.
 */
const GENERIC_ANIME = ['anime', 'manga']
const CHARACTER_TERMS = ANIME_TERMS.filter((t) => !GENERIC_ANIME.includes(t))

export const DECORA_BOARDS: DecoraBoard[] = [
  {
    key: 'bags',
    slug: 'decora-bags',
    anchor: 'bags',
    boardName: 'Harajuku bags and ita bags',
    title: 'Harajuku bags and pouches',
    tagline: 'Totes, pouches and the bag you pin the rest of your collection to',
    hashtag: 'HarajukuBags',
    catLead: 'bag',
    pinTags: ['ItaBag', 'HarajukuFashion', 'JapaneseStreetFashion', 'DecoraKei', 'JFashion'],
    match: (p) => hasWord(nameOf(p), BAG_TERMS),
  },
  {
    key: 'desk',
    slug: 'decora-desk',
    anchor: 'desk',
    boardName: 'Decora desk and room',
    title: 'Decora desk and room',
    tagline: 'Washi tape, stickers, plushies and everything on the shelf above the desk',
    hashtag: 'HarajukuRoom',
    catLead: 'desk',
    pinTags: ['JapaneseStationery', 'HarajukuRoom', 'MaximalistDecor', 'AnimeRoomDecor', 'DecoraKei'],
    match: (p) =>
      (ROOM_CATS.includes(p.cat) || hasWord(nameOf(p), DESK_TERMS)) &&
      !hasWord(nameOf(p), GARMENT_TERMS),
  },
  {
    key: 'anime',
    slug: 'decora-anime',
    anchor: 'anime',
    boardName: 'Sanrio, San-X and anime fits',
    title: 'Sanrio, San-X and anime fits',
    tagline: 'The houses and the characters, worn rather than collected',
    hashtag: 'SanrioAesthetic',
    catLead: 'character',
    pinTags: ['SanrioAesthetic', 'AnimeMerch', 'KuromiAesthetic', 'JapaneseCharacterGoods', 'HarajukuFashion'],
    match: (p) => hasWord(hay(p), CHARACTER_TERMS) || hasWord(nameOf(p), GENERIC_ANIME),
  },
  {
    key: 'fits',
    slug: 'decora-fits',
    anchor: 'fit',
    boardName: 'Skirts, socks and platform shoes',
    title: 'Skirts, socks and platform shoes',
    tagline: 'The bottom half, which is where a decora outfit is actually won',
    hashtag: 'HarajukuOutfit',
    catLead: 'fit',
    pinTags: ['HarajukuOutfit', 'JFashion', 'JapaneseStreetFashion', 'DecoraKei', 'OutfitInspo'],
    match: (p) => hasWord(nameOf(p), FIT_TERMS),
  },
  {
    key: 'tops',
    slug: 'decora-tops',
    anchor: 'fit',
    boardName: 'Decora tops and hoodies',
    title: 'Decora tops and hoodies',
    tagline: 'The loud piece you build the rest of the outfit to argue with',
    hashtag: 'DecoraKei',
    catLead: 'top',
    pinTags: ['DecoraKei', 'HarajukuFashion', 'JapaneseStreetFashion', 'JFashion', 'HarajukuOutfit'],
    match: (p) => hasWord(nameOf(p), TOP_TERMS),
  },
  {
    key: 'clips',
    slug: 'decora-clips',
    anchor: 'more',
    boardName: 'Decora hair clips and charms',
    title: 'Decora hair clips and charms',
    tagline: 'Clips, keyrings, jewellery and the case for wearing all of them at once',
    hashtag: 'DecoraAccessories',
    // The catch-all, so it takes hats, collars, mirrors and anything the five
    // above did not name. "Accessory" is the honest noun for that mix; "hair
    // clip" would be a caption that lies about a beanie.
    catLead: 'accessory',
    pinTags: ['DecoraAccessories', 'HairClips', 'KandiKid', 'DecoraKei', 'HarajukuFashion'],
    match: () => true,
  },
]

export function decoraBoard(slug: string): DecoraBoard | undefined {
  return DECORA_BOARDS.find((b) => b.slug === slug)
}

/** What a Pin from this board overrides on the product's own record. */
export function decoraPin(b: DecoraBoard) {
  return {
    tag: b.hashtag,
    catLead: b.catLead,
    catTags: b.pinTags,
    style: DECORA_STYLE,
    tail: DECORA_TAIL,
  }
}

/**
 * Every product in the room, dealt to exactly one board.
 *
 * Ordered oldest-first per board, matching the feed rule in section 4f:
 * Pinterest publishes the oldest item first and re-reads the feed as it
 * changes, so a feed in rank order reshuffles underneath it. Ties fall back to
 * id so the result is fully determined.
 */
export function assignDecoraBoards(all: Product[]): { board: DecoraBoard; products: Product[] }[] {
  const pool = all.filter(
    (p) => SOURCES.includes(p.vendor) && eligible(p) && !hasWord(nameOf(p), UNPINNABLE)
  )
  const used = new Set<string>()
  return DECORA_BOARDS.map((board) => {
    const products = pool.filter((p) => !used.has(p.id) && board.match(p))
    products.forEach((p) => used.add(p.id))
    products.sort((x, y) => {
      const a = Date.parse(x.added || '') || 0
      const c = Date.parse(y.added || '') || 0
      return a - c || (x.id < y.id ? -1 : 1)
    })
    return { board, products }
  })
}

/**
 * id -> the board that claimed it, so a Pin taken off /decora by hand carries
 * the same board's voice as one Pinterest builds from the feed.
 *
 * Without this the buttons on that page would keep pinning #KidsFashion and
 * "a kawaii apparel pick", which is the whole defect this file exists to fix,
 * left in place on the half a visitor can actually see.
 */
export function decoraBoardIndex(all: Product[]): Map<string, DecoraBoard> {
  const out = new Map<string, DecoraBoard>()
  for (const { board, products } of assignDecoraBoards(all)) {
    for (const p of products) out.set(p.id, board)
  }
  return out
}
