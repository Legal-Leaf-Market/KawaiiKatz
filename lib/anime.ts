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
    kicker: 'Bombers, hoodies, varsity',
    title: 'Wear it out',
    blurb: 'Jackets built around the artwork rather than a logo stuck on a blank.',
    sticker: 'st-fit',
    max: 12,
    match: (p) => hasWord(hay(p), OUTER),
  },
  {
    key: 'layer',
    kicker: 'Haori, yukata, kimono',
    title: 'The loose layer',
    blurb: 'Open-front and worn over everything else. Reads as a cardigan anywhere that is not a convention.',
    sticker: 'st-layer',
    max: 12,
    match: (p) => hasWord(hay(p), LAYER),
  },
  {
    key: 'carry',
    kicker: 'Backpacks and bags',
    title: 'Carry it every day',
    blurb: 'The one thing here that gets used daily, which is why the print has to be good.',
    sticker: 'st-carry',
    max: 12,
    match: (p) => hasWord(hay(p), CARRY),
  },
  {
    key: 'sleep',
    kicker: 'Duvets, sets, pillowcases',
    title: 'Sleep in it',
    blurb: 'The biggest surface in a bedroom and the one nobody thinks to decorate.',
    sticker: 'st-sleep',
    max: 12,
    match: (p) => hasWord(hay(p), BED),
  },
  {
    key: 'build',
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
  /* Newest first, so "New in the room" is true of the first section and every
     later one still gets recent stock rather than whatever sorted last. */
  const pool = all
    .filter((p) => ANIME_VENDORS.includes(p.vendor))
    .slice()
    .sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')))

  const used = new Set<string>()
  const out: FilledSection[] = []

  for (const section of ANIME_SECTIONS) {
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
    /* An empty section is DROPPED, not rendered empty. A heading standing over
       nothing is a promise of content, which reads worse than not offering it:
       the same call the main shelf already makes by staying hidden until there
       is stock. */
    if (picked.length) {
      /* Destructured rather than spread, so the matcher is dropped by name and
         a future field on AnimeSection is carried across automatically. */
      const { match: _match, ...view } = section
      out.push({ section: view, products: picked })
    }
  }
  return out
}

/** Everything the room drew on, for the count in the standfirst. */
export function animePool(all: Product[]): Product[] {
  return all.filter((p) => ANIME_VENDORS.includes(p.vendor))
}
