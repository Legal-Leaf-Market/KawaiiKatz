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

export const MODEL_SCAN_CATS = new Set(['apparel', 'accessories'])

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

/** Convenience boolean for apparel/accessories text screening. */
export function isAdultApparelByText(name: string, cat: string): boolean {
  if (!MODEL_SCAN_CATS.has(cat)) return false
  return adultApparelHit(name) !== null
}
