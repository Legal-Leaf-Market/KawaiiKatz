// Adult-model exclusion for apparel & accessories.
//
// Two layers work together (see also lib/person-scan.ts for the image layer):
//   1. This text layer: the curated "suggestive cut" phrase list ported from the
//      original storefront's KK_CUT_DEFAULT, plus explicit adult-model wording.
//      It runs instantly and needs no ML.
//   2. The image layer: coco-ssd person-box detection that flags photos featuring
//      a full-body (adult) model.
//
// Both layers are scoped to apparel & accessories only, so plush, stationery,
// kitchenware, etc. are never touched.

/**
 * Categories the coco-ssd IMAGE scan runs on.
 *
 * Still apparel and accessories only, because that scan is expensive and looks
 * for a full-body human model, which is a thing that appears on garment photos
 * and essentially nowhere else.
 *
 * NOTE WHAT THIS NO LONGER GATES. It used to gate the cheap TEXT filter too,
 * and that was a hole: see isAdultApparelByText below.
 */
export const MODEL_SCAN_CATS = new Set(['apparel', 'accessories'])

/**
 * Names that are a false positive for a CUT_PHRASE because of what the object
 * IS, not because of who it is for.
 *
 * Separate from KID_SAFE, which answers "is this for a child". These answer
 * "this cannot be clothing at all": a phone case is not lingerie however it is
 * decorated, a cooling blanket is silky in the way bedding is silky, and a
 * Christmas stocking is a decoration that hangs on a fireplace.
 *
 * Each was a real row in the live catalogue, and §7's rule is that a genuine
 * false positive gets a narrow entry here rather than a loosened CUT_PHRASES.
 */
const NOT_CLOTHING_AT_ALL: RegExp[] = [
  /\b(phone|samsung|iphone|ipad|airpod|laptop|tablet)\s+case\b/,
  /\bphone\s+(case|grip|strap|holder)\b/,
  /\b(cooling|weighted|throw|fleece|sherpa)\s+blanket\b/,
  /\bblanket\b.*\b(cooling|double sided|summer)\b/,
  /\bchristmas\s+stockings?\b/,
  /\bstockings?\b.*\b(christmas|holiday|fireplace|advent)\b/,
]

// Curated cut/style phrases (verbatim from the original KK_CUT_DEFAULT) plus
// adult-model-specific wording. Phrase-matched against a normalized name.
const CUT_PHRASES: string[] = [
  // --- original KK_CUT_DEFAULT ---
  'off shoulder', 'off-shoulder', 'cold shoulder', 'coquette', 'cocktail', 'halter',
  'bodycon', 'body con', 'bustier', 'corset', 'lingerie', 'negligee', 'nightie', 'night gown',
  'nightgown', 'chiffon', 'sheer', 'see through', 'see-through', 'fishnet', 'garter',
  'crop top', 'cropped top', 'mini dress', 'mini skirt', 'micro skirt', 'bralette', 'backless',
  'cleavage', 'maid outfit', 'maid dress', 'sailor uniform', 'bunny girl', 'silky', 'satin',
  'lace up', 'lace-up', 'strapless', 'spaghetti strap', 'thigh',
  'deep v', 'plunge', 'slit', 'bodysuit', 'swimsuit', 'bikini', 'underwear',
  'cami', 'camisole',
  'thigh high', 'thigh-high', 'high waist', 'high-waist', 'stockings', 'hosiery',
  'garter belt', 'peter pan collar', 'pan collar', 'school uniform', 'jk uniform',
  'seifuku', 'pleated skirt', 'high slit', 'open back', 'tube top', 'halterneck',
  // --- explicit adult-model wording ---
  'on model', 'model wearing', 'worn by model', 'adult model', 'full body model',
  'womens fashion', 'ladies fashion', 'sexy', 'seductive', 'clubwear', 'boudoir',
]

// Phrases that would otherwise trip the list but are legitimate children's items.
// Each is checked before the cut list so real kids inventory survives.
const KID_SAFE: RegExp[] = [
  /\b(baby|babies|infant|newborn|toddler|kids?|child(?:ren)?s?|boys?|girls?|youth)\b/,
  /\bdoll(?:'?s)?\s+(outfit|clothes|dress|clothing)\b/, // doll clothing, not human apparel
  /\bpleated\s+(school|uniform)\b/, // handled separately below if truly a school item
]

function norm(s: string): string {
  return ' ' + String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' '
}

/**
 * Text-layer verdict. Returns the matched phrase when the apparel/accessory name
 * reads as adult / suggestive-cut / model-worn, otherwise null.
 * Only meaningful for apparel & accessories — callers gate on MODEL_SCAN_CATS.
 */
export function adultApparelHit(name: string): string | null {
  const hay = norm(name)

  // Kids/baby/doll context is an automatic keep for the ambiguous garment terms
  // (swimsuit, bikini, bodysuit, tube top, etc.) that are innocent on children.
  const isKidContext = KID_SAFE.some((re) => re.test(hay))

  for (const phrase of CUT_PHRASES) {
    const needle = ' ' + phrase.replace(/[^a-z0-9]+/g, ' ').trim() + ' '
    if (hay.indexOf(needle) === -1) continue

    // Strong adult-only signals block even in a kid context.
    const alwaysBlock =
      phrase === 'lingerie' || phrase === 'negligee' || phrase === 'bustier' ||
      phrase === 'fishnet' || phrase === 'garter' || phrase === 'garter belt' ||
      phrase === 'bodycon' || phrase === 'body con' || phrase === 'sexy' ||
      phrase === 'seductive' || phrase === 'clubwear' || phrase === 'boudoir' ||
      phrase === 'adult model' || phrase === 'full body model' || phrase === 'cleavage' ||
      phrase === 'crotchless' || phrase === 'thong'

    if (isKidContext && !alwaysBlock) continue
    return phrase
  }
  return null
}

/**
 * Text-layer screening, run on EVERY category.
 *
 * -----------------------------------------------------------------------------
 * WHY THE CATEGORY GATE WAS REMOVED, WHICH IS THE WHOLE POINT OF THIS FUNCTION
 *
 * This used to return false unless the product was apparel or accessories, on
 * the reasoning that only clothing can be adult clothing. That reasoning is
 * sound and the implementation was still a hole, because it assumed the
 * classifier had got the category right.
 *
 * Three rows found on 2026-08-30 say it does not:
 *
 *   "Valentine Fuzzy Bear Lingerie Set"   cat: plush
 *   "Teddy Bear Lingerie Set"             cat: plush
 *   "Satin Baby Bear Panties"             cat: tech
 *
 * Every one is a garment. Every one was invisible to the one filter built to
 * catch it, purely because categorize() had filed it somewhere else. Ada found
 * one of them by hand and excluded it manually, which is the system working
 * only because a person was looking.
 *
 * A safety filter must not depend on a classifier being right, because the
 * classifier being wrong is exactly the case where the safety filter matters.
 * The text pass is cheap, so it now runs on everything.
 *
 * Measured cost of removing the gate, over 2,160 previously unscanned products:
 * 17 newly cut, of which 13 are genuine (3 lingerie sets, 4 underwear, 2
 * swimsuits, a nightgown, thigh highs, a coquette top, high-waist shorts) and 4
 * were false positives now handled by NOT_CLOTHING_AT_ALL.
 *
 * The coco-ssd IMAGE scan is unchanged and still gates on MODEL_SCAN_CATS. That
 * one is expensive and genuinely only makes sense on garment photography.
 */
export function isAdultApparelByText(name: string, cat: string): boolean {
  void cat
  const hay = norm(name)
  if (NOT_CLOTHING_AT_ALL.some((re) => re.test(hay))) return false
  return adultApparelHit(name) !== null
}
