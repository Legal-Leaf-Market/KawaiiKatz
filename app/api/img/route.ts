import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Only proxy images from known Shopify/vendor CDNs to prevent SSRF/open-proxy abuse.
const ALLOWED_HOSTS = [
  'cdn.shopify.com',
  'cdn.shopifycdn.com',
]

function hostAllowed(u: URL): boolean {
  return ALLOWED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get('u')
  if (!src) return new Response('missing u', { status: 400 })

  let url: URL
  try {
    url = new URL(src)
  } catch {
    return new Response('bad url', { status: 400 })
  }

  if (url.protocol !== 'https:' || !hostAllowed(url)) {
    return new Response('host not allowed', { status: 403 })
  }

  // Optional `w` — the rendered width the caller actually needs. Shopify's CDN
  // resizes on the fly, and the saving is not marginal: a card photo is 70KB at
  // full size and 16KB at width=400. Without this every 240px card downloaded a
  // 1000px+ original.
  //
  // Clamped and snapped to a short ladder so a handful of URLs serve the whole
  // site; an unbounded `w` would shatter the edge cache into one entry per
  // pixel width and make every image a cold fetch, which is worse than not
  // resizing at all.
  const WIDTH_LADDER = [200, 400, 600, 900]
  const requested = Number(req.nextUrl.searchParams.get('w'))
  if (Number.isFinite(requested) && requested > 0) {
    const w = WIDTH_LADDER.find((step) => step >= requested) ?? WIDTH_LADDER[WIDTH_LADDER.length - 1]
    url.searchParams.set('width', String(w))
  }

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
  }

  // Shopify's CDN intermittently hangs or returns 429/5xx under bursty load.
  // Give each attempt a short timeout so a stalled request fails fast and we
  // retry quickly rather than blocking for 10-15s on a single hung socket.
  async function tryFetch(): Promise<Response | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const ac = new AbortController()
      const to = setTimeout(() => ac.abort(), 4000)
      try {
        const upstream = await fetch(url.toString(), {
          headers,
          cache: 'force-cache',
          signal: ac.signal,
        })
        clearTimeout(to)
        if (upstream.ok && upstream.body) return upstream
        if (![429, 502, 503, 504].includes(upstream.status)) return null
      } catch {
        clearTimeout(to)
        /* timed out or network error — retry */
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    return null
  }

  const upstream = await tryFetch()
  if (!upstream) return new Response('upstream error', { status: 502 })

  const contentType = upstream.headers.get('content-type') || 'image/jpeg'
  if (!contentType.startsWith('image/')) {
    return new Response('not an image', { status: 415 })
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // Cache aggressively at the edge; product images are effectively immutable.
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
    },
  })
}
