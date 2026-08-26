import { SISTER_SITES, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site'

/**
 * schema.org nodes, split by what is actually site-wide and what is not.
 *
 * The whole graph used to live in app/layout.tsx, which meant every page
 * carried a CollectionPage node claiming `url: SITE_URL/` and
 * `@id: SITE_URL/#page`. On /brkox, and on the brand pages, that told search
 * engines the page they were looking at WAS the home collection — three
 * different URLs all asserting the same identity, with the wrong name and the
 * wrong description attached.
 *
 * WebSite and Organization genuinely are site-wide and stay in the layout.
 * The page-level node is now built per route by the helpers below.
 */

export const SITE_NODES = [
  {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: 'en',
    publisher: { '@id': `${SITE_URL}/#org` },
  },
  {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#org`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon.png`,
    // The sister sites already declare each other, which tells search engines
    // they share an operator. Kawaii Katz was absent from that graph.
    sameAs: SISTER_SITES,
  },
]

type PageNode = {
  /** Path with a leading slash. '/' for the home page. */
  path: string
  name: string
  description?: string
  /**
   * CollectionPage for a page that lists products (home, /brkox). WebPage for
   * one that does not — a brand showcase links out to a merchant's own
   * categories and has no product listing of its own, so calling it a
   * CollectionPage would be describing a page that isn't there.
   *
   * Article for /learn/<slug>. These are the only pages here that are a piece
   * of writing rather than a view onto the catalogue, and the type is what
   * lets a search engine treat them as such.
   */
  type?: 'CollectionPage' | 'WebPage' | 'Article'
}

export function pageNode({ path, name, description, type = 'WebPage' }: PageNode) {
  const url = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
  return {
    '@type': type,
    '@id': `${url}#page`,
    url,
    name,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    ...(description ? { about: description } : {}),
  }
}

/** Wrap nodes in a document ready to serialise into a ld+json script. */
export function jsonLd(nodes: unknown[]) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes })
}
