/**
 * One place for the site's public identity, so robots, sitemap, manifest and
 * the page metadata cannot drift apart. The sister sites keep these values in
 * four hand-maintained files and the CLAUDE.md notes warn about exactly that
 * drift ("if you add a department route to vercel.json, add it here too").
 */

export const SITE_URL = 'https://www.kawaiikatz.com'

/** Bare brand name. Used where a machine reads it as an identifier — the PWA
 *  short_name under a home-screen icon, and the schema.org Organization. */
export const SITE_NAME = 'Kawaii Katz'

export const SITE_TAGLINE = 'Kawaii, Clever & Kind'

/**
 * The display title. Browser tab, social cards, installed app name.
 *
 * It used to open with the black-cat and panda emoji, and the note here said to
 * keep them because they were the identity rather than decoration. That was
 * true when it was written — there was no logo, so the emoji were the only mark
 * the brand had.
 *
 * There is a real one now (assets/icon.svg, and components/BrandMark.tsx in the
 * UI), which turned the emoji from a stand-in into a liability: a title string
 * cannot carry an SVG, so those characters rendered in whatever the reader's OS
 * emoji font draws — and on most platforms the "black cat" is periwinkle blue.
 * The tab showed the correct plum-and-pink favicon beside a purple cat.
 *
 * So the branding now lives where it can be controlled — favicon, og:image,
 * header mark — and the title is just words.
 */
export const SITE_TITLE = `${SITE_NAME} | ${SITE_TAGLINE}`

export const SITE_DESCRIPTION =
  'Curated kawaii finds: plushies, stationery, kitchen, puzzles & more. ' +
  'Kawaii Katz discovers the best cute & clever things for every budget.'

/**
 * The sister storefronts. Nicotia and Legal-Leaf already cross-reference each
 * other through schema.org `sameAs`; Kawaii Katz was missing from that graph
 * entirely, so search engines had no signal that it belongs to the same
 * operator. Listing them here puts it in the family.
 */
export const SISTER_SITES = [
  'https://legal-leafmarket.com',
  'https://nicotiamarket.com',
  'https://herballeafmarket.com',
]
