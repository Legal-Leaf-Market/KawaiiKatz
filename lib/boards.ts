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
  /**
   * `season` guides are tied to a date — Christmas, Valentine's. `theme` guides
   * are not: they answer a standing question ("wooden toys for a two-year-old")
   * and are worth pinning in any month.
   *
   * The distinction earns its keep in three places: the index groups by it,
   * only a season carries a peak-months note, and only a season screens out
   * other holidays — a Halloween plush belongs on the plushies page and does
   * not belong in a Christmas price band.
   */
  kind: 'season' | 'theme'
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
  /**
   * The noun a Pin caption uses for anything published from this board, e.g.
   * "a kawaii plushie pick from Plushible".
   *
   * Overrides the product's own category, and it has to. The plushies feed
   * shipped six Pins captioned "a kawaii blind box pick" and one "kitchen",
   * because those products are genuinely categorised that way even though they
   * were being pinned to a plushies board. A Pin whose caption disagrees with
   * its board is a topic mismatch, and topic mismatch is one of the things that
   * holds a Pin back.
   */
  catLead: string
  /**
   * The hashtags a Pin from this board draws from, overriding the product's
   * own category pool in lib/pinterest.ts.
   *
   * `catLead` fixes the caption sentence; this fixes the tags, and the tags are
   * the half Pinterest actually reads a Pin's topic from. Both were the same
   * defect and only the first was fixed the first time round, so the plushies
   * feed published Pins that said "a kawaii plushie pick" and were tagged
   * #BlindBoxUnboxing.
   *
   * Absent on a season, on purpose: a Christmas guide carries every category at
   * once and `hashtag` already leads every Pin, so the product's own tags are
   * the accurate ones underneath it.
   */
  pinTags?: string[]
  /** Months (0-indexed) when a season guide peaks. Display only; empty for a theme. */
  season: number[]
  /**
   * What belongs on this page at all. A season takes the whole catalogue and
   * lets its sections sort it out; a theme is narrower than that, so `cats` and
   * `words` decide membership and a product matching NEITHER never appears.
   *
   * Leaving both empty means "everything", which is what a season wants.
   */
  cats?: string[]
  words?: string[]
  /**
   * Categories that can never appear here, whatever else matches.
   *
   * Needed because `words` is a broad net and neighbouring themes overlap. The
   * wooden-toys page was leading with jigsawdepot's wooden puzzle BOARDS and
   * sorting trays — real matches for `wooden` and `sorting`, and not Montessori
   * toys; they have their own page. Squishies was leading with a silicone
   * coffee cup called "Squishy". Both are one excluded category.
   */
  notCats?: string[]
  /**
   * Words that, in the NAME, push a product down rather than out.
   *
   * A theme's word list is a net, and the things it catches are not all equally
   * the theme. Every one of these was a real lead tile before it was added:
   * the jigsaw page opened with puzzle TABLES and sorting trays rather than
   * puzzles; blind boxes opened with a NASCAR plush and a college mascot,
   * because both are called a "Plush Figure"; squishies opened with a blanket
   * hoodie called a Mochi Bunny.
   *
   * Demote and not exclude, because a puzzle board on the puzzle page is
   * genuinely useful — just not the first thing a visitor should see.
   */
  demote?: string[]
  /**
   * Words that keep a product OFF the page entirely, matched against the name.
   *
   * `demote` was not enough. Plushible carries 74 college-mascot and NASCAR
   * licences — "University of Oklahoma Boomer 14 Inch Plush Figure", "NASCAR |
   * Team Penske Joey Logano 36in Plush Figure" — and demoting them only pushed
   * them down a list that then had to be filled from somewhere. In a section
   * with limited stock in its price band, down the list still means on the
   * page, and "Ohio State Brutus" shipped in the live plushies RSS feed.
   *
   * They are real, tracked products and they stay in the catalogue. They are
   * simply a different market from a kawaii gift guide, and a guide that is
   * pinned to Pinterest is the public face of the brand.
   */
  notWords?: string[]
  /**
   * Shops that never appear on this page, whatever their products match.
   *
   * The same judgement as `notWords` one level up: the vendor is what
   * disambiguates when no word can. Autoplush sells plush cars, and 9 of its 12
   * products landed on the plushies page as genuine matches, because a Miata
   * MX5 Plushie is a plushie. They are simply car-culture merch rather than
   * kawaii, and the feed is ordered oldest-first (section 4f), so the two
   * oldest rows in the catalogue meant a Tesla Model X was the first Pin
   * Pinterest ever made from a board called Kawaii Plushies.
   *
   * Excluding by word would have needed every model name — skyline, ae86,
   * supra, defender, wrangler, f150, mini — and `mini` alone would delete every
   * mini plushie in the catalogue. One vendor line cannot drift like that.
   *
   * They keep their place in the catalogue, the search and the Gift Finder, at
   * the highest commission rate we carry. They are just not what a kawaii guide
   * is for.
   */
  notVendors?: string[]
  /**
   * Tiles from one shop per section. Three is right for a gift guide, where a
   * band that is ten tiles of one shop reads as an advert.
   *
   * It is WRONG for a theme a single shop legitimately owns: jigsawdepot is 80%
   * of every puzzle in the catalogue, and capping it at three would leave the
   * puzzle page unable to fill a section from the stock that exists. Those
   * pages raise it — the honest cap on a specialist page is a high one.
   */
  maxPerVendor?: number
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

/**
 * Licensed sports and college merchandise, kept off every guide.
 *
 * Plushible's 74 of these are perfectly good products for somebody; that
 * somebody is not searching Pinterest for kawaii plushies. Measured against the
 * live catalogue: this list catches 74 rows and nothing else — no kawaii
 * product in 4,426 uses any of these words.
 */
/**
 * Things made OF plush that are not a plushie.
 *
 * "Plush" is an adjective at least as often as it is a noun, and neither the
 * plushies board's word net nor the vendors' own categories can tell the two
 * apart. Kore Kawaii and Kawaii Babe both file soft goods as `plush`, so the
 * live feed was publishing handbags, pencil cases, sleeping socks, a floor rug,
 * high-top trainers, bedding sets and a Valentine Fuzzy Bear Lingerie Set, each
 * captioned "a kawaii plushie pick". 55 of 240 tiles.
 *
 * That is the wooden-toys feed shipping a dustpan all over again, and it is
 * invisible from the page: a page shows the top of a section, a feed carries
 * all of it. Read the XML, not the grid.
 *
 * Excluded rather than demoted, for the reason SPORTS_LICENCE_TERMS records
 * below. Demoting pushes a row down a list that then has to be filled from
 * somewhere, and a feed carries the whole list regardless of order.
 *
 * `keychain` is deliberately absent: a plush keychain is a small plushie on a
 * ring, which is what someone browsing this page wants. So are `pillow`,
 * `puppet` and `bouquet` — a body pillow and a hand puppet are plush toys.
 *
 * `blanket` is absent too, and that one costs us. "K-Drama Cozy Warm Blanket"
 * stays on the page, because the alternative is losing two genuine
 * plushie-and-blanket gift sets to catch it. One row is the better price.
 *
 * THE REAL FIX IS UPSTREAM, and this list is a patch on the symptom. The
 * vendor's own `product_type` says "Bags" and "Dresses" outright, but it is
 * read by categorize() at scrape time and then discarded — it is not a field on
 * Product. Carrying it through would replace this whole list with one rule, and
 * would fix the same rows on the home page's plush filter, where they are
 * equally wrong and nobody has looked. That is a scrape change and a
 * unstable_cache version bump (section 4), so it is not folded in here.
 */
/**
 * Never on any guide, whatever else matches. Checked for every board.
 *
 * The squishies feed opened with "Gift Card: a kawaii squishy pick from Squishy
 * Bottle. Just $5.00", illustrated with a stock photo of two women exchanging a
 * present. Because a feed is ordered oldest-first (§4f), that was the FIRST Pin
 * Pinterest made from the board.
 *
 * A gift card is not a product, it is a way of paying for one. It has no image
 * worth pinning, it tells a visitor nothing, and on a curated shelf it reads as
 * a shop that could not be bothered to filter its own export. The same is true
 * of samples, shipping-protection upsells and deposits, which every Shopify
 * catalogue carries and none of which is a thing anybody wants.
 *
 * This belongs at board level rather than in an `exclude` on one vendor,
 * because there is no board on which any of it is ever right, and a per-vendor
 * list only fixes the vendor somebody noticed.
 */
const NEVER_ON_A_BOARD = [
  'gift card', 'gift cards', 'giftcard', 'e-gift', 'egift', 'gift certificate',
  'gift voucher', 'sample', 'samples', 'shipping protection', 'shipping insurance',
  'route protection', 'donation', 'deposit', 'store credit', 'test product',
]

export const PLUSH_NOT_A_TOY_TERMS = [
  // Bags and carriers.
  'backpack', 'backpacks', 'bookbag', 'bag', 'bags', 'purse', 'handbag',
  'tote', 'crossbody', 'sling bag', 'pouch', 'pouches', 'wallet', 'lanyard',
  'case', 'basket',
  // Worn.
  'socks', 'slippers', 'mittens', 'gloves', 'scarf', 'earmuffs', 'hand muff',
  'hand warmer', 'leg warmers', 'bucket hat', 'winter hat', 'high tops',
  'hi tops',
  'dress', 'jacket', 'coat', 'pants', 'trousers', 'shorts', 'crewneck',
  'outfit', 'pajama', 'mary janes', 'lingerie', 'jsk', 'boots',
  // Desk and stationery.
  'notebook', 'pens', 'pencil cover', 'photo card', 'diary', 'craft kit',
  'casting kit',
  // Home, car and homeware.
  'rug', 'bedding', 'pet bed', 'car seat', 'chair cushion', 'seat cushion',
  'bottle cover', 'bottle covers', 'sleep mask', 'sleep masks', 'stocking',
  'alarm clock', 'hair clip', 'hair clips',
  /**
   * Wearable blankets. Plushible's Snugible and Blankie Bestie lines are 24
   * rows, every one `cat: 'plush'` and none of them a plushie: a Snugible is an
   * adult blanket hoodie with a pillow, a Blankie Bestie is a blanket with a
   * plush head. Section 4e already records them leading the squishies page,
   * where they were only demoted. Demoting is not enough here, for the reason
   * SPORTS_LICENCE_TERMS records below: the feed carries the whole list
   * whatever its order, and this is where "HASBRO Dungeons & Dragons Snugible"
   * was going out as a kawaii plushie pick.
   */
  'snugible', 'blankie', 'hoodie', 'blanket hoodie', 'wearable blanket',
  'sweatshirt',
]

export const SPORTS_LICENCE_TERMS = [
  'nascar', 'ncaa', 'collegiate', 'university', 'buckeye', 'hoosier',
  'sooner', 'crimson tide', 'longhorn', 'wolverine', 'gator', 'aggie',
  // School NAMES, not just mascot nicknames. The list above is all nicknames,
  // and it let three products through into the live plushies feed because
  // Plushible names those rows "<school> <mascot>": "Ohio State Brutus",
  // "Georgia Tech Buzz Bee", "Virginia Tech Hokiebird". "Buckeye" is the Ohio
  // State nickname and appears nowhere in the Ohio State row's own title.
  //
  // Measured against the live catalogue before adding: these three terms match
  // 6 products, every one of them a college licence, and nothing else in 4,426.
  // Narrow terms, no false positives, the same discipline the `racing` note
  // below records.
  'ohio state', 'georgia tech', 'virginia tech',
]
// `racing` is deliberately absent, though every NASCAR row would match it.
// It also caught BRKOX's "Wall Display Frame for LEGO Technic Oracle Red Bull
// Racing" — a genuine collectible from a paying AWIN partner. Every NASCAR row
// already carries the word NASCAR, so the broad term bought nothing and cost a
// partner's product. Narrow the term; do not accept the false positive.

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
 * A stable pseudo-random order for products that score identically.
 *
 * Ties used to break on id, alphabetically, and on a specialist page where
 * every product scores the same that is what the visitor sees: the jigsaw page
 * opened "1000 Piece...", "1500 Piece...", "2000 Piece...", which reads like a
 * database dump because it is one. FNV-1a over the id scatters them instead.
 *
 * It must be a hash and not Math.random(): these pages prerender, and a random
 * order would differ between the server's HTML and the client's first render,
 * which React reports as a hydration mismatch.
 */
function tiebreak(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Does this product belong on this page at all? */
function belongs(b: Board, p: Product): boolean {
  if (hasWord(String(p.name || '').toLowerCase(), NEVER_ON_A_BOARD)) return false
  if (b.notCats?.length && b.notCats.includes(p.cat)) return false
  if (b.notVendors?.length && b.notVendors.includes(p.vendor)) return false
  if (b.notWords?.length && hasWord(String(p.name || '').toLowerCase(), b.notWords)) return false
  const byCat = b.cats?.length ? b.cats.includes(p.cat) : false
  const byWord = b.words?.length ? hasWord(haystack(p), b.words) : false
  if (!b.cats?.length && !b.words?.length) return true
  return byCat || byWord
}

/**
 * Extra score, per kind.
 *
 * A season ranks on how seasonal a product is. A theme ranks on whether the
 * theme's own words are in the NAME rather than only the blurb — "Wooden
 * Stacking Rainbow" is a wooden toy, while a plush whose blurb mentions a
 * wooden shelf is not, and both match the same word list. Without this the
 * lead section of a theme fills with things that merely mention it.
 */
function relevance(b: Board, p: Product): number {
  const name = String(p.name || '').toLowerCase()
  let r = 0
  if (b.kind === 'season') r = festiveScore(p)
  else if (b.words?.length && hasWord(name, b.words)) r = 3
  if (b.demote?.length && hasWord(name, b.demote)) r -= 4
  return r
}

/**
 * Deterministic, and it has to be: this runs during a prerender, so a
 * `Math.random()` tie-break would give the server and the client different
 * grids and React would throw a hydration mismatch. Ties break on id.
 */
function score(p: Product, rel: number): number {
  let s = rel
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

/**
 * The section layout every theme page uses: a curated lead, then price.
 *
 * Deliberately no kid-safe section, which the Christmas guide does have. There
 * the audience is mixed and the split is the useful one. On a theme that is
 * already kid-native — wooden toys, jigsaws — a kid-safe section would match
 * nearly everything, and because sections fill in order and a product is used
 * once, it would swallow the page and leave the price bands empty.
 */
function themeSections(lead: string): BoardSection[] {
  return [
    { key: 'pick', title: 'The pick of them', blurb: lead, max: 8, match: () => true },
    { key: 'under20', title: 'Under $20', blurb: 'Easy to say yes to.', max: 12, match: (p) => p.price > 0 && p.price <= 20 },
    { key: 'mid', title: '$20 to $50', blurb: 'The proper-present range.', max: 12, match: (p) => p.price > 20 && p.price <= 50 },
    { key: 'over50', title: 'Over $50', blurb: 'The ones worth planning for.', max: 8, match: (p) => p.price > 50 },
  ]
}

export const BOARDS: Board[] = [
  {
    slug: 'christmas',
    emoji: '🎄',
    kind: 'season',
    title: 'Kawaii Christmas Gift Guide',
    tagline: 'Cute, clever and kind presents, sorted by what you want to spend',
    intro:
      'Every year the same problem: you want to give something with a bit of personality, ' +
      'and you want to know what it costs before you fall in love with it. So this guide is ' +
      'sorted by price first. Everything here is in stock at one of our partner shops. You ' +
      'check out on their site, never ours.',
    hashtag: 'ChristmasGiftIdeas',
    catLead: 'Christmas',
    // A SEASON TAKES THE WHOLE CATALOGUE, which is right, and means it inherits
    // every problem the themed boards exclude one at a time. The live feed was
    // carrying "Penn State University Nittany Lion Kids Snugible" and three
    // Autoplush cars as Christmas gift ideas.
    //
    // Note what is deliberately NOT excluded here: the Snugibles, slippers and
    // blanket hoodies stay. A blanket hoodie is a bad plushie and a perfectly
    // good Christmas present, so PLUSH_NOT_A_TOY_TERMS is wrong for this board
    // even though it is right for plushies and squishies. The exclusions that
    // travel are the ones about MARKET rather than about category: a college
    // mascot and a plush Ford F150 are not kawaii gifts in December either.
    notWords: SPORTS_LICENCE_TERMS,
    notVendors: ['Autoplush'],
    season: [8, 9, 10, 11], // Sept–Dec; Pinterest searches Christmas from September
    sections: [
      {
        key: 'festive',
        title: 'Actually Christmassy',
        blurb: 'Santas, snowmen and advent calendars, the ones that only make sense in December.',
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

  /**
   * The themes. Six, and the six were chosen from the catalogue rather than
   * from taste — each was measured before it was written, for how much stock it
   * actually has and how much of that stock is tracked.
   *
   * Four obvious-looking themes were rejected on the second number and are
   * worth naming so nobody re-proposes them: cute socks (472 products, 1%
   * tracked), stickers (242, 7%), stationery (348, 23%) and pastel/fairy-kei
   * (305, 28%). They are the most pinnable categories here and the least
   * profitable, because sugarhai, Kawaii Babe and the two sock vendors carry
   * them and none of the four has a tracking value. Build them when they do.
   */
  {
    slug: 'wooden-montessori-toys',
    emoji: '🪵',
    kind: 'theme',
    title: 'Wooden & Montessori Toys',
    tagline: 'Open-ended wooden toys that survive a toddler and look good in the room',
    intro:
      'Wooden toys do not need batteries, do not make a noise at 6am, and tend to outlive ' +
      'the child they were bought for. These are the stacking, sorting and pretend-play ' +
      'kind, pulled from every shop we carry rather than just one, so you can compare ' +
      'before you buy.',
    hashtag: 'MontessoriToys',
    catLead: 'wooden toy',
    pinTags: ['MontessoriToys', 'WoodenToys', 'EducationalToys', 'ToddlerLearning', 'OpenEndedPlay'],
    season: [],
    cats: ['learning'],
    words: ['wooden', 'montessori', 'stacking', 'sorting', 'busy board', 'sensory'],
    notCats: ['puzzle'],
    /**
     * `wooden` is the theme's best search word and its worst filter. It also
     * describes furniture, and the RSS feed for this page went out carrying
     * three storage shelves, a desktop organiser, a silicone spatula, a dustpan
     * and a $99.99 felt pet portrait — every one captioned "a kawaii wooden toy
     * pick". None of them is a toy.
     *
     * Word-anchored, which is what keeps Montessori & Me's genuine "Montessori
     * Bookshelf" in: `shelf` does not match inside BOOKSHELF.
     */
    // `blankie` is deliberately absent, unlike on plushies and squishies: Russ
    // Berrie's "Activity Blankie" is a genuine baby development toy, where
    // Plushible's "Blankie Bestie" is a blanket. Same word, opposite verdict,
    // which is why these lists are per board and not one global one.
    notWords: [
      'shelf', 'shelves', 'shelving', 'spatula', 'dustpan', 'organiser',
      'organizer', 'hoop art', 'backpack', 'backpacks', 'bookbag',
      // A bunny onesie and a blanket cloak are not Montessori toys.
      'hoodie', 'onesie', 'cloak',
    ],
    maxPerVendor: 6,
    sections: themeSections('The ones we would buy first, across every shop.'),
  },
  {
    slug: 'jigsaw-puzzles',
    emoji: '🧩',
    kind: 'theme',
    title: 'Jigsaw Puzzles',
    tagline: 'Puzzles worth clearing the table for, from 500 pieces up',
    intro:
      'A jigsaw is the rare gift that is also an evening. These run from kid-sized to the ' +
      'kind that lives on a board under the sofa for a fortnight, plus the mats and sorting ' +
      'trays that make the big ones bearable.',
    hashtag: 'JigsawPuzzle',
    catLead: 'puzzle',
    pinTags: ['JigsawPuzzle', 'PuzzleLover', 'FamilyGameNight', 'PuzzleTime', 'KidsPuzzles'],
    season: [],
    cats: ['puzzle'],
    words: ['jigsaw', 'puzzle'],
    demote: ['board', 'table', 'mat', 'storage', 'tray', 'drawer', 'frame', 'caddy', 'cover', 'roll up'],
    // jigsawdepot is 80% of every puzzle in the catalogue. A cap of three would
    // leave this page unable to fill a section from the stock that exists.
    maxPerVendor: 10,
    sections: themeSections('Where to start, if you are buying one.'),
  },
  {
    slug: 'blind-boxes',
    emoji: '🎁',
    kind: 'theme',
    title: 'Blind Boxes & Collectible Figures',
    tagline: 'The unboxing kind: series figures, art toys and mystery boxes',
    intro:
      'Half the fun is not knowing. Blind boxes come as a sealed series where you get one ' +
      'of a set at random, and the good ones are properly designed objects rather than ' +
      'landfill. Chase figures, full sets and the single-box way in.',
    hashtag: 'BlindBoxUnboxing',
    catLead: 'blind box',
    pinTags: ['BlindBoxUnboxing', 'KawaiiCollectibles', 'DesignerToys', 'ToyCollection', 'CollectibleFigures'],
    season: [],
    cats: ['collect'],
    words: ['blind box', 'blindbox', 'mystery box', 'art toy'],
    demote: ['plush', 'plushie', 'snugible'],
    notWords: SPORTS_LICENCE_TERMS,
    maxPerVendor: 8,
    sections: themeSections('The series we would open first.'),
  },
  {
    slug: 'plushies',
    emoji: '🧸',
    kind: 'theme',
    title: 'Kawaii Plushies',
    tagline: 'Soft things, from pocket-sized to alarmingly large',
    intro:
      'The biggest shelf we have. Cats, bunnies, frogs, axolotls, a startling number of ' +
      'hedgehogs, sorted by price so you can find the $10 one for a stocking and the ' +
      'enormous one for a birthday without scrolling past each other.',
    hashtag: 'KawaiiPlushies',
    catLead: 'plushie',
    pinTags: ['KawaiiPlushies', 'PlushieCollection', 'CutePlushies', 'SoftToys', 'PlushieLover'],
    season: [],
    cats: ['plush'],
    words: ['plush', 'plushie', 'stuffed animal', 'soft toy'],
    // Plushible carries college-mascot and NASCAR licences. Real products, and
    // nobody arrives at a kawaii plushie page hoping for Bucky Badger. The
    // second list is the bags and footwear that "plush" the adjective drags in.
    notWords: [...SPORTS_LICENCE_TERMS, ...PLUSH_NOT_A_TOY_TERMS],
    // Autoplush is 12 plush cars. Genuinely plush, genuinely not kawaii.
    notVendors: ['Autoplush'],
    maxPerVendor: 5,
    sections: themeSections('The ones that keep getting picked up.'),
  },
  {
    slug: 'squishies-and-fidgets',
    emoji: '🫧',
    kind: 'theme',
    title: 'Squishies & Fidget Toys',
    tagline: 'Squeezable, slow-rising, quietly useful in a meeting',
    intro:
      'Squishies, mochi toys and fidgets, bought for children and kept by adults. Small, ' +
      'cheap, and the easiest thing on this site to buy several of.',
    hashtag: 'SquishyToy',
    catLead: 'squishy',
    pinTags: ['SquishyToy', 'FidgetToys', 'SensoryToys', 'SquishyCollection', 'StressRelief'],
    season: [],
    cats: [],
    words: ['squishy', 'squishies', 'squish', 'fidget', 'mochi', 'stress ball', 'slow rising'],
    // Squishy Bottle's collapsible silicone cups are called "Squishy" and are
    // drinkware, not fidget toys. They belong on the lunch page, and are there.
    notCats: ['kitchen'],
    // Demoting the Snugibles was not enough, exactly as it was not enough on
    // the plushies board: a feed carries the whole list whatever its order, so
    // "Mochi Bunny Adult Snugible | Blanket Hoodie & Pillow" went out as a
    // kawaii squishy pick anyway. Same shared list, same reasoning.
    notWords: PLUSH_NOT_A_TOY_TERMS,
    // Autoplush's Ae86 shipped here as "a kawaii squishy pick". A plush car is
    // not a squishy and is not kawaii; see the note on the plushies board.
    notVendors: ['Autoplush'],
    maxPerVendor: 6,
    sections: themeSections('Start here.'),
  },
  /**
   * -------------------------------------------------------------------------
   * THE CATEGORY BOARDS, AND THE ONE THAT IS NOT HERE
   *
   * These four exist because Pinterest boards already existed for them and
   * wanted feeds. Each is a single `cats` value, which is all a category board
   * needs: `words` and `demote` are for themes that cut ACROSS categories, and
   * using them here would only re-litigate what categorize() already decided.
   *
   * Every one was measured against the live catalogue before it was written,
   * because §4e's rule is to check what share of a shelf actually EARNS before
   * building a page for it. Measured 2026-08-30 over 4,421 products:
   *
   *   category      products   tracked   median
   *   food                47       98%    $3.99
   *   home               201       50%   $29.99
   *   tech               272       45%   $24.99
   *   accessories        830       40%   $19.99
   *   apparel          1,435       11%      $38   <- NOT BUILT
   *
   * APPAREL IS DELIBERATELY ABSENT and it is the biggest category we have.
   * 1,435 products of which 153 earn anything: Sydney Sock Project's 429 and
   * Kawaii Babe's 272 are both untracked, and they are most of the shelf. §4e
   * already rejected four boards on this exact test, the worst of them at 28%
   * tracked. Eleven percent means nine Pins in ten send a shopper somewhere we
   * are paid nothing for, and a board is a durable public thing to spend on
   * that. It goes in the moment either vendor's tracking is real.
   */
  {
    slug: 'kawaii-snacks',
    emoji: '🍬',
    kind: 'theme',
    title: 'Kawaii Snacks & Drinks',
    tagline: 'Japanese sweets, novelty drinks and things that come in a very cute box',
    intro:
      'The cheapest shelf here and the one people actually finish. Median price under $4, ' +
      'which makes it the easiest thing to add to an order for something else.',
    hashtag: 'JapaneseSnacks',
    catLead: 'snack',
    pinTags: ['JapaneseSnacks', 'KawaiiSnacks', 'AsianSnacks', 'SnackHaul', 'SnackLover'],
    season: [],
    cats: ['food'],
    // "Pink Princess Blaster", a $59.99 toy, is filed as food and was the
    // oldest row, so it would have been the first Pin this board ever made.
    notWords: ['blaster'],
    // 45 of 47 products are Kore Kawaii's, so a cap of 3 would leave the board
    // unable to fill a single section. This is the jigsawdepot case: the honest
    // cap on a shelf one shop owns is a high one.
    //
    // 47 products is thin, and that is worth knowing rather than hiding: Blippo
    // is 90% Japanese snacks and is still `pending` (§4). The day that vendor
    // ships, this board stops being the smallest one here.
    maxPerVendor: 20,
    sections: themeSections('Small, cheap, and gone by Thursday.'),
  },
  {
    slug: 'kawaii-home-decor',
    emoji: '🏠',
    kind: 'theme',
    title: 'Kawaii Home & Decor',
    tagline: 'Room decor, night lights and soft things for a shelf',
    intro:
      'The things that make a room read as somebody rather than as a rental: night lights, ' +
      'cushions, wall pieces and the occasional deeply unnecessary lamp.',
    hashtag: 'KawaiiRoomDecor',
    catLead: 'home decor',
    pinTags: ['KawaiiRoomDecor', 'CuteHomeDecor', 'KawaiiBedroom', 'AestheticRoom', 'KidsRoomDecor'],
    season: [],
    cats: ['home'],
    maxPerVendor: 6,
    sections: themeSections('The ones worth clearing a shelf for.'),
  },
  {
    slug: 'kawaii-tech-gaming',
    emoji: '🎮',
    kind: 'theme',
    title: 'Kawaii Tech & Gaming',
    tagline: 'Desk setups, phone cases and controller grips that are not black plastic',
    intro:
      'Everything on a desk can be cute and almost none of it is, which is the entire reason ' +
      'this shelf sells. Keyboards, cases, cables, lights and the things around a console.',
    hashtag: 'KawaiiTech',
    catLead: 'tech',
    pinTags: ['KawaiiTech', 'CuteGadgets', 'GamingSetup', 'KawaiiDesk', 'TechAccessories'],
    season: [],
    cats: ['tech'],
    /**
     * KAWAII BABE'S APPAREL AND MAKEUP LAND IN `tech`, and reading the feed
     * before connecting it is the only reason anyone knows. In oldest-first
     * order this board was about to publish a Manga Baby Eyeshadow Palette,
     * Love & Lace Platform Sneakers, a Pink Princess Gamer Hoodie and
     * "Satin Baby Bear Panties", every one captioned "a kawaii tech pick".
     *
     * The underwear is the one that matters, and it is worth understanding why
     * it got through rather than just excluding it. `satin` IS in CUT_PHRASES,
     * so the adult-apparel filter would have caught it — but that filter only
     * runs on MODEL_SCAN_CATS, which is apparel and accessories. A garment
     * misfiled as `tech` is invisible to the one filter built to catch it.
     * Miscategorisation does not just misplace a product, it can route it
     * around a safety layer.
     *
     * These rows are still in the catalogue and still wrong there; this list
     * only keeps them off a public board. The real fix is upstream in
     * categorize(), which is a scrape change and a cache bump (§4).
     */
    notWords: [
      'panties', 'lingerie', 'thong', 'bra',
      'hoodie', 'sneakers', 'shoes', 'platform', 'dress', 'skirt',
      'eyeshadow', 'palette', 'lipstick', 'lip gloss', 'makeup', 'nail polish',
      'cushion', 'seat cushion',
    ],
    maxPerVendor: 6,
    sections: themeSections('Desk upgrades that are not black plastic.'),
  },
  {
    slug: 'kawaii-accessories',
    emoji: '🎀',
    kind: 'theme',
    title: 'Kawaii Accessories',
    tagline: 'Bags, charms, hair clips and the small things that finish an outfit',
    intro:
      'The shelf people browse without meaning to buy anything. Charms, clips, keyrings and ' +
      'bags, mostly under $20, mostly bought as a treat rather than a plan.',
    hashtag: 'KawaiiAccessories',
    catLead: 'accessory',
    pinTags: ['KawaiiAccessories', 'CuteAccessories', 'KawaiiBackpack', 'AccessoryHaul', 'KawaiiAesthetic'],
    season: [],
    cats: ['accessories'],
    // Plushible's collector teddy bears are filed as accessories and led the
    // feed. A plush keychain is an accessory; a 11in Thomas Kinkade collector
    // bear is a plushie, and it has its own board.
    notWords: ['rattle', 'collector', 'teddy bear'],
    maxPerVendor: 5,
    sections: themeSections('The small stuff that does the most work.'),
  },
  {
    slug: 'bento-and-lunch',
    emoji: '🍱',
    kind: 'theme',
    title: 'Bento Boxes & Cute Lunches',
    tagline: 'Lunchboxes, bento gear and the small tools that make a packed lunch fun',
    intro:
      'A packed lunch is a daily obligation or a small pleasure, and the difference is ' +
      'mostly the box. Compartment bento boxes, insulated bags, picks, cutters and the ' +
      'bottles that go with them.',
    hashtag: 'CuteLunchBox',
    catLead: 'lunch',
    pinTags: ['CuteLunchBox', 'KawaiiBento', 'BentoBox', 'KidsLunchIdeas', 'SchoolLunchIdeas'],
    season: [],
    cats: ['kitchen'],
    // Bottles stay eligible through `cats`, but are deliberately NOT in `words`:
    // a word hit in the NAME is what boosts a product into the lead section, and
    // the lead was opening with a "Collapsible Military Water Bottle Canteen".
    words: ['bento', 'lunch box', 'lunchbox', 'lunch bag', 'snack box'],
    maxPerVendor: 6,
    sections: themeSections('The ones that actually survive a school bag.'),
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
 * Deals a ranked list into pages, applying a per-vendor cap within each page.
 *
 * Exported because the grid re-deals client-side once a visitor has a taste
 * profile: the pool is re-ordered by what they have thumbed, then dealt again.
 * The cap has to travel with the dealing — a shuffled page that is twelve tiles
 * of one shop is the advert problem the cap exists to prevent, and taste
 * ordering makes it MORE likely, not less, because a visitor who liked one
 * thing from a shop will rank that shop's whole shelf.
 *
 * A product the cap defers waits for the next page rather than being dropped.
 */
export function dealPages(list: Product[], size: number, cap: number, maxPages = 6): Product[][] {
  const pages: Product[][] = []
  const remaining = list.slice()
  while (pages.length < maxPages && remaining.length) {
    const page: Product[] = []
    const perVendor = new Map<string, number>()
    for (let i = 0; i < remaining.length && page.length < size; ) {
      const p = remaining[i]
      const n = perVendor.get(p.vendor) ?? 0
      if (n < cap) {
        perVendor.set(p.vendor, n + 1)
        page.push(p)
        remaining.splice(i, 1)
      } else {
        i++
      }
    }
    if (!page.length) break
    pages.push(page)
  }
  return pages
}

/** The per-vendor cap a board deals with, for callers outside this module. */
export function vendorCap(b: Board): number {
  return b.maxPerVendor ?? MAX_PER_VENDOR_PER_SECTION
}

/** A section, dealt into pages of `section.max` so the grid can shuffle. */
export type BoardPaged = { section: BoardSection; pages: Product[][] }

/**
 * Fills a guide's sections from the live catalogue.
 *
 * Sections are filled IN ORDER and a product is used once. That is what makes
 * the page read as curation rather than five filters over the same shelf: the
 * genuinely festive things go in the festive section even when they are also
 * under $15, and the price bands below get variety instead of the same plush
 * five times.
 */
/**
 * Every eligible product for each section, dealt into pages.
 *
 * A section shows twelve; the plushies shelf has 567. `fillBoard` picked the
 * top twelve and threw the rest away, which made the page a fixed shortlist
 * rather than a way into the catalogue — so this returns the whole eligible
 * run, in pages, and the grid shuffles between them.
 *
 * The vendor cap applies WITHIN each page rather than across the section. A
 * product the cap defers is not dropped: it waits for the next page. Otherwise
 * shuffling past page one would mean shuffling through the shops we happen to
 * carry most of, which is the advert problem the cap exists to prevent, just
 * spread over time.
 */
export function fillBoardPages(b: Board, products: Product[], maxPages = 6): BoardPaged[] {
  const cap = b.maxPerVendor ?? MAX_PER_VENDOR_PER_SECTION
  const pool = products
    .filter((p) => p && p.id && p.name && p.price > 0 && String(p.image || '').trim())
    // Only a season screens out other holidays. A Halloween plush belongs on
    // the plushies page; it does not belong in a Christmas price band.
    .filter((p) => b.kind !== 'season' || !offSeason(p))
    .filter((p) => belongs(b, p))
    .map((p) => ({ p, rel: relevance(b, p) }))
    .map((x) => ({ ...x, s: score(x.p, x.rel) }))
    .sort((a, b2) => b2.s - a.s || tiebreak(a.p.id) - tiebreak(b2.p.id))

  /**
   * One full pass over every section, exactly as the page has always been
   * built: sections fill in order, a product is used once, the vendor cap
   * applies within the section.
   *
   * Paging is rounds of THIS, not a bigger version of it, and that is the whole
   * design. The first attempt let each section claim `max * maxPages` products
   * up front, which starved the sections below it — the jigsaw page fell from
   * 36 tiles to 11 because "The pick of them" had claimed 48 puzzles before the
   * price bands got a look. Running the same pass repeatedly over what is left
   * makes round 0 identical to the un-paged output by construction.
   */
  function round(used: Set<string>): BoardPick[] {
    return b.sections.map((section) => {
      const chosen: Product[] = []
      const perVendor = new Map<string, number>()
      for (const { p, rel } of pool) {
        if (chosen.length >= section.max) break
        if (used.has(p.id)) continue
        if (!section.match(p, rel)) continue
        const n = perVendor.get(p.vendor) ?? 0
        if (n >= cap) continue
        perVendor.set(p.vendor, n + 1)
        used.add(p.id)
        chosen.push(p)
      }
      return { section, products: chosen }
    })
  }

  const used = new Set<string>()
  const rounds: BoardPick[][] = []
  for (let r = 0; r < maxPages; r++) {
    const got = round(used)
    if (!got.some((x) => x.products.length)) break
    rounds.push(got)
  }

  // Transpose rounds into per-section pages, dropping sections that never
  // filled and trailing empty pages for sections that ran dry early.
  return b.sections
    .map((section, i) => ({
      section,
      pages: rounds.map((r) => r[i].products).filter((page) => page.length > 0),
    }))
    .filter((x) => x.pages.length > 0)
}

/**
 * The first page of each section — what the server renders.
 *
 * Identical to what this function returned before paging existed, which is the
 * point: the prerendered HTML does not change, and shuffling is something the
 * grid does afterwards with a catalogue it already has.
 */
export function fillBoard(b: Board, products: Product[]): BoardPick[] {
  // Deliberately NOT fillBoardPages(b, products, 1). With one page to deal
  // into, a product the vendor cap defers has nowhere to wait and is simply
  // lost — which silently cut the Christmas guide from 56 tiles to 36 and the
  // plushies page from 40 to 24 the first time this was written that way. The
  // deferred products have to have a later page to land on for page one to
  // fill from the whole eligible run, exactly as it did before paging existed.
  return fillBoardPages(b, products)
    .map(({ section, pages }) => ({ section, products: pages[0] ?? [] }))
    .filter((x) => x.products.length > 0)
}

/** Guides of one kind, in declaration order. Used by the index and the sitemap. */
export function boardsOfKind(kind: Board['kind']): Board[] {
  return BOARDS.filter((b) => b.kind === kind)
}
