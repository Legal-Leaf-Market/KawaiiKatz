import { MODEL_SCAN_CATS, adultApparelHit } from './adult-apparel'
import type { Product } from './data'

/**
 * Is this a thing you would give to a child?
 *
 * This is NOT the inverse of the adult-apparel filter, and building it that way
 * was the trap worth avoiding. That filter answers "is this obviously not for
 * kids", and most of the catalogue simply fails to trip it: a stainless steel
 * cup set, a pair of Victorian lace gloves and a bamboo thermo flask are all
 * perfectly innocent and none of them is a child's gift. Absence of an adult
 * signal is not presence of a kid one.
 *
 * So the rule is positive evidence, in three steps:
 *
 *   1. A short disqualifying list — alcohol, flame, blades, cosmetics, anything
 *      the adult-apparel text layer already rejects. These end it outright.
 *   2. Categories that are inherently children's shelves (plush, wooden toys,
 *      puzzles, stationery, blind boxes) pass on the category alone.
 *   3. Everything else — apparel, accessories, home, kitchen, tech, snacks —
 *      has to *say* it is for a child: an age word, a school or play word, or a
 *      character a child would recognise.
 *
 * It fails closed. A product we cannot place is not kid-safe, because the cost
 * of the two mistakes is not symmetric: hiding a good gift from one filtered
 * view is a nuisance, and putting the wrong thing in front of a parent shopping
 * for their eight-year-old is the kind of thing that loses a site its audience.
 */

/** Shelves that are children's shelves by construction. */
const KID_NATIVE_CATS = new Set(['plush', 'learning', 'puzzle', 'collect', 'stationery'])

/**
 * Ends it regardless of anything else. Kept deliberately short: every entry has
 * to be something no reasonable person gives a child, because the
 * positive-evidence rule below is what does the real work. A long list here
 * would just be a second way to get false negatives.
 */
const NEVER: string[] = [
  // adult framing
  'adult', 'adults only', 'mature', 'nsfw', 'erotic', 'fetish', 'bdsm', 'sexy', 'boudoir',
  // Alcohol, tobacco and their paraphernalia
  'alcohol', 'alcoholic', 'beer', 'wine', 'whiskey', 'whisky', 'vodka', 'sake', 'liquor',
  'cocktail', 'shot glass', 'wine glass', 'bottle opener', 'corkscrew',
  'cigarette', 'tobacco', 'vape', 'smoking', 'ashtray', 'bong', 'shisha', 'hookah', 'rolling tray',
  // Flame, blades and other hazards
  'candle', 'incense', 'lighter', 'matchbox', 'knife', 'blade', 'dagger', 'razor', 'scalpel',
  // Cosmetics — sold here, but not as a child's gift.
  // Note what is NOT here: a bare 'foundation'. It matched 61 socks, because
  // Sydney Sock Project's blurbs name the wildlife charities they donate to
  // ("Orangutan Foundation International"). The cosmetic sense needs the
  // qualified forms.
  'lipstick', 'lip gloss', 'lip tint', 'nail polish', 'mascara', 'eyeliner',
  'concealer', 'cushion foundation', 'liquid foundation', 'bb cream',
  'perfume', 'cologne', 'eyelash', 'false lashes',
  // Explicit gore
  'gore', 'bloody',
]

/**
 * Any one of these is enough for a product outside the native categories.
 * Three kinds of evidence: who it is for, what it is used for, and who is on it.
 */
const KID_EVIDENCE: string[] = [
  // --- who it is for ---
  'kid', 'kids', 'child', 'children', 'childrens', 'toddler', 'baby', 'babies',
  'infant', 'newborn', 'boy', 'boys', 'girl', 'girls', 'youth', 'junior', 'teen', 'tween',
  'nursery', 'preschool', 'kindergarten',
  // --- what it is for ---
  'toy', 'toys', 'plush', 'plushie', 'stuffed animal', 'squishy', 'squishmallow',
  'doll', 'rag doll', 'putty', 'slime', 'play dough', 'playdough', 'bath toy',
  'school', 'lunch box', 'lunchbox', 'bento', 'backpack', 'book bag', 'pencil case',
  'colouring', 'coloring', 'crayon', 'craft', 'sticker', 'stickers', 'sticker book',
  'playset', 'play set', 'playroom', 'building blocks', 'board game', 'jigsaw',
  'party favor', 'party favour', 'birthday',
  // --- who is on it ---
  'hello kitty', 'sanrio', 'kuromi', 'my melody', 'cinnamoroll', 'pompompurin',
  'keroppi', 'gudetama', 'badtz maru', 'little twin stars', 'pochacco',
  'pokemon', 'pikachu', 'eevee', 'doraemon', 'totoro', 'ghibli', 'studio ghibli',
  'disney', 'mickey', 'minnie', 'stitch', 'winnie the pooh', 'frozen', 'elsa',
  'sesame street', 'elmo', 'cookie monster', 'paw patrol', 'peppa pig', 'bluey',
  'care bears', 'my little pony', 'transformers', 'lego', 'barbie', 'hot wheels',
  'thomas the tank', 'dungeons', 'super mario', 'mario', 'kirby', 'sonic', 'minecraft',
  'pusheen', 'molang', 'rilakkuma', 'sumikko', 'shin chan', 'crayon shin',
  'teddy bear', 'unicorn', 'dinosaur', 'dino', 'mermaid', 'princess', 'superhero',
  'axolotl', 'capybara', 'panda', 'bunny', 'kitten', 'puppy',
]

function norm(s: string): string {
  return ' ' + String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' '
}

function hasPhrase(hay: string, phrase: string): boolean {
  return hay.indexOf(' ' + phrase.replace(/[^a-z0-9]+/g, ' ').trim() + ' ') !== -1
}

export type KidVerdict = { safe: boolean; reason: string }

/**
 * @param hay Everything known about the product as one string. At scrape time
 *   that is title + product_type + tags + blurb, which is markedly better than
 *   the name alone — a bikini called "Kawaii Maneki Neko" only says what it is
 *   in `product_type` (PROJECT_GUIDE §4, "the safety filter reads the NAME
 *   only"). This is the general fix for that gap.
 * @param cat Our category key.
 * @param name The product name, for the apparel text layer.
 */
export function kidVerdict(hay: string, cat: string, name: string): KidVerdict {
  const h = norm(hay)

  for (const phrase of NEVER) {
    if (hasPhrase(h, phrase)) return { safe: false, reason: `never:${phrase}` }
  }

  // The apparel layer is stricter than anything above and already tuned; reuse
  // it rather than restating it, so the two cannot drift apart. Gated to
  // apparel and accessories as that module documents — its phrase list is about
  // how a garment is cut, and run wider it rejects a phone case for being
  // "coquette".
  if (MODEL_SCAN_CATS.has(cat)) {
    const apparelHit = adultApparelHit(name)
    if (apparelHit) return { safe: false, reason: `apparel:${apparelHit}` }
  }

  if (KID_NATIVE_CATS.has(cat)) return { safe: true, reason: `cat:${cat}` }

  for (const phrase of KID_EVIDENCE) {
    if (hasPhrase(h, phrase)) return { safe: true, reason: `evidence:${phrase}` }
  }

  return { safe: false, reason: 'no-evidence' }
}

export function isKidSafeText(hay: string, cat: string, name: string): boolean {
  return kidVerdict(hay, cat, name).safe
}

/**
 * Verdict for a mapped product.
 *
 * Prefers the flag decided at scrape time, which saw `product_type` and tags.
 * Falls back to re-deriving from name and blurb for SEED_PRODUCTS and for any
 * entry mapped before the flag existed — less signal, but the alternative is
 * treating "we don't know" as "yes", and this filter fails closed.
 */
export function isKidSafe(p: Product): boolean {
  if (typeof p.kidSafe === 'boolean') return p.kidSafe
  return isKidSafeText(`${p.name} ${p.blurb}`, p.cat, p.name)
}
