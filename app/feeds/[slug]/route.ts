import { BOARDS, board, fillBoard } from '@/lib/boards'
import { DECORA_BOARDS, SOURCES, assignDecoraBoards, decoraBoard, decoraPin } from '@/lib/decora'
import { getCatalog, getVendorCatalog } from '@/lib/catalog-source'
import { db } from '@/lib/db'
import { storeExclusions } from '@/lib/db/schema'
import { unproxied } from '@/lib/catalog-shared'
import { pinCaption, type PinContext } from '@/lib/pinterest'
import { SITE_URL } from '@/lib/site'
import type { Product } from '@/lib/data'

/**
 * One RSS feed per collection, for Pinterest's auto-publish.
 *
 * -----------------------------------------------------------------------------
 * WHAT THIS IS FOR
 *
 * Pinterest can watch an RSS feed on a claimed domain and create Pins from it
 * automatically, each feed publishing to a board of its own. That is the only
 * bulk route open to this site: the catalogue and Product Pin tools are closed
 * to us because their merchant guidelines say a merchant "must not be an
 * affiliate marketer" (§4e).
 *
 * Every <link> here points at /p/<id> — our own page on our own domain, not the
 * merchant's affiliate deep link. That is what keeps a feed-generated Pin from
 * being an affiliate Pin, which is the category their community guidelines
 * limit "repetitively or in large volumes". The affiliate hop happens after the
 * visitor arrives and chooses to leave.
 *
 * NOT under /api/. robots.txt disallows that prefix outright, so a feed served
 * from there would be one Pinterest is not allowed to fetch.
 *
 * -----------------------------------------------------------------------------
 * ORDERED OLDEST-FIRST, AND NOT BY RANK
 *
 * Pinterest publishes the oldest item in a feed first, and re-reads the feed as
 * it changes. The collections re-rank every six hours as stock moves, so a feed
 * in rank order would reshuffle under Pinterest and risk the same product being
 * seen as new twice. Sorting by the date we first saw the product means the
 * order is stable: new stock appends to the end, and nothing that has already
 * been published moves.
 */

// 6 hours, matching the catalogue and the pages these feeds mirror. A literal:
// segment config is read without evaluating the module.
export const revalidate = 21600

// Only the slugs below exist. Without this any /feeds/<anything> would render.
export const dynamicParams = false

/**
 * The gift guides, plus the Decora boards.
 *
 * `.xml` is part of the slug rather than a route segment. It is cosmetic and it
 * is worth it: this URL gets pasted into a form in Pinterest's settings by a
 * human, and `/feeds/plushies.xml` is obviously a feed in a way
 * `/feeds/plushies` is not. The handler strips it back off.
 *
 * Two sources because they are two taxonomies over one catalogue and only one
 * of them has guide pages. A Decora board's feed links to a section anchor on
 * /decora rather than to a page of its own — section 4b's count is at thirty
 * catalogue-backed prerenders and its own conclusion is that the next thing
 * added should share a route rather than add a pair. Six feeds, no new pages.
 */
export function generateStaticParams() {
  return [...BOARDS, ...DECORA_BOARDS].map((b) => ({ slug: `${b.slug}.xml` }))
}

/** What a feed needs, whichever taxonomy it came from. */
type Feed = { title: string; tagline: string; pageUrl: string; slug: string; pin: PinContext }

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Guess a MIME type from the image URL, ignoring any query string. */
function imageType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return 'image/jpeg'
}

/**
 * The image, un-proxied.
 *
 * Product.image is always an /api/img path because that is what the cards
 * render, and robots.txt disallows /api/ — so a feed carrying the proxy path
 * would offer Pinterest an image it is not permitted to fetch. This is the same
 * trap that broke the Pin button and then og:image; it is the third time, hence
 * the note.
 */
function imageUrl(p: Product): string | null {
  const raw = unproxied(p.image || '')
  return /^https?:\/\//i.test(raw) ? raw : null
}

function rfc822(iso: string | undefined, fallback: number): string {
  const t = iso ? Date.parse(iso) : NaN
  return new Date(Number.isFinite(t) ? t : fallback).toUTCString()
}

/**
 * The curator's hidden products, kept out of every feed.
 *
 * The guide PAGES have always honoured this list, through useExclusions in the
 * browser. The feeds never did, and a feed is the half that publishes: a
 * product Ada hid for being suggestive would still have gone to Pinterest as a
 * Pin under our own account, on a board aimed at parents. Hiding something is
 * the clearest signal we get that it should not be pinned, and it was being
 * read on the one surface where it did not matter.
 *
 * Read straight from the table rather than through /api/exclusions, because
 * this runs during a prerender and a route fetching its own API at build time
 * is a request to a server that is not listening yet.
 *
 * Fails OPEN, deliberately, and that is the honest trade: with no DATABASE_URL
 * the site still has to build (§5 says the storefront runs without one), so an
 * unreachable table means an unfiltered feed rather than no feed. It is logged.
 */
async function excludedIds(): Promise<Set<string>> {
  try {
    const rows = await db.select({ productId: storeExclusions.productId }).from(storeExclusions)
    return new Set(rows.map((r) => r.productId))
  } catch (e) {
    console.warn(`[feeds] exclusions unavailable, feed is unfiltered: ${(e as Error).message}`)
    return new Set()
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const name = slug.replace(/\.xml$/, '')
  const b = board(name)
  const d = b ? undefined : decoraBoard(name)
  if (!b && !d) return new Response('Not found', { status: 404 })

  // A Decora feed publishes one room's shelf, so it builds one room's shelf.
  // The full fan-out plus the coco-ssd scan is around four minutes on a cold
  // worker and two of these feeds hit the 240s per-page cap on their first
  // deploy; the vendors it was scraping had nothing in the output. The
  // per-vendor cache entries are shared either way, so this takes work away
  // from nobody. See getVendorCatalog.
  const { products } = d ? await getVendorCatalog(SOURCES) : await getCatalog()
  const hidden = await excludedIds()
  const live = products.filter((p) => !hidden.has(p.id))

  let feed: Feed
  let picks
  if (b) {
    feed = {
      title: b.title,
      tagline: b.tagline,
      pageUrl: `${SITE_URL}/gifts/${b.slug}`,
      slug: b.slug,
      pin: { tag: b.hashtag, catLead: b.catLead, catTags: b.pinTags },
    }
    picks = fillBoard(b, live).flatMap((s) => s.products)
  } else {
    const dec = d as NonNullable<typeof d>
    feed = {
      title: dec.title,
      tagline: dec.tagline,
      // A shelf on the room, not a page of its own. `anchor` is the section id
      // that actually exists on /decora, which is not always this board's key:
      // the boards are a Pinterest taxonomy and the page is a wardrobe, and
      // linking to an anchor that is not there is a link to the top of the page
      // pretending to be a link to a shelf.
      pageUrl: `${SITE_URL}/decora#${dec.anchor}`,
      slug: dec.slug,
      pin: decoraPin(dec),
    }
    picks = assignDecoraBoards(live).find((x) => x.board.slug === dec.slug)?.products ?? []
  }

  // Stable order — see the note at the top. Ties fall back to id so the result
  // is fully determined even when two products carry the same `added` date.
  const items = picks
    .filter((p) => imageUrl(p))
    .sort((x, y) => {
      const a = Date.parse(x.added || '') || 0
      const c = Date.parse(y.added || '') || 0
      return a - c || (x.id < y.id ? -1 : 1)
    })

  const feedUrl = `${SITE_URL}/feeds/${feed.slug}.xml`
  const pageUrl = feed.pageUrl
  const built = Date.now()

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">\n` +
    `<channel>\n` +
    `<title>${esc(feed.title)} | Kawaii Katz</title>\n` +
    `<link>${esc(pageUrl)}</link>\n` +
    `<description>${esc(feed.tagline)}</description>\n` +
    `<language>en</language>\n` +
    `<lastBuildDate>${new Date(built).toUTCString()}</lastBuildDate>\n` +
    `<atom:link href="${esc(feedUrl)}" rel="self" type="application/rss+xml"/>\n` +
    items
      .map((p) => {
        const link = `${SITE_URL}/p/${p.id}`
        const img = imageUrl(p) as string
        // The board's own hashtag, not the month-based seasonal one — a feed is
        // read whenever Pinterest gets to it, which may be a different month
        // from the one it was written in.
        const caption = pinCaption({
          id: p.id, name: p.name, vendor: p.vendor, cat: p.cat,
          price: p.price, image: p.image, url: p.url || p.domain,
          domain: p.domain, ...feed.pin,
        })
        // Three ways of declaring the image, because feed readers disagree on
        // which one they honour: an <img> in the description, <enclosure>, and
        // media:content. Costs a few bytes; avoids an imageless Pin.
        const descHtml =
          `<img src="${esc(img)}" alt="${esc(p.name)}"/><p>${esc(caption)}</p>`
        return (
          `<item>\n` +
          `<title>${esc(p.name)}</title>\n` +
          `<link>${esc(link)}</link>\n` +
          `<guid isPermaLink="true">${esc(link)}</guid>\n` +
          `<pubDate>${rfc822(p.added, built)}</pubDate>\n` +
          `<description><![CDATA[${descHtml.replace(/]]>/g, ']]&gt;')}]]></description>\n` +
          `<enclosure url="${esc(img)}" type="${imageType(img)}" length="0"/>\n` +
          `<media:content url="${esc(img)}" medium="image" type="${imageType(img)}"/>\n` +
          `</item>\n`
        )
      })
      .join('') +
    `</channel>\n</rss>\n`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': `public, s-maxage=${revalidate}, stale-while-revalidate=86400`,
    },
  })
}
