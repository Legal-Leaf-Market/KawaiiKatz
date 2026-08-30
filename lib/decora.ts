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
  'coin case', 'card case', 'phone case',
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
