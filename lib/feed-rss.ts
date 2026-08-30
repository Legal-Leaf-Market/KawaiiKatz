import { unproxied } from '@/lib/catalog-shared'
import { pinCaption, type PinContext } from '@/lib/pinterest'
import { SITE_URL } from '@/lib/site'
import type { Product } from '@/lib/data'

/**
 * The RSS document every Pinterest feed on this site renders.
 *
 * Extracted from app/feeds/[slug]/route.ts when Ada's Picks needed its OWN
 * route rather than another slug on that one. Segment config is per-route, and
 * the two want different cadences: a board feed changes when the catalogue
 * does, every six hours, and a picked list changes the moment a person presses
 * a star. Waiting six hours to publish a judgement is the wrong trade.
 *
 * Two copies of this markup would have drifted the first time one of them was
 * fixed, and the image declaration below is exactly the sort of thing that gets
 * fixed in one place and forgotten in the other.
 */

export type FeedMeta = {
  title: string
  tagline: string
  /** Where a Pin from this feed lands. Absolute. */
  pageUrl: string
  /** Filename without `.xml`. */
  slug: string
  /** What this collection overrides on a product's own Pin caption. */
  pin: PinContext
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
 * trap that broke the Pin button and then og:image; it has now been hit four
 * times, hence the note and hence this living in one file.
 */
export function imageUrl(p: Product): string | null {
  const raw = unproxied(p.image || '')
  return /^https?:\/\//i.test(raw) ? raw : null
}

function rfc822(iso: string | undefined, fallback: number): string {
  const t = iso ? Date.parse(iso) : NaN
  return new Date(Number.isFinite(t) ? t : fallback).toUTCString()
}

export function renderFeed(feed: FeedMeta, items: Product[], revalidate: number): Response {
  const feedUrl = `${SITE_URL}/feeds/${feed.slug}.xml`
  const built = Date.now()

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">\n` +
    `<channel>\n` +
    `<title>${esc(feed.title)} | Kawaii Katz</title>\n` +
    `<link>${esc(feed.pageUrl)}</link>\n` +
    `<description>${esc(feed.tagline)}</description>\n` +
    `<language>en</language>\n` +
    `<lastBuildDate>${new Date(built).toUTCString()}</lastBuildDate>\n` +
    `<atom:link href="${esc(feedUrl)}" rel="self" type="application/rss+xml"/>\n` +
    items
      .map((p) => {
        const link = `${SITE_URL}/p/${p.id}`
        const img = imageUrl(p) as string
        // The collection's own hashtag, not the month-based seasonal one — a
        // feed is read whenever Pinterest gets to it, which may be a different
        // month from the one it was written in.
        const caption = pinCaption({
          id: p.id, name: p.name, vendor: p.vendor, cat: p.cat,
          price: p.price, image: p.image, url: p.url || p.domain,
          domain: p.domain, ...feed.pin,
        })
        // Three ways of declaring the image, because feed readers disagree on
        // which one they honour: an <img> in the description, <enclosure>, and
        // media:content. Costs a few bytes; avoids an imageless Pin.
        const descHtml = `<img src="${esc(img)}" alt="${esc(p.name)}"/><p>${esc(caption)}</p>`
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
