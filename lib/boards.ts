import { hasWord } from './catalog-shared'
import { isUntracked, type Product } from './data'

/**
 * Seasonal gift guides — the only kind of Pinterest push that is actually open
 * to us.
 *
 * -----------------------------------------------------------------------------
 * WHY THESE EXIST
 *
 * We cannot upload a catalogue to Pinterest. Their merchant guidelines say a
 * merchant "must not be an affiliate marketer", which closes catalogues,
 * Product Pins and shopping tags to this site outright, and the community
 * guidelines limit affiliate Pins "repetitively or in large volumes". A script
 * that pinned 4,400 products would be both of those at once.
 *
 * What is open is ordinary, hand-curated pinning — and Pinterest is a search
 * engine, not a feed, so a small number of well-aimed Pins outlives a large
 * number of weak ones. A guide page is the right destination for those: one URL
 * that ranks for "kawaii christmas gifts", stays useful for a whole season, and
 * lands the visitor on our own domain rather than a merchant's.
 *
 * Unlike /p/<id> these pages ARE indexable and ARE in the sitemap. The rule
 * they respect is "do not compete with a vendor for their own product page" —
 * a guide competes with nobody's product page, because no vendor has one. It is
 * our editorial work, and it is the only page here that is.
 *
 * -----------------------------------------------------------------------------
 * ON TIMING
 *
 * Christmas is built in August on purpose. Pinterest's seasonal search starts
 * roughly three months before the event — pinning in December is pinning after
 * the decision has been made. `season` records when a guide is at its peak so
 * the index can say so; it never hides the page.
 */

export type BoardSection = {
  key: string
  title: string
  blurb: string
  max: number
  match: (p: Product, festive: number) => boolean
}

export type Board = {
  slug: string
  emoji: string
  title: string
  /** One line, used as the page's meta description lead and the card subtitle. */
  tagline: string
  intro: string
  /**
   * Hashtag applied to every Pin taken from this guide, overriding the
   * month-based `seasonalTag()` in lib/pinterest.ts. That function returns
   * ChristmasGiftIdeas only in November and December — correct for a Pin made
   * off the shop floor, wrong for a Pin made off the Christmas guide in August,
   * which is exactly when the guide is most worth pinning.
   */
  hashtag: string
  /** Months (0-indexed) when this guide is at peak search. Display only. */
  season: number[]
  sections: BoardSection[]
}

/**
 * Word-anchored, every one of them, and not as a matter of taste.
 *
 * `advent` is a substring of ADVENTURE, `tree` of STREET, `elf` of SHELF,
 * `holly` of HOLLYWOOD, `bell` of UMBRELLA. A substring test here would fill a
 * Christmas guide with adventure playsets and shelf organisers — the same class
 * of bug that put 47 of 87 `learning` products in the wrong category via
 * `hape` ⊂ SHAPE. See the note on hasWord() in lib/catalog-shared.ts.
 *
 * `stocking` is deliberately absent as a bare term: it is hosiery far more
 * often than it is a Christmas stocking. The qualified forms are listed instead.
 */
const FESTIVE_TERMS = [
  'christmas', 'xmas', 'santa', 'reindeer', 'rudolph', 'gingerbread', 'snowman',
  'snowflake', 'snow globe', 'advent', 'advent calendar', 'holiday', 'festive',
  'yule', 'noel', 'mistletoe', 'candy cane', 'nutcracker', 'elf', 'sleigh',
  'tinsel', 'ornament', 'bauble', 'holly', 'christmas tree', 'christmas stocking',
  'stocking stuffer', 'secret santa', 'winter wonderland',
]

/**
 * Other people's holidays, kept out of this one.
 *
 * Measured, not guessed: the first run of this guide against the live
 * catalogue put a "Halloween Ghost Ceramic Mug" and "Halloween Creepy Cutie
 * Keychains" in the "Under the tree" band. Nothing was wrong with the scoring —
 * they are cute, well-priced, tracked products — but a Christmas guide that
 * shows Halloween stock reads as an automated dump, which is precisely the
 * impression a curated guide exists to avoid.
 *
 * Word-anchored like everything else here: `witch` is a substring of SWITCH.
 */
const OFF_SEASON_TERMS = [
  'halloween', 'spooky', 'pumpkin', 'jack o lantern', 'trick or treat', 'ghost',
  'skeleton', 'witch', 'vampire', 'zombie', 'creepy', 'easter', 'valentine',
  'thanksgiving', 'lunar new year', 'chinese new year', 'ramadan', 'diwali',
  'st patrick', 'graduation',
]

/** Categories a gift guide should lead with. Not a filter — a ranking nudge. */
const GIFTY_CATS = new Set([
  'plush', 'collect', 'puzzle', 'learning', 'stationery', 'charms', 'home', 'kitchen',
])

function haystack(p: Product): string {
  return `${p.name} ${p.blurb ?? ''} ${p.character ?? ''}`.toLowerCase()
}

/** How Christmassy a product actually is. 0 means "not, at all". */
export function festiveScore(p: Product): number {
  return hasWord(haystack(p), FESTIVE_TERMS) ? 6 : 0
}

/** True when a product belongs to a different holiday than this guide's. */
export function offSeason(p: Product): boolean {
  return hasWord(haystack(p), OFF_SEASON_TERMS)
}

/**
 * No more than this many tiles from one shop in one section. Without it the
 * scoring lets a single vendor take a whole band — sugarhai alone accounts for
 * 37 of the catalogue's 76 festive products — and a guide that is ten tiles of
 * one shop reads as an advert rather than a recommendation.
 */
const MAX_PER_VENDOR_PER_SECTION = 3

/**
 * Deterministic, and it has to be: this runs during a prerender, so a
 * `Math.random()` tie-break would give the server and the client different
 * grids and React would throw a hydration mismatch. Ties break on id.
 */
function score(p: Product, festive: number): number {
  let s = festive
  if (GIFTY_CATS.has(p.cat)) s += 1
  if (p.kidSafe) s += 0.5
  if (p.onSale) s += 0.5
  if (p.character) s += 0.5
  // A guide exists to be pinned, and a Pin to a merchant we cannot track earns
  // nothing and reports nothing. Not excluded — Sydney Sock Project genuinely
  // is a good stocking filler — but it ranks behind everything that pays.
  if (!isUntracked(p.vendor)) s += 1.5
  return s
}

export const BOARDS: Board[] = [
  {
    slug: 'christmas',
    emoji: '🎄',
    title: 'Kawaii Christmas Gift Guide',
    tagline: 'Cute, clever and kind presents, sorted by what you want to spend',
    intro:
      'Every year the same problem: you want to give something with a bit of personality, ' +
      'and you want to know what it costs before you fall in love with it. So this guide is ' +
      'sorted by price first. Everything here is in stock at one of our partner shops — you ' +
      'check out on their site, never ours.',
    hashtag: 'ChristmasGiftIdeas',
    season: [8, 9, 10, 11], // Sept–Dec; Pinterest searches Christmas from September
    sections: [
      {
        key: 'festive',
        title: 'Actually Christmassy',
        blurb: 'Santas, snowmen and advent calendars — the ones that only make sense in December.',
        max: 12,
        match: (_p, festive) => festive > 0,
      },
      {
        key: 'littles',
        title: 'Safe for little hands',
        blurb: 'Screened as kid-appropriate, so you can shop for a five-year-old without reading every listing.',
        max: 12,
        match: (p) => p.kidSafe === true,
      },
      {
        key: 'stocking',
        title: 'Stocking stuffers under $15',
        blurb: 'Small, cheerful and easy to buy several of.',
        max: 12,
        match: (p) => p.price > 0 && p.price <= 15,
      },
      {
        key: 'tree',
        title: 'Under the tree · $15 to $40',
        blurb: 'The proper present slot. Enough to feel like a real gift, not enough to think about it.',
        max: 12,
        match: (p) => p.price > 15 && p.price <= 40,
      },
      {
        key: 'showstopper',
        title: 'The one they open last · over $40',
        blurb: 'For the person you actually planned ahead for.',
        max: 8,
        match: (p) => p.price > 40,
      },
    ],
  },
]

export function board(slug: string): Board | undefined {
  return BOARDS.find((b) => b.slug === slug)
}

export function boardInSeason(b: Board, month: number): boolean {
  return b.season.includes(month)
}

export type BoardPick = { section: BoardSection; products: Product[] }

/**
 * Fills a guide's sections from the live catalogue.
 *
 * Sections are filled IN ORDER and a product is used once. That is what makes
 * the page read as curation rather than five filters over the same shelf: the
 * genuinely festive things go in the festive section even when they are also
 * under $15, and the price bands below get variety instead of the same plush
 * five times.
 */
export function fillBoard(b: Board, products: Product[]): BoardPick[] {
  const pool = products
    .filter((p) => p && p.id && p.name && p.price > 0 && String(p.image || '').trim())
    .filter((p) => !offSeason(p))
    .map((p) => ({ p, festive: festiveScore(p) }))
    .map((x) => ({ ...x, s: score(x.p, x.festive) }))
    .sort((a, b2) => b2.s - a.s || (a.p.id < b2.p.id ? -1 : 1))

  const used = new Set<string>()
  const out: BoardPick[] = []
  for (const section of b.sections) {
    const chosen: Product[] = []
    const perVendor = new Map<string, number>()
    for (const { p, festive } of pool) {
      if (chosen.length >= section.max) break
      if (used.has(p.id)) continue
      if (!section.match(p, festive)) continue
      const n = perVendor.get(p.vendor) ?? 0
      if (n >= MAX_PER_VENDOR_PER_SECTION) continue
      perVendor.set(p.vendor, n + 1)
      used.add(p.id)
      chosen.push(p)
    }
    if (chosen.length) out.push({ section, products: chosen })
  }
  return out
}
