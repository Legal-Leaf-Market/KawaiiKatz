import type { Metadata } from 'next'
import Link from 'next/link'

import { getVendorCatalog } from '@/lib/catalog-source'
import { ANIME_VENDORS, animePool, fillAnime } from '@/lib/anime'
import { ANIME_SHOPS, animeShopUrl } from '@/lib/data'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import AnimeClient from './AnimeClient'
import AnimeDecor from './AnimeDecor'
import s from './anime.module.css'

/**
 * The Anime room: /anime. See lib/anime.ts for why five merchants share one
 * room and why the sixth is deliberately absent.
 *
 * -----------------------------------------------------------------------------
 * IT WAS FIVE CARDS, THEN IT WAS PRODUCTS ON CREAM, AND NEITHER WAS THE PAGE
 *
 * The brief was always "work it out from /decora". The first cut was a
 * signpost: five shop tiles, no products. The second had the shelves but none
 * of the room, which is the failure DecoraDecor's own header describes in one
 * line: it opened loud and then got quiet, and by the time you reached the
 * shops it read as an ordinary catalogue. Three of the fifteen delivered assets
 * were sitting on disk unreferenced.
 *
 * So the decoration layer is ported properly, the animations are the shared
 * ones rather than a second set, and the whole pack is in use.
 *
 * THE COMPOSITION. The hero is a night street under sakura; the page below it
 * is the morning after. The ground lightens to the site's cream, the neon
 * survives as haze in the margins, and the petals keep falling the whole way
 * down, so the join is a dissolve rather than a cut. Each shelf then keeps one
 * colour off that street.
 *
 * -----------------------------------------------------------------------------
 * NARROWED TO ITS OWN VENDORS, per section 4b: two Decora feeds hit the
 * 240-second prerender timeout by paying for an eighteen-vendor fan-out to
 * write one shelf. The per-vendor cache entries are the same either way.
 *
 * INDEXABLE AND IN THE SITEMAP, which section 7 allows: the rule is not to
 * compete with a vendor for their own product page, and this competes with
 * nobody's. No product URL goes in the sitemap.
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
    /* Cropped from the hero rather than invented. The pack ships square, story
       and pin; none of them is a 1.91:1 wide card, and the first version
       pointed at a social-wide.webp that did not exist, so every link preview
       was fetching a 404. */
    images: [`${SITE_URL}/anime/social-wide.webp`],
  },
}

export default async function Page() {
  const { products } = await getVendorCatalog(ANIME_VENDORS)
  const pool = animePool(products)
  const sections = fillAnime(products)

  return (
    <div className={`${s.room} min-h-screen`}>
      <JsonLd nodes={[pageNode({ path: '/anime', name: TITLE, description: DESC })]} />
      <AnimeDecor />

      {/* ---- THE STREET ------------------------------------------ */}
      <header className={`${s.hero} relative z-10`}>
        <div aria-hidden className={s.heroArt} />
        <div aria-hidden className={s.heroSpeed} />
        <div aria-hidden className={s.heroScrim} />

        <div className="relative max-w-[1180px] mx-auto px-4 sm:px-6 pt-5 pb-16 sm:pb-24">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-display font-extrabold text-[13px] text-[#ffd9ec] hover:text-white transition-colors"
          >
            ← Back to Kawaii Katz
          </Link>

          <div className="mt-10 sm:mt-14 flex items-end gap-8 flex-wrap sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 bg-[#ff8ac4] text-white font-display font-extrabold text-[11px] uppercase tracking-[1px] rounded-full px-3.5 py-1.5 mb-4 shadow-[0_0_24px_rgba(255,138,196,.55)]">
                🌸 The anime room
              </div>
              <h1 className={`${s.neon} font-display font-extrabold text-[40px] sm:text-[68px] leading-[.98] tracking-[-.01em]`}>
                Kawaii Katz
                <br />
                Goes Anime
              </h1>
              <p className="font-display text-[18px] sm:text-[23px] text-[#ffd9ec] mt-4">
                Five shops, one shelf each
              </p>
              <p className="text-[14.5px] sm:text-[16px] text-[#efe2f6] leading-relaxed mt-5 max-w-[58ch]">
                Bedding, jackets, kimono, backpacks and jigsaws. Five specialists rather
                than one shop that sells a bit of everything, which is why they are worth
                a page. We hold no stock and take no payment: every price is the shop's
                own and every link goes to them.
              </p>
            </div>

            {/* The cast, as one composition rather than three cutouts butted
                together, which was the explicit ask in the brief. Hidden on
                narrow, where it would push the type off the first screen. */}
            <div
              aria-hidden
              className={`${s.heroTrio} hidden sm:block shrink-0 w-[330px] lg:w-[430px] aspect-[1100/630] self-end`}
            />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[1180px] mx-auto px-4 sm:px-6 pb-14 -mt-6">
        {sections.length ? (
          <AnimeClient sections={sections} pool={pool} />
        ) : (
          /* Five merchants are signed and none of their feeds has been read
             and cleared, which is a different sentence from "there is nothing
             here". Saying the wrong one implies we opened these shops and
             turned them down. The sister site learned this on a room with
             twenty-five signed makers showing NOTHING HERE. */
          <section className={`${s.shelf} mt-10 max-w-[70ch]`} style={{ ['--accent' as string]: '#b79cff' }}>
            <div className="text-[32px] leading-none mb-3">🌱</div>
            <h2 className="font-display font-extrabold text-[21px] text-[#4f4550]">
              {ANIME_SHOPS.length} shops signed, none stocked yet.
            </h2>
            <p className="text-[14px] text-[#6f6473] leading-relaxed mt-2">
              Nothing goes on a shelf here until somebody has read what a shop actually
              sells, which is slower than trusting a feed and is the entire reason to do
              it that way. The shops are below if you would rather not wait.
            </p>
          </section>
        )}

        <div aria-hidden className={`${s.divider} mt-12`} />

        {/* ---- THE SHOPS, credited plainly ----------------------
            Named here rather than in the title, which is /decora's call for
            /decora's reason: a shop's name in 68px display type reads as
            THEIR page even when every word on it is ours. */}
        <section className="mt-9">
          <h2 className="font-display font-extrabold text-[19px] text-[#4f4550] mb-1">
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
                className="group flex items-center gap-3 bg-white/85 backdrop-blur-sm border-[3px] border-[#e6dcff] hover:border-[#ff8ac4] rounded-[16px] px-4 py-3 transition-colors"
              >
                <span className="text-[26px] leading-none">{shop.emoji}</span>
                <span className="min-w-0">
                  <span className="block font-display font-extrabold text-[15px] text-[#4f4550] group-hover:text-[#ff8ac4] transition-colors">
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

        <p className="text-[12.5px] text-[#9a8fa3] leading-relaxed mt-10 max-w-[70ch]">
          Links on this page are affiliate links: if you buy something after clicking one,
          we may earn a commission at no extra cost to you. It is how Kawaii Katz stays
          free. We are not these shops, and anything you buy is a purchase from them.
        </p>
      </main>
    </div>
  )
}
