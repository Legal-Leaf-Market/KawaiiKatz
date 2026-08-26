import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BOARDS, board, boardInSeason, fillBoard } from '@/lib/boards'
import { getCatalog } from '@/lib/catalog-source'
import { unproxied } from '@/lib/catalog-shared'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import BoardGrid from '@/components/BoardGrid'
import ProductPageChrome from '@/components/ProductPageChrome'

/**
 * A seasonal gift guide. See the long note at the top of lib/boards.ts for why
 * these are the only Pinterest push actually available to an affiliate site.
 *
 * INDEXABLE, unlike /p/<id>, and in the sitemap. The rule in PROJECT_GUIDE is
 * "do not add product URLs to the sitemap — every product lives on the vendor's
 * own site and we should not compete with them for it". A guide competes with
 * no vendor's page, because no vendor has one: it is the only original
 * editorial work on this site. The product pages it links to stay noindex.
 *
 * `dynamicParams = false` matters here for the same reason it does on
 * /[brand] — without it any /gifts/<anything> would render a guide-shaped page
 * for whatever the visitor typed.
 */
export const dynamicParams = false

// 6 hours, matching the catalogue. A literal, not CATALOG_REVALIDATE_SECONDS:
// segment config is read without evaluating the module, and an imported
// constant fails the build with "Invalid segment configuration export".
export const revalidate = 21600

export function generateStaticParams() {
  return BOARDS.map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const b = board(slug)
  if (!b) return { title: 'Not found | Kawaii Katz' }

  const title = `${b.emoji} ${b.title} | Kawaii Katz`
  const description = `${b.tagline}. ${b.intro}`.slice(0, 155)

  // The cover image has to come from the live catalogue, so this pays a
  // getCatalog() call — cached, and the page body needs it a moment later
  // anyway. cache() dedupes the two within the render pass.
  const { products } = await getCatalog()
  const cover = fillBoard(b, products)[0]?.products[0]
  const img = cover ? unproxied(cover.image || '') : ''

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/gifts/${b.slug}`,
      // Declares the collection's RSS feed on the page itself. Pinterest's
      // auto-publish is pointed at the URL by hand, but a declared feed is how
      // every other reader finds one, and it costs a line.
      types: {
        'application/rss+xml': [
          { url: `${SITE_URL}/feeds/${b.slug}.xml`, title: `${b.title} | Kawaii Katz` },
        ],
      },
    },
    openGraph: {
      title,
      description: b.tagline,
      url: `${SITE_URL}/gifts/${b.slug}`,
      type: 'website',
      // Un-proxied: Product.image is an /api/img path, which robots.txt
      // disallows and no social scraper can resolve. Same trap as /p/<id>.
      images: /^https?:\/\//i.test(img) ? [{ url: img }] : undefined,
    },
  }
}

export default async function GiftGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const b = board(slug)
  if (!b) notFound()

  const { products } = await getCatalog()
  const picks = fillBoard(b, products)
  const count = picks.reduce((n, s) => n + s.products.length, 0)

  // Rendered on the server, so it is the build month, not the visitor's. That
  // is fine for a "peak season" note — it is never more than six hours stale,
  // and it does not risk a hydration mismatch the way a client Date would.
  //
  // A theme has no season, so it is never out of one. Without this guard the
  // plushies page would tell visitors we build it early for a season it does
  // not have.
  const offPeak = b.kind === 'season' && !boardInSeason(b, new Date().getMonth())

  return (
    <ProductPageChrome>
      <JsonLd
        nodes={[
          pageNode({
            path: `/gifts/${b.slug}`,
            name: b.title,
            description: b.tagline,
            type: 'CollectionPage',
          }),
        ]}
      />
      <main className="max-w-[1180px] mx-auto px-4 py-6">
        <nav className="text-[13px] font-bold text-[#9a8fa3] mb-4">
          <Link href="/" className="hover:underline">Kawaii Katz</Link>
          <span className="mx-1.5">›</span>
          <Link href="/gifts" className="hover:underline">Gift Guides</Link>
        </nav>

        <header className="mb-7">
          <div className="text-[46px] leading-none mb-1" aria-hidden="true">{b.emoji}</div>
          <h1 className="font-display text-[30px] sm:text-[38px] text-[#4f4550] leading-tight">{b.title}</h1>
          <p className="font-display font-bold text-[#ff8a65] text-[16px] mt-1">{b.tagline}</p>
          <p className="text-[14.5px] text-[#6f6675] leading-relaxed mt-3 max-w-[68ch]">{b.intro}</p>
          <p className="text-[12.5px] text-[#9a8fa3] font-bold mt-3">
            {count} picks from {new Set(picks.flatMap((s) => s.products.map((p) => p.vendor))).size} shops
            {offPeak && ' · we build these early, because Pinterest searches a season about three months ahead'}
          </p>
        </header>

        <BoardGrid
          slug={b.slug}
          title={b.title}
          tagline={b.tagline}
          hashtag={b.hashtag}
          sections={picks.map((s) => ({
            key: s.section.key,
            title: s.section.title,
            blurb: s.section.blurb,
            products: s.products,
          }))}
        />

        {/* Required by the FTC, and by Pinterest's own link-sharing rules. */}
        <p className="text-[12px] text-[#9a8fa3] leading-relaxed mt-2 max-w-[68ch]">
          We earn a commission if you buy through these links, at no extra cost to you. Every
          item checks out on the shop&apos;s own site. Kawaii Katz never takes payment. Prices
          and stock are refreshed from each shop every few hours and can change.
        </p>
      </main>
    </ProductPageChrome>
  )
}
