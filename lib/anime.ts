import { hasWord } from './catalog-shared'
import type { Product } from './data'

/* ===========================================================================
 * KAWAII KATZ GOES ANIME
 * ===========================================================================
 *
 * The third room, after the shop floor and /decora, and it is built on the
 * same bones as /decora on purpose: sources, sections that fill in order, a
 * paged deal, an edit, and a Pin voice of its own. Read lib/decora.ts first;
 * every structural decision here has a note there explaining why.
 *
 * -----------------------------------------------------------------------------
 * WHY IT IS A ROOM AND NOT A SECTION OF /decora
 *
 * /decora already has an "Anime mode" shelf, and that shelf is the proof this
 * page should exist rather than the reason it should not: it is capped at 12
 * tiles and it draws only from the seven J-fashion shops, so it was showing
 * about 1% of what the catalogue actually holds. Measured across all 6,777
 * products: 330 rows are character or genre merchandise, spread over SEVEN
 * vendors, and most of them are in categories /decora does not look at
 * (kitchen, plush, food, tech).
 *
 * The two rooms also want different things. /decora sells an outfit. This sells
 * a fandom, and the person buying a Sanrio lunch box is not building a fit.
 *
 * -----------------------------------------------------------------------------
 * THE TERM LISTS ARE TWO, AND THEY FAIL DIFFERENTLY
 *
 * Same split lib/decora.ts uses for brands and aesthetic words, and it is not
 * theoretical. Measured on the live catalogue while writing this:
 *
 *   - A HOUSE is decisive. Nothing called Kuromi is anything else, so those
 *     terms may be matched against name, blurb and character together.
 *
 *   - A GENRE word is descriptive and is matched against the NAME ONLY. Kore
 *     Kawaii writes "anime" in the body copy of half its shop, so on the full
 *     haystack `anime` returned "Kawaii Cutesy Neko Platform Sneakers" and
 *     "Kawaii Pastel Blue & Pink Bedding Set". That is the §4f-b `egirl`
 *     finding by a different door: a word that is ordinary in product copy is
 *     not evidence when it appears in product copy.
 *
 * FOUR TERMS WERE MEASURED AND CUT, and they are worth listing because each one
 * looked obviously correct before it was checked:
 *
 *   - `sailor` (32 hits) is a COLLAR. "Cute Strawberry Bunny Sailor Sweater",
 *     "Sailor Duck Plushies". `sailor moon` is kept and catches the five real
 *     ones.
 *   - `one piece` (8 hits) is a GARMENT. "Striped Girls Unicorn One Piece
 *     Swimsuit". Three genuine rows did not justify it.
 *   - `nintendo` (27 hits) is all kawaii Switch shells and joystick caps. Real
 *     products, no licence, and nothing to do with anime.
 *   - `kiki`, `howl`, `ponyo` were never added: each is a substring or a common
 *     word away from a false positive, and `ghibli` and `totoro` already catch
 *     the Ghibli stock we carry.
 *
 * This is the `elf` in SHELF class of bug that §4e records, and it is now the
 * fourth room to hit it.
 */

export type Source = {
  vendor: string
  /** `all`: the whole shop is licensed. `anime`: take only what matches. */
  take: 'all' | 'anime'
}

/**
 * The shops that actually carry this, counted rather than guessed.
 *
 * Measured 2026-09-02 over the live catalogue, after the term lists below were
 * cleaned: Grumpy Bunny 158, Hello Kitty Camp 66, Kore Kawaii 46, CozyKawaii
 * 26, Kawaii Babe 20, The Kawaii Shoppu 11, KawaiiMoriStore 3.
 *
 * Narrowing to these seven is a BUILD decision and not an editorial one: the
 * match below would work over the whole catalogue, and §4b's rule is that a
 * route's cost should be the size of its output. The cost of the narrowing is
 * that a new vendor's character stock is invisible here until its name is
 * added, so re-measure after an intake.
 */
export const SOURCE_SHOPS: Source[] = [
  // The whole shop is Sanrio. `all` rather than `anime` so a Hello Kitty item
  // whose name says only "Cooking Apron" still reaches the room.
  { vendor: 'Hello Kitty Camp', take: 'all' },
  { vendor: 'Grumpy Bunny', take: 'anime' },
  { vendor: 'Kore Kawaii', take: 'anime' },
  { vendor: 'CozyKawaii', take: 'anime' },
  { vendor: 'Kawaii Babe', take: 'anime' },
  { vendor: 'The Kawaii Shoppu', take: 'anime' },
  { vendor: 'KawaiiMoriStore', take: 'anime' },
]

/** Vendor names only, for the narrowed catalogue build. */
export const SOURCES = SOURCE_SHOPS.map((s) => s.vendor)

const TAKE_ALL = new Set(SOURCE_SHOPS.filter((s) => s.take === 'all').map((s) => s.vendor))

/**
 * Character houses and series. Decisive, so matched on the whole haystack.
 *
 * Sanrio is listed by house AND by character, for the reason lib/decora.ts
 * gives about the same list: a "Kuromi" tee never says Sanrio in its name.
 */
export const HOUSES = [
  // Sanrio, and its cast
  'sanrio', 'hello kitty', 'kuromi', 'my melody', 'cinnamoroll', 'pochacco',
  'gudetama', 'keroppi', 'badtz', 'pompompurin', 'little twin stars',
  'hangyodon', 'tuxedo sam', 'wish me mell', 'aggretsuko', 'marumofubiyori',
  // San-X, and its cast
  'san-x', 'rilakkuma', 'korilakkuma', 'sumikko', 'gurashi',
  // Everybody else we actually stock
  'gloomy bear', 'menhera', 'chax', 'pusheen', 'chiikawa', 'molang',
  'sailor moon', 'card captor', 'cardcaptor', 'tokidoki',
  'studio ghibli', 'ghibli', 'totoro',
  'pokemon', 'pokémon', 'pikachu',
  'hatsune miku', 'miku',
  'naruto', 'demon slayer', 'jujutsu', 'chainsaw man', 'spy x family',
  'my hero academia', 'dragon ball', 'evangelion', 'attack on titan',
  'doraemon', 'shin chan', 'digimon', 'crunchyroll',
]

/**
 * Genre words. NAME ONLY. See the header: on the full haystack `anime` alone
 * returned platform sneakers and a bedding set, because that is what the shop
 * writes in its body copy.
 */
export const GENRE = [
  'anime', 'manga', 'shoujo', 'shonen', 'otaku', 'waifu',
  'mahou shoujo', 'magical girl', 'seifuku', 'cosplay',
  // An ita bag is a bag built to display character badges. It is a piece of
  // fandom hardware and belongs here even when no series is named.
  'ita bag', 'ita backpack', 'itabag',
]

const nameOf = (p: Product) => String(p.name || '').toLowerCase()
const hay = (p: Product) =>
  `${p.name} ${p.blurb ?? ''} ${p.character ?? ''}`.toLowerCase()

/** Which house a row belongs to, or '' — also what The Roll Call groups by. */
export function houseOf(p: Product): string {
  const h = hay(p)
  return HOUSES.find((t) => hasWord(h, [t])) ?? ''
}

export function isAnimeProduct(p: Product): boolean {
  return Boolean(houseOf(p)) || hasWord(nameOf(p), GENRE)
}

/** A row reaches this room if its shop is all-in, or the row itself matches. */
export function fromSource(p: Product): boolean {
  if (TAKE_ALL.has(p.vendor)) return true
  return SOURCES.includes(p.vendor) && isAnimeProduct(p)
}

/* ---------------------------------------------------------------------------
 * The shops, in their own words. Same contract as lib/decora.ts SHOPS: only
 * what a shop says about itself, rendered as attribution, and nothing
 * time-sensitive, because a page cached for six hours cannot keep a promise
 * about stock or delivery.
 * ------------------------------------------------------------------------- */
export type Shop = { vendor: string; home: string; says: string }

export const SHOPS: Shop[] = [
  { vendor: 'Hello Kitty Camp', home: 'https://hellokittycamp.com', says: 'Hello Kitty and Sanrio merchandise' },
  { vendor: 'Grumpy Bunny', home: 'https://grumpybunny.com', says: 'authentic Japanese brands, imported directly from Japan' },
  { vendor: 'Kore Kawaii', home: 'https://korekawaii.com', says: 'kawaii goods, snacks and Japanese imports' },
  { vendor: 'CozyKawaii', home: 'https://cozykawaii.com', says: 'plush and cosy kawaii goods' },
  { vendor: 'Kawaii Babe', home: 'https://kawaiibabe.com', says: 'fairy kei, decora and kawaii fashion' },
  { vendor: 'The Kawaii Shoppu', home: 'https://thekawaiishoppu.com', says: 'kawaii and Japanese lifestyle goods' },
  { vendor: 'KawaiiMoriStore', home: 'https://shop.kawaiimoristore.com', says: 'Japanese and Korean fashion' },
]

/* ---------------------------------------------------------------------------
 * SECTIONS
 * ------------------------------------------------------------------------- */

const BAG_TERMS = [
  'bag', 'bags', 'backpack', 'rucksack', 'tote', 'pouch', 'pouches', 'purse',
  'wallet', 'crossbody', 'sling bag', 'shoulder bag', 'satchel', 'knapsack',
  'ita bag', 'ita backpack', 'card case', 'coin case',
]

const COLLECT_TERMS = [
  'blind box', 'blindbox', 'mystery box', 'figure', 'figures', 'figurine',
  'nendoroid', 'gashapon', 'trading figure', 'model kit', 'collectible',
  'collectibles', 'acrylic stand', 'standee',
]

const SLEEP_TERMS = [
  'bedding', 'duvet', 'quilt', 'pillow', 'pillowcase', 'cushion', 'blanket',
  'throw', 'bed set', 'comforter', 'sleep mask', 'eye mask', 'pyjama',
  'pyjamas', 'pajama', 'pajamas', 'kigurumi', 'onesie', 'slippers', 'sheet',
]

export type AnimeSection = {
  key: string
  /** The small kicker above the title. */
  kicker: string
  /** The big display word. HTML type, never baked into art (§ the art brief). */
  title: string
  blurb: string
  max: number
  /** The pose that sits beside the heading. One per section, six of six. */
  sticker: { src: string; alt: string }
  match: (p: Product) => boolean
}

/**
 * Six sections, six stickers, and the count is not a coincidence.
 *
 * The art brief delivered exactly six section poses, so a seventh section would
 * either go bare or reuse a pose, and a repeated mascot two shelves apart reads
 * as the page having run out. Six that each fill is better than eight where two
 * are thin.
 *
 * THE SHAPE OF THE SHELF DECIDED THESE, NOT THE BRIEF. The brief's own guess
 * was Bedding / Backpacks / Jackets / Kimono / Puzzles / New, written before
 * anybody counted. Measured against the live catalogue, `kimono` matched ONE
 * product in the whole room and `puzzle` matched none, so two of six shelves
 * would have shipped empty. The sections below are the buckets the stock
 * actually falls into, and every pose still lands on a shelf its joke fits.
 *
 * Sections fill IN ORDER and a product is used once, which is what makes this
 * read as curation rather than six filters over one shelf (§4e).
 */
export const SECTIONS: AnimeSection[] = [
  {
    key: 'new',
    kicker: 'Just landed',
    title: 'New this week',
    blurb: 'The most recent character stock to reach the shelf. Picked by us, shipped by the shop.',
    max: 12,
    sticker: { src: 'st-new.webp', alt: 'Panda holding a parcel that has just arrived' },
    match: () => true,
  },
  {
    key: 'fit',
    kicker: 'Tees, hoodies, jackets, skirts',
    title: 'Wear the fandom',
    blurb: 'Collab pieces and character prints. The loud ones are the point.',
    max: 12,
    sticker: { src: 'st-fit.webp', alt: 'Katz in an open bomber jacket, rim lit' },
    match: (p) => p.cat === 'apparel',
  },
  {
    key: 'carry',
    kicker: 'Ita bags, backpacks, pouches',
    title: 'Carry it with you',
    blurb: 'An ita bag is a bag with a window, built to show off the badges. Yes, really.',
    max: 8,
    sticker: { src: 'st-carry.webp', alt: 'The bunny under a backpack far too large for her' },
    match: (p) => hasWord(nameOf(p), BAG_TERMS),
  },
  {
    key: 'collect',
    kicker: 'Blind boxes, figures, plush',
    title: 'The collection',
    blurb: 'Blind boxes you will open in the car, and the plush that lives on the pillow.',
    max: 12,
    sticker: { src: 'st-build.webp', alt: 'Katz mid-panic over a half-finished puzzle' },
    match: (p) => p.cat === 'plush' || p.cat === 'collect' || hasWord(nameOf(p), COLLECT_TERMS),
  },
  {
    key: 'room',
    kicker: 'Bedding, decor, desk, tech',
    title: 'The room at 2am',
    blurb: 'Bedding, lamps, notebooks and phone cases. The shelf above the desk is a mood board.',
    max: 12,
    sticker: { src: 'st-sleep.webp', alt: 'Panda asleep face-down in a duvet, one ear out' },
    match: (p) =>
      p.cat === 'home' || p.cat === 'stationery' || p.cat === 'tech' || hasWord(nameOf(p), SLEEP_TERMS),
  },
  {
    key: 'table',
    kicker: 'Bento, mugs, snacks',
    title: 'The kitchen table',
    blurb: 'Lunch boxes, cups and imported snacks. Half of this shelf is edible.',
    max: 12,
    sticker: { src: 'st-layer.webp', alt: 'The bunny in a haori, arms folded, unimpressed' },
    match: (p) => p.cat === 'kitchen' || p.cat === 'food',
  },
]

/**
 * THE ROLL CALL: one thing per character house.
 *
 * The same idea as /decora's Edit and for the same reason. We cannot see what
 * sells on a merchant's site (lib/site-events.ts: our clicks are not their
 * sales), so a "most popular" rail here would be a claim nothing backs. What we
 * can stand behind is a tour: one piece from each house the shops actually
 * carry, so the rail is a map of the room rather than a guess at its hits.
 *
 * Deduped by house, so 90 rows of Sanrio contribute one.
 */
export function rollCall(products: Product[], max = 10): Product[] {
  /**
   * A DRINK IS THE WEAKEST THING A HOUSE CAN BE REPRESENTED BY, so it goes last.
   *
   * The first version took the newest row per house and the rail opened with
   * three sparkling waters in a row: Pokémon, Naruto and Dragon Ball are each
   * carried mainly as an Ocean Bomb can. Every one of those is real stock and
   * stays in the room, but a rail whose whole job is "here is the house" should
   * show the house rather than its licensed soft drink where anything else
   * exists. Where nothing else exists, the can still runs, because the
   * alternative is dropping a house we genuinely carry.
   */
  const ranked = [...products].sort((a, b) => {
    const fa = a.cat === 'food' ? 1 : 0
    const fb = b.cat === 'food' ? 1 : 0
    return fa - fb
  })
  const out: Product[] = []
  const seen = new Set<string>()
  for (const p of ranked) {
    const h = houseOf(p)
    if (!h || seen.has(h)) continue
    seen.add(h)
    out.push(p)
    if (out.length >= max) break
  }
  return out
}

/** Newest first, with anything undated last rather than first. */
function byNewest(a: Product, b: Product): number {
  return (Date.parse(b.added || '') || 0) - (Date.parse(a.added || '') || 0)
}

/** A tile with no photograph is a hole in the grid, so a row without one is out. */
function eligible(p: Product): boolean {
  return Boolean(p && p.id && p.name && p.price > 0 && String(p.image || '').trim())
}

export type FilledSection = { section: AnimeSection; products: Product[] }
export type PagedSection = { section: AnimeSection; pages: Product[][] }

/**
 * Every section dealt into pages, so a shelf can shuffle and load more.
 *
 * PAGING IS ROUNDS OF THE SAME PASS, NOT A BIGGER VERSION OF IT. lib/boards.ts
 * paid for that lesson and lib/decora.ts repeats it: letting each section claim
 * `max * maxPages` up front starves the sections below it. Running the
 * one-round pass repeatedly over what is left makes round 0 identical to
 * `fillAnime` BY CONSTRUCTION, which is what keeps the server's prerender and
 * the browser's first render agreeing.
 *
 * Pure and deterministic. No Math.random and no Date.now beyond the `added`
 * field the data itself carries: this runs during a prerender and again in the
 * browser, and the two have to agree or React reports a hydration mismatch.
 */
export function fillAnimePages(all: Product[], maxPages = 8): {
  sections: PagedSection[]
  roll: Product[]
} {
  const pool = all.filter((p) => fromSource(p) && eligible(p)).sort(byNewest)

  function round(used: Set<string>): FilledSection[] {
    return SECTIONS.map((section) => {
      const picked: Product[] = []
      for (const p of pool) {
        if (picked.length >= section.max) break
        if (used.has(p.id)) continue
        if (!section.match(p)) continue
        picked.push(p)
        used.add(p.id)
      }
      return { section, products: picked }
    })
  }

  const used = new Set<string>()
  const rounds: FilledSection[][] = []
  for (let r = 0; r < maxPages; r++) {
    const got = round(used)
    if (!got.some((x) => x.products.length)) break
    rounds.push(got)
  }

  const sections: PagedSection[] = SECTIONS.map((section, i) => ({
    section,
    pages: rounds.map((r) => r[i].products).filter((page) => page.length > 0),
  })).filter((x) => x.pages.length > 0)

  return { sections, roll: rollCall(pool) }
}

/** Round 0, so the one-page view and page one of the paged view cannot drift. */
export function fillAnime(all: Product[]): { sections: FilledSection[]; roll: Product[] } {
  const { sections, roll } = fillAnimePages(all, 1)
  return { sections: sections.map((s) => ({ section: s.section, products: s.pages[0] })), roll }
}

/** Everything this room can show, for the first-paint slice and the counts. */
export function animePool(all: Product[]): Product[] {
  return all.filter((p) => fromSource(p) && eligible(p)).sort(byNewest)
}

/* ---------------------------------------------------------------------------
 * THE PIN VOICE
 *
 * §4f-b in one line: the site's default caption calls everything "a kawaii
 * <category> pick ... cute, clever & kind" under #KawaiiFinds, and a Sanrio
 * lunch box pinned to a board about anime under that caption tells Pinterest
 * the board is about lunch boxes. PinContext carries the four overrides.
 * ------------------------------------------------------------------------- */

const ANIME_STYLE = 'anime'
const ANIME_TAIL = 'Character merch, curated on Kawaii Katz.'

const CAT_LEAD: Record<string, string> = {
  new: 'anime',
  fit: 'anime fashion',
  carry: 'ita bag',
  collect: 'anime collectible',
  room: 'anime room',
  table: 'kawaii bento',
}

const TAGS: Record<string, string[]> = {
  new: ['AnimeMerch', 'KawaiiAnime', 'Sanrio', 'AnimeAesthetic', 'OtakuLife'],
  fit: ['AnimeFashion', 'AnimeOutfit', 'KawaiiAnime', 'AnimeMerch', 'JFashion'],
  carry: ['ItaBag', 'AnimeBackpack', 'AnimeMerch', 'KawaiiBackpack', 'FandomStyle'],
  collect: ['BlindBox', 'AnimeFigures', 'AnimePlush', 'KawaiiCollectibles', 'AnimeMerch'],
  room: ['AnimeRoomDecor', 'OtakuRoom', 'KawaiiBedroom', 'AnimeAesthetic', 'AnimeDesk'],
  table: ['KawaiiBento', 'AnimeSnacks', 'JapaneseSnacks', 'KawaiiKitchen', 'AnimeMerch'],
}

/** The Pin voice for one shelf, and for the tiles standing on it. */
export function animeSectionPin(key: string): {
  tag: string
  catLead: string
  catTags: string[]
  style: string
  tail: string
} {
  return {
    tag: 'AnimeMerch',
    catLead: CAT_LEAD[key] ?? 'anime',
    catTags: TAGS[key] ?? TAGS.new,
    style: ANIME_STYLE,
    tail: ANIME_TAIL,
  }
}

/**
 * The shelf each product is standing on, so the Pin button on a tile speaks
 * with the same voice as the shelf's own Pin.
 *
 * §4f-b: without this the two halves disagree on the identical tile, one saying
 * "an anime collectible pick #BlindBox" and the other "a kawaii plushie pick
 * #SoftToys", and the same board ends up holding both.
 */
export function animeSectionIndex(all: Product[]): Map<string, string> {
  const out = new Map<string, string>()
  const { sections } = fillAnimePages(all, 8)
  for (const { section, pages } of sections) {
    for (const page of pages) for (const p of page) out.set(p.id, section.key)
  }
  return out
}
