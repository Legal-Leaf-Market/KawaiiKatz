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
 * The display title, emoji and all. This is the brand as it should appear to a
 * person: browser tab, social cards, installed app name. Keep the emoji — it is
 * the identity, not decoration.
 */
export const SITE_TITLE = `🐈‍⬛ ${SITE_NAME} 🐼 — ${SITE_TAGLINE}`

export const SITE_DESCRIPTION =
  'Curated kawaii finds — plushies, stationery, kitchen, puzzles & more. ' +
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
