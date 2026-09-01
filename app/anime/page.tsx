import type { Metadata } from 'next'
import Link from 'next/link'

import { getVendorCatalog } from '@/lib/catalog-source'
import { ANIME_VENDORS, animePool, fillAnime } from '@/lib/anime'
import { ANIME_SHOPS, animeShopUrl } from '@/lib/data'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import AnimeClient from './AnimeClient'

/**
 * The Anime room: /anime. See lib/anime.ts for why five merchants share one
 * room and why the sixth is deliberately absent.
 *
 * -----------------------------------------------------------------------------
 * IT WAS FIVE CARDS AND THAT WAS THE WRONG PAGE
 *
 * The first cut was a signpost: five shop tiles linking out, no products. It
 * was honest and it was thin, and Jacob's note on it was the right one, that
 * the point is a room like /decora rather than a page with five things on it.
 * The difference is not decoration. A signpost asks a visitor to go and browse
 * five shops; a room shows them the things and lets them decide, which is the
 * only reason a curated site is worth visiting instead of a search engine.
 *
 * -----------------------------------------------------------------------------
 * NARROWED TO ITS OWN VENDORS
 *
 * getVendorCatalog(ANIME_VENDORS) rather than getCatalog(), for the reason
 * section 4b spells out: two Decora feeds hit staticPageGenerationTimeout at
 * 240 seconds by paying for a full eighteen-vendor fan-out to write out one
 * shelf. The per-vendor cache entries are the same entries either way, so a
 * narrowed caller warms the cache for the full one and nothing is duplicated.
 *
 * -----------------------------------------------------------------------------
 * INDEXABLE AND IN THE SITEMAP, WHICH SECTION 7 ALLOWS
 *
 * The rule is "do not compete with a vendor for their own product page". This
 * competes with nobody's: it is original editorial, same standing as the gift
 * guides. No product URL goes in the sitemap.
 */
export const revalidate = 21600 // 6 hours, must stay statically analysable
export const maxDuration = 60

const TITLE = 'Kawaii Katz Goes Anime'
const DESC =
  'Anime bedding, jackets, kimono, backpacks and jigsaw puzzles, picked by Kawaii Katz ' +
  'and sold by the shops that stock them. Live prices, no cart, no markup.'

export const metadata: Metadata = {
  title: `${TITLE} | Kawaii Katz`,
  description: DESC,
  alternates: { canonical: '/anime' },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: `${SITE_URL}/anime`,
    type: 'website',
    images: [`${SITE_URL}/anime/social-wide.webp`],
  },
}

export default async function Page() {
  const { products } = await getVendorCatalog(ANIME_VENDORS)
  const pool = animePool(products)
  const sections = fillAnime(products)
  const shopCount = ANIME_SHOPS.length

  return (
    <div className="min-h-screen">
      <JsonLd nodes={[pageNode({ path: '/anime', name: TITLE, description: DESC })]} />

      {/* ---- HERO -------------------------------------------------
          The backdrop is a night street with its neon reduced to pure
          shape, so nothing in the picture is readable text in any
          script. Its centre is deliberately quiet, which is where the
          type sits. */}
      <header className="relative overflow-hidden border-b-[3px] border-[#e6dcff]">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/anime/hero-bg.webp)' }}
        />
        {/* A scrim, because the artwork is a picture and the words on
            top of it have to stay words. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(30,10,45,.88) 0%, rgba(30,10,45,.72) 46%, rgba(30,10,45,.28) 100%)',
          }}
        />
        <div className="relative max-w-[1180px] mx-auto px-4 sm:px-6 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-display font-extrabold text-[13px] text-[#ffd9ec] hover:text-white transition-colors"
          >
            ← Back to Kawaii Katz
          </Link>

          <div className="mt-6 flex items-end gap-6 flex-wrap sm:flex-nowrap">
            <div className="min-w-0 flex-1 pb-2">
              <div className="inline-flex items-center gap-2 bg-[#ff8ac4] text-white font-display font-extrabold text-[11px] uppercase tracking-[.9px] rounded-full px-3 py-1 mb-3">
                🌸 The anime room
              </div>
              <h1 className="font-display font-extrabold text-[36px] sm:text-[54px] text-white leading-[1.02] drop-shadow-[0_2px_18px_rgba(0,0,0,.5)]">
                {TITLE}
              </h1>
              <p className="font-display text-[17px] sm:text-[21px] text-[#ffd9ec] mt-2">
                Five shops, one shelf each
              </p>
              <p className="text-[14px] sm:text-[15.5px] text-[#f0e4f5] leading-relaxed mt-4 max-w-[62ch]">
                Bedding, jackets, kimono, backpacks and jigsaws. Five specialists rather
                than one shop that sells a bit of everything, which is why they are worth
                a page. We hold no stock and take no payment: every price is the shop's
                own and every link goes to them.
              </p>
            </div>
            {/* The cast, as one composition rather than three cutouts
                butted together. Hidden on narrow screens, where it
                would push the type off the first screenful. */}
            <div
              aria-hidden
              className="hidden sm:block shrink-0 w-[300px] lg:w-[380px] aspect-[1100/630] bg-contain bg-no-repeat bg-bottom"
              style={{ backgroundImage: 'url(/anime/trio.webp)' }}
            />
          </div>
        </div>
      </header>

      <div
        aria-hidden
        className="h-[46px] bg-repeat-x bg-center"
        style={{ backgroundImage: 'url(/anime/divider.webp)', backgroundSize: 'auto 46px' }}
      />

      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 pb-12">
        {sections.length ? (
          <AnimeClient sections={sections} pool={pool} />
        ) : (
          /* THE HONEST EMPTY STATE. Five merchants are signed and none
             of their feeds has been read and cleared yet, and that is a
             different sentence from "there is nothing here". Saying the
             wrong one implies we opened these shops and turned them
             down. The sister site learned this on a room with
             twenty-five signed makers showing NOTHING HERE. */
          <section className="mt-10 rounded-[20px] border-[3px] border-dashed border-[#e6dcff] bg-[#faf7ff] p-6 sm:p-8 max-w-[70ch]">
            <div className="text-[32px] leading-none mb-3">🌱</div>
            <h2 className="font-display font-extrabold text-[20px] text-[#4f4550]">
              {shopCount} shops signed, none stocked yet.
            </h2>
            <p className="text-[14px] text-[#6f6473] leading-relaxed mt-2">
              Nothing goes on a shelf here until somebody has read what a shop actually
              sells, which is slower than trusting a feed and is the entire reason to do
              it that way. The shops are below if you would rather not wait.
            </p>
          </section>
        )}

        {/* ---- THE SHOPS, credited plainly ------------------------
            Named here rather than in the title, and the reasoning is
            /decora's: a shop's name in display type at the top reads
            as THEIR page even when every word on it is ours. */}
        <section className="mt-14">
          <h2 className="font-display font-extrabold text-[18px] text-[#4f4550] mb-1">
            The shops
          </h2>
          <p className="text-[13.5px] text-[#6f6473] mb-4 max-w-[62ch]">
            Five independents, each doing one thing. Prices, stock, sizing, delivery and
            returns are all theirs.
          </p>
          <div className="grid gap-3 grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3">
            {ANIME_SHOPS.map((shop) => (
              <a
                key={shop.key}
                href={animeShopUrl(shop)}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="group flex items-center gap-3 bg-white border-[3px] border-[#e6dcff] hover:border-[#b79cff] rounded-[16px] px-4 py-3 transition-colors"
              >
                <span className="text-[26px] leading-none">{shop.emoji}</span>
                <span className="min-w-0">
                  <span className="block font-display font-extrabold text-[15px] text-[#4f4550] group-hover:text-[#b79cff] transition-colors">
                    {shop.merchant}
                  </span>
                  <span className="block text-[12.5px] text-[#6f6473] truncate">
                    {shop.tagline}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Disclosure on the page, not only in the footer: the links
            are the point of it. */}
        <p className="text-[12.5px] text-[#9a8fa3] leading-relaxed mt-10 max-w-[70ch]">
          Links on this page are affiliate links: if you buy something after clicking one,
          we may earn a commission at no extra cost to you. It is how Kawaii Katz stays
          free. We are not these shops, and anything you buy is a purchase from them.
        </p>
      </main>
    </div>
  )
}
