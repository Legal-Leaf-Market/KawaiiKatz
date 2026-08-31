import type { Metadata } from 'next'
import Link from 'next/link'

import { ANIME_SHOPS, animeHallTracked, animeShopUrl } from '@/lib/data'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'

/**
 * The anime hall. See the ANIME_SHOPS doc in lib/data.ts for why these five
 * shops share one page, why the sixth is not here, and what the tracking code
 * costs.
 *
 * A SERVER COMPONENT, for the same reason /[brand] is one: there is nothing to
 * filter, nothing to search and nothing to put in a cart. It is a page of
 * links, and shipping a hydration bundle to render links is paying for
 * interactivity that does not exist.
 *
 * NOTHING HERE RENDERS A COMMISSION RATE. The rates and cookie windows for
 * these five are real and known, and they live in the sister site's registry
 * and in lib/partners.ts where visitors do not see them. A page that prints
 * what we earn per click is our own paperwork served to every reader, and the
 * shopper is not helped by it.
 */
export const revalidate = 86400 // a day; hand-written, not scraped

const TITLE = '🌸 Anime shops we like | Kawaii Katz'
const DESC =
  'Five anime shops worth knowing: bedding, backpacks, jackets, kimono and jigsaw ' +
  'puzzles, each one a specialist rather than a general store. Curated by Kawaii Katz.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: '/anime' },
  openGraph: { title: TITLE, description: DESC, url: `${SITE_URL}/anime`, type: 'website' },
}

export default function Page() {
  const tracked = animeHallTracked()

  return (
    <div className="min-h-screen">
      {/* WebPage, not CollectionPage: this page lists shops, not products. */}
      <JsonLd
        nodes={[
          pageNode({
            path: '/anime',
            name: 'Anime shops we like',
            description: DESC,
          }),
        ]}
      />

      <header className="relative overflow-hidden border-b-[3px] border-[#e6dcff] bg-[linear-gradient(160deg,#fff4f8_0%,#f6f0ff_55%,#eef8fb_100%)]">
        {/*
          Petals. Pure CSS, no image request, and aria-hidden because they are
          decoration: a screen reader announcing eleven flower emoji before the
          heading would be worse than no decoration at all.
        */}
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
          {[
            ['6%', '12%', '28px', '12deg', 0.5], ['18%', '62%', '18px', '-18deg', 0.4],
            ['31%', '8%', '20px', '32deg', 0.35], ['44%', '78%', '30px', '-8deg', 0.45],
            ['57%', '26%', '16px', '22deg', 0.3], ['70%', '90%', '24px', '-24deg', 0.4],
            ['83%', '44%', '19px', '9deg', 0.35], ['92%', '16%', '26px', '-14deg', 0.4],
          ].map(([left, top, size, rot, op]) => (
            <span
              key={`${left}-${top}`}
              className="absolute"
              style={{
                left: left as string,
                top: top as string,
                fontSize: size as string,
                transform: `rotate(${rot})`,
                opacity: op as number,
              }}
            >
              🌸
            </span>
          ))}
        </div>

        <div className="relative max-w-[1180px] mx-auto px-4 sm:px-6 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-display font-extrabold text-[13px] text-[#b79cff] hover:text-[#ff8a65] transition-colors"
          >
            ← Back to Kawaii Katz
          </Link>

          <div className="mt-5 max-w-[68ch]">
            <div className="inline-flex items-center gap-2 bg-[#7fc4d4] text-white font-display font-extrabold text-[11px] uppercase tracking-[.8px] rounded-full px-3 py-1 mb-3">
              ✨ Partner shops
            </div>
            <h1 className="font-display font-extrabold text-[34px] sm:text-[48px] text-[#4f4550] leading-[1.03]">
              Anime shops we like
            </h1>
            <p className="font-display text-[17px] sm:text-[20px] text-[#ff8a65] mt-1.5">
              Five specialists, one shelf each
            </p>
            <p className="text-[14px] sm:text-[15.5px] text-[#6f6473] leading-relaxed mt-4">
              Most anime merch comes from shops that sell a bit of everything and are
              excellent at none of it. These five each pick one thing and do only that,
              which is why they are worth a page. Bedding, backpacks, jackets, kimono and
              jigsaws.
            </p>
            <p className="text-[13.5px] sm:text-[14.5px] text-[#6f6473] leading-relaxed mt-3">
              We do not list their pieces individually. Nobody here has been through their
              full catalogues yet, and putting up a grid we have not read is how a shelf
              fills with things we would not have chosen. So this is a way in, and the
              shops keep their own prices, stock and delivery.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid gap-4 sm:gap-5 grid-cols-1 min-[560px]:grid-cols-2 lg:grid-cols-3">
          {ANIME_SHOPS.map((shop) => (
            <a
              key={shop.key}
              href={animeShopUrl(shop)}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="group relative flex flex-col bg-white border-[3px] rounded-[20px] p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1"
              style={{ borderColor: '#e6dcff' }}
            >
              {/*
                The accent lives on an overlay rather than on the card border,
                because a Tailwind hover: class cannot carry a runtime colour
                and five hard-coded border utilities would be five chances for
                the data and the styling to disagree.
              */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-[17px] border-[3px] border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ borderColor: shop.accent, margin: '-3px' }}
              />

              <div
                className="relative w-[58px] h-[58px] rounded-[16px] flex items-center justify-center text-[30px] leading-none mb-3.5"
                style={{ backgroundColor: `${shop.accent}22` }}
              >
                {shop.emoji}
              </div>

              <h2 className="relative font-display font-extrabold text-[19px] sm:text-[20px] text-[#4f4550] leading-tight">
                {shop.merchant}
              </h2>
              <p
                className="relative font-display font-bold text-[13.5px] mt-1"
                style={{ color: shop.accent }}
              >
                {shop.tagline}
              </p>

              <p className="relative text-[13.5px] text-[#6f6473] leading-relaxed mt-3 flex-1">
                {shop.blurb}
              </p>

              <div className="relative flex flex-wrap gap-1.5 mt-4">
                {shop.shelves.map((shelf) => (
                  <span
                    key={shelf}
                    className="text-[11.5px] font-display font-bold text-[#6f6473] bg-[#f7f3ff] border border-[#e6dcff] rounded-full px-2.5 py-1"
                  >
                    {shelf}
                  </span>
                ))}
              </div>

              <div
                className="relative font-display font-extrabold text-[13.5px] mt-4 inline-flex items-center gap-1.5"
                style={{ color: shop.accent }}
              >
                Visit {shop.merchant}
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </div>
            </a>
          ))}

          {/*
            The sixth tile is not a shop. Five cards in a three-column grid
            leaves a hole, and a hole at the end of a curated list reads as a
            card that failed to load. This says what the page is instead.
          */}
          <div className="flex flex-col justify-center bg-[#faf7ff] border-[3px] border-dashed border-[#e6dcff] rounded-[20px] p-5 sm:p-6">
            <div className="text-[30px] leading-none mb-3">🌱</div>
            <h2 className="font-display font-extrabold text-[17px] text-[#4f4550] leading-tight">
              More when we have read them
            </h2>
            <p className="text-[13px] text-[#6f6473] leading-relaxed mt-2">
              Shops go on this page once somebody has actually opened them and looked at
              what is on the shelves. It is slower than listing everyone who says yes, and
              it is the only reason the five above are worth your time.
            </p>
          </div>
        </div>

        {/*
          Affiliate disclosure on the page, not only in the footer. Same call as
          the brand pages: where products are the point a footer line is enough,
          but here the links ARE the page.
        */}
        <p className="text-[12.5px] text-[#9a8fa3] leading-relaxed mt-10 max-w-[70ch]">
          {tracked
            ? 'Links on this page are affiliate links: if you buy something after clicking one, we may earn a commission at no extra cost to you. It is how Kawaii Katz stays free.'
            : 'Links on this page go straight to the shops. We are not currently earning a commission on all of them.'}{' '}
          We are not these shops. Prices, stock, sizing, delivery and returns are all
          theirs, and anything you buy is a purchase from them.
        </p>
      </main>
    </div>
  )
}
