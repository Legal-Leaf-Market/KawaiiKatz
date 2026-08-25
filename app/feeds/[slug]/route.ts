import { BOARDS, board, fillBoard } from '@/lib/boards'
import { getCatalog } from '@/lib/catalog-source'
import { unproxied } from '@/lib/catalog-shared'
import { pinCaption } from '@/lib/pinterest'
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
 * `.xml` is part of the slug rather than a route segment.
 *
 * It is cosmetic and it is worth it: this URL gets pasted into a form in
 * Pinterest's settings by a human, and `/feeds/plushies.xml` is obviously a
 * feed in a way `/feeds/plushies` is not. The handler strips it back off.
 */
export function generateStaticParams() {
  return BOARDS.map((b) => ({ slug: `${b.slug}.xml` }))
}

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

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const b = board(slug.replace(/\.xml$/, ''))
  if (!b) return new Response('Not found', { status: 404 })

  const { products } = await getCatalog()
  const picks = fillBoard(b, products).flatMap((s) => s.products)

  // Stable order — see the note at the top. Ties fall back to id so the result
  // is fully determined even when two products carry the same `added` date.
  const items = picks
    .filter((p) => imageUrl(p))
    .sort((x, y) => {
      const a = Date.parse(x.added || '') || 0
      const c = Date.parse(y.added || '') || 0
      return a - c || (x.id < y.id ? -1 : 1)
    })

  const feedUrl = `${SITE_URL}/feeds/${b.slug}.xml`
  const pageUrl = `${SITE_URL}/gifts/${b.slug}`
  const built = Date.now()

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">\n` +
    `<channel>\n` +
    `<title>${esc(b.title)} — Kawaii Katz</title>\n` +
    `<link>${esc(pageUrl)}</link>\n` +
    `<description>${esc(b.tagline)}</description>\n` +
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
          domain: p.domain, tag: b.hashtag,
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
