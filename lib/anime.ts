import { hasWord } from './catalog-shared'
import { type Product } from './data'

/**
 * The Anime room: /anime.
 *
 * -----------------------------------------------------------------------------
 * WHY IT IS A ROOM AND NOT FIVE BRAND PAGES
 *
 * The five merchants behind it are ONE OPERATOR. The sister site's registry
 * spotted the pattern from the domain names before anybody applied, and the
 * approvals confirmed it with data: five programmes, five keyword domains, one
 * identical rate on one identical window. Five brand pages would present one
 * supplier as five partners, which is exactly what makes a curated site worth
 * nothing.
 *
 * They are niched by PRODUCT rather than by branding, though, and that is what
 * makes a mixed room honest: bedding, jackets, kimono, backpacks and jigsaws do
 * not overlap, so a shelf drawing on all five is a shelf of five different
 * things rather than the same thing five times.
 *
 * Named for the aesthetic, not for a shop, same call as /decora and for the
 * same two reasons: a second anime merchant would otherwise need a second page,
 * and a shop's name in 48px display type reads as THEIR page even when every
 * word on it is ours.
 *
 * -----------------------------------------------------------------------------
 * THE SIXTH DOMAIN IS NOT HERE AND MUST NOT BE ADDED
 *
 * animeswimsuit.com belongs to the same operator and was left off by Jacob's
 * own call. The reasoning is the reason this site has a phrase filter at all:
 * Kawaii Katz is the kid-facing sibling. It is not in VENDORS, so nothing here
 * can reach it, and that is deliberate rather than an oversight to tidy up.
 */
export const ANIME_VENDORS = [
  'Anime Bedding',
  'Anime Jacket',
  'Anime Kimono',
  'Anime Backpacks',
  'Anime Puzzles',
]

/**
 * EVERY TERM LIST HERE IS WORD-ANCHORED, and must stay that way.
 *
 * Section 4e records this bug class three times over: `advent` inside
 * ADVENTURE, `tree` inside STREET, `elf` inside SHELF, and 47 of 87 `learning`
 * products misfiled because `hape` sits inside SHAPE. `hasWord` is exported
 * from catalog-shared for exactly this. Do not write a second copy of it and do
 * not reach for `.includes()`.
 */
const BED = ['duvet', 'bedding', 'pillowcase', 'pillow case', 'bedsheet', 'bed sheet',
  'comforter', 'quilt', 'blanket', 'bed set', 'sheets']
const LAYER = ['kimono', 'haori', 'yukata', 'happi', 'obi', 'cardigan', 'robe']
const OUTER = ['jacket', 'hoodie', 'bomber', 'varsity', 'coat', 'windbreaker',
  'sweatshirt', 'zip up', 'zip-up', 'parka']
const CARRY = ['backpack', 'rucksack', 'bag', 'satchel', 'tote', 'pouch',
  'sling', 'duffel', 'drawstring']
const BUILD = ['puzzle', 'jigsaw']

const hay = (p: Product) => `${p.name} ${p.blurb ?? ''}`.toLowerCase()

export type AnimeSection = {
  key: string
  /** The small kicker above the title. */
  kicker: string
  /** The big display word. HTML type, never baked into art. */
  title: string
  blurb: string
  /** Transparent cutout beside the heading, or none if the file is absent. */
  sticker: string
  /**
   * The shelf's own colour, carried by its kicker rule, its title swash, its
   * border and the glow behind its sticker.
   *
   * Six identical white cards down a page is a list with headings on it. One
   * colour each, all of them lifted off the hero's night street, gives the room
   * a rhythm as you scroll and ties the daylight half of the page back to the
   * neon half. It is a string, which matters: this crosses into a Client
   * Component, and the last thing that went across there was a function.
   */
  accent: string
  max: number
  /**
   * Cap on how many slots one vendor may take in THIS section. Absent means no
   * cap, and for most sections here that is correct rather than lax.
   *
   * It began as a flat limit across every section, copied from the Christmas
   * guide where sugarhai alone was 37 of 76 festive products and the band it
   * filled read as an advert. Applied flat here it was actively wrong, and
   * testing caught it before the page shipped: these five shops are niched BY
   * PRODUCT, so only one of them sells bedding at all. Capping "Sleep in it" at
   * five per vendor capped the entire section at five, because there is no
   * second bedding shop to fill the other seven slots.
   *
   * A section being all one vendor is only a failure when another vendor could
   * have been in it. So the cap applies to the broad section and not the niched
   * ones: "New in the room" matches everything, and without a cap the shop that
   * uploaded most recently would own the whole top of the page.
   */
  maxPerVendor?: number
  match: (p: Product) => boolean
}

/**
 * Sections fill IN ORDER and a product is used ONCE.
 *
 * The same rule the gift guides run on, for the same reason: it is what makes
 * the page read as curation rather than as six filters over one shelf. A
 * kimono-print hoodie lands in one section instead of appearing in two, and the
 * sections below it get variety rather than the same twelve tops again.
 *
 * ORDER IS THEREFORE AN EDITORIAL DECISION, not an alphabetical one. New
 * arrivals lead because they are the reason to come back. Outerwear follows
 * because it is the biggest catalogue of the five and the easiest way in.
 * Puzzles sit last: they are the quietest thing here and the only one nobody
 * wears.
 */
export const ANIME_SECTIONS: AnimeSection[] = [
  {
    key: 'new',
    accent: '#b79cff',
    kicker: 'Just landed',
    title: 'New in the room',
    blurb: 'The most recent things to reach the shelf. Picked by us, shipped by the shop.',
    sticker: 'st-new',
    max: 12,
    maxPerVendor: 4,
    match: () => true,
  },
  {
    key: 'fit',
    accent: '#ff8a65',
    kicker: 'Bombers, hoodies, varsity',
    title: 'Wear it out',
    blurb: 'Jackets built around the artwork rather than a logo stuck on a blank.',
    sticker: 'st-fit',
    max: 12,
    match: (p) => hasWord(hay(p), OUTER),
  },
  {
    key: 'layer',
    accent: '#f2a2c0',
    kicker: 'Haori, yukata, kimono',
    title: 'The loose layer',
    blurb: 'Open-front and worn over everything else. Reads as a cardigan anywhere that is not a convention.',
    sticker: 'st-layer',
    max: 12,
    match: (p) => hasWord(hay(p), LAYER),
  },
  {
    key: 'carry',
    accent: '#7fc4d4',
    kicker: 'Backpacks and bags',
    title: 'Carry it every day',
    blurb: 'The one thing here that gets used daily, which is why the print has to be good.',
    sticker: 'st-carry',
    max: 12,
    match: (p) => hasWord(hay(p), CARRY),
  },
  {
    key: 'sleep',
    accent: '#8b8ade',
    kicker: 'Duvets, sets, pillowcases',
    title: 'Sleep in it',
    blurb: 'The biggest surface in a bedroom and the one nobody thinks to decorate.',
    sticker: 'st-sleep',
    max: 12,
    match: (p) => hasWord(hay(p), BED),
  },
  {
    key: 'build',
    accent: '#8fd0a8',
    kicker: '300 to 1000 pieces',
    title: 'Build it slowly',
    blurb: 'A poster you have to earn, and the quietest thing on this page by a distance.',
    sticker: 'st-build',
    max: 12,
    match: (p) => hasWord(hay(p), BUILD),
  },
]

/**
 * What crosses the server/client boundary: the section WITHOUT its matcher.
 *
 * THE MATCHER IS A FUNCTION AND FUNCTIONS DO NOT SERIALISE. Passing the whole
 * section to a Client Component failed the production build outright:
 *
 *   Functions cannot be passed directly to Client Components
 *   {key: "new", ..., match: function match}
 *
 * It did not fail locally, and the reason is worth keeping. With no products
 * the page renders its empty state and never mounts the client at all, so the
 * boundary was never crossed in dev. The build broke on the first deploy where
 * the shelves actually had something on them, which is the worst possible time
 * to find out.
 *
 * `Omit` rather than care taken at the call site, because care is not
 * enforceable. Typed this way the compiler refuses the function, and the bug
 * cannot come back by somebody passing the richer object again.
 */
export type AnimeSectionView = Omit<AnimeSection, 'match'>

export type FilledSection = { section: AnimeSectionView; products: Product[] }

export function fillAnime(all: Product[]): FilledSection[] {
  /* Literally round 0 of the paged fill, so the one-page view and page one of
     the paged view cannot drift apart. See fillAnimePages for the rounds model
     and for why the per-vendor cap is applied per round. */
  return fillAnimePages(all, 1).map(({ section, pages }) => ({ section, products: pages[0] }))
}

/** Everything the room drew on, for the count in the standfirst. */
export function animePool(all: Product[]): Product[] {
  return all.filter((p) => ANIME_VENDORS.includes(p.vendor))
}

export type PagedSection = { section: AnimeSectionView; pages: Product[][] }

/**
 * Every section dealt into pages, so a shelf can shuffle and load more.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS EXISTS: 72 TILES OVER 1,441 PRODUCTS
 *
 * Six shelves capped at twelve is 72 slots, and the three live shops carry 1,441
 * products between them (measured on production, 2026-09-02: Anime Jacket 715,
 * Anime Puzzles 378, Anime Bedding 348). So 95% of the room was unreachable, the
 * same arithmetic that put Shuffle and Load more on /decora.
 *
 * -----------------------------------------------------------------------------
 * PAGING IS ROUNDS OF THE SAME PASS, NOT A BIGGER VERSION OF IT
 *
 * lib/boards.ts paid for this lesson and lib/decora.ts repeats it: letting each
 * section claim `max * maxPages` up front starves the sections below it. On the
 * gift guides that cut the jigsaw page from 36 tiles to 11, because one section
 * had claimed 48 puzzles before the price bands got a look.
 *
 * Running the one-round pass repeatedly over what is left makes round 0
 * IDENTICAL to `fillAnime` by construction, which is what keeps the server's
 * prerender and the browser's first render agreeing. `fillAnime` is now literally
 * round 0 of this, so the two cannot drift.
 *
 * The per-vendor cap is applied PER ROUND rather than across the whole deal, for
 * the reason the note on `maxPerVendor` already gives: it exists so the shop that
 * uploaded most recently does not own the top of the page. Applied across eight
 * rounds it would instead cap the section at 4 products total.
 *
 * -----------------------------------------------------------------------------
 * TWENTY-FOUR ROUNDS, NOT /decora's EIGHT, AND THE SHELF DECIDED THAT
 *
 * Measured on the production catalogue, 2026-09-02, over 1,441 products:
 *
 *     8 rounds    384 tiles   27%
 *    12 rounds    576 tiles   40%
 *    16 rounds    768 tiles   53%
 *    24 rounds  1,109 tiles   77%
 *    40 rounds  1,365 tiles   95%
 *
 * /decora's eight is right THERE because its sections are narrow and most of
 * them run out well before round eight, so a higher number would buy nothing.
 * Here four shelves are still full at round eight, because one shop alone
 * carries 715 jackets. Twenty-four is where the curve flattens: it reaches
 * three quarters of the room, and past it the extra rounds are mostly the two
 * shelves that never run out.
 *
 * It costs one pass over a 1,441-row array per round, on a list that only
 * changes when the catalogue does, and it is memoised behind `visible`.
 *
 * -----------------------------------------------------------------------------
 * Pure and deterministic: no Math.random, no Date.now. This runs during a
 * prerender and again in the browser, and the two have to agree.
 */
export function fillAnimePages(all: Product[], maxPages = 24): PagedSection[] {
  const pool = all
    .filter((p) => ANIME_VENDORS.includes(p.vendor))
    .slice()
    .sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')))

  function round(used: Set<string>): { key: string; products: Product[] }[] {
    return ANIME_SECTIONS.map((section) => {
      const perVendor = new Map<string, number>()
      const picked: Product[] = []
      for (const p of pool) {
        if (picked.length >= section.max) break
        if (used.has(p.id)) continue
        if (!section.match(p)) continue
        if (section.maxPerVendor != null) {
          const n = perVendor.get(p.vendor) ?? 0
          if (n >= section.maxPerVendor) continue
          perVendor.set(p.vendor, n + 1)
        }
        picked.push(p)
        used.add(p.id)
      }
      return { key: section.key, products: picked }
    })
  }

  const used = new Set<string>()
  const rounds: { key: string; products: Product[] }[][] = []
  for (let r = 0; r < maxPages; r++) {
    const got = round(used)
    if (!got.some((x) => x.products.length)) break
    rounds.push(got)
  }

  return ANIME_SECTIONS.map((section, i) => {
    const { match: _match, ...view } = section
    return { section: view, pages: rounds.map((r) => r[i].products).filter((pg) => pg.length > 0) }
  }).filter((x) => x.pages.length > 0)
}

/* ---------------------------------------------------------------------------
 * THE PIN VOICE
 *
 * §4f-b in one line: the site's default caption calls everything "a kawaii
 * <category> pick ... cute, clever & kind" under #KawaiiFinds, and a duvet
 * pinned to an anime board under that caption tells Pinterest the board is about
 * bedding. `PinContext` carries the four overrides and this fills them in per
 * shelf, so a tile's Pin button and its shelf's Pin agree.
 *
 * The rows here are also miscategorised at source in a way that makes the
 * default worse than usual: every one of these vendors carries `forceCat`, so a
 * kimono is `apparel` and a duvet is `home` regardless of what it depicts.
 * ------------------------------------------------------------------------- */

const PIN_LEAD: Record<string, string> = {
  new: 'anime',
  fit: 'anime jacket',
  layer: 'anime kimono',
  carry: 'anime backpack',
  sleep: 'anime bedding',
  build: 'anime jigsaw',
}

const PIN_TAGS: Record<string, string[]> = {
  new: ['AnimeMerch', 'AnimeAesthetic', 'OtakuLife', 'AnimeGifts', 'KawaiiKatz'],
  fit: ['AnimeJacket', 'AnimeFashion', 'AnimeOutfit', 'BomberJacket', 'AnimeMerch'],
  layer: ['AnimeKimono', 'HaoriJacket', 'JapaneseFashion', 'AnimeFashion', 'AnimeMerch'],
  carry: ['AnimeBackpack', 'AnimeBag', 'SchoolBackpack', 'AnimeMerch', 'OtakuStyle'],
  sleep: ['AnimeBedding', 'AnimeRoomDecor', 'OtakuRoom', 'AnimeBedroom', 'AnimeMerch'],
  build: ['AnimeJigsaw', 'JigsawPuzzle', 'PuzzleLover', 'AnimeArt', 'AnimeMerch'],
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
    catLead: PIN_LEAD[key] ?? 'anime',
    catTags: PIN_TAGS[key] ?? PIN_TAGS.new,
    style: 'anime',
    tail: 'Anime rooms and wardrobes, curated on Kawaii Katz.',
  }
}

/**
 * The shelf each product stands on, so a tile's Pin button carries the same
 * voice as the feed-shaped Pin of the shelf it is on.
 *
 * Without this the two halves disagree on the identical tile, one saying "an
 * anime bedding pick #AnimeBedding" and the other "a kawaii home decor pick
 * #KidsRoomDecor", and the same board ends up holding both. §4f shipped that
 * defect twice before it was written down.
 */
export function animeSectionIndex(all: Product[]): Map<string, string> {
  const out = new Map<string, string>()
  // Default depth, so every tile a visitor can actually reach has a Pin voice.
  // Passing a smaller number here would leave the deeper pages falling back to
  // the generic 'new' caption, which is the mismatch this function exists to
  // prevent.
  for (const { section, pages } of fillAnimePages(all)) {
    for (const page of pages) for (const p of page) out.set(p.id, section.key)
  }
  return out
}
