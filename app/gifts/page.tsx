import type { Metadata } from 'next'
import Link from 'next/link'

import { BOARDS, boardInSeason, fillBoard } from '@/lib/boards'
import { getCatalog } from '@/lib/catalog-source'
import { SITE_URL } from '@/lib/site'
import { pageNode } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import ProductImage from '@/components/ProductImage'
import ProductPageChrome from '@/components/ProductPageChrome'

/** 6 hours, matching the catalogue. Literal — see the note on /gifts/[slug]. */
export const revalidate = 21600

const TITLE = 'Kawaii Gift Guides | Kawaii Katz'
const DESCRIPTION =
  'Seasonal gift guides of cute, clever and kind finds — curated from eight kawaii shops and sorted by what you want to spend.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/gifts` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/gifts`, type: 'website' },
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default async function GiftGuidesPage() {
  const { products } = await getCatalog()
  const month = new Date().getMonth()

  const cards = BOARDS.map((b) => {
    const picks = fillBoard(b, products)
    return {
      board: b,
      cover: picks[0]?.products[0],
      count: picks.reduce((n, s) => n + s.products.length, 0),
      inSeason: boardInSeason(b, month),
    }
  })
  const groups: { heading: string; blurb: string; cards: typeof cards }[] = [
    {
      heading: 'By the season',
      blurb: 'Tied to a date, and worth looking at early — seasonal search runs about three months ahead of the season itself.',
      cards: cards.filter((c) => c.board.kind === 'season'),
    },
    {
      heading: 'By what you are after',
      blurb: 'Standing shortlists that do not go out of date. Each one spans every shop we carry, so you can compare rather than browse one catalogue at a time.',
      cards: cards.filter((c) => c.board.kind === 'theme'),
    },
  ].filter((g) => g.cards.length > 0)

  return (
    <ProductPageChrome>
      <JsonLd
        nodes={[pageNode({ path: '/gifts', name: 'Kawaii Gift Guides', description: DESCRIPTION })]}
      />
      <main className="max-w-[1180px] mx-auto px-4 py-6">
        <nav className="text-[13px] font-bold text-[#9a8fa3] mb-4">
          <Link href="/" className="hover:underline">Kawaii Katz</Link>
          <span className="mx-1.5">›</span>
          <span>Gift Guides</span>
        </nav>

        <header className="mb-7">
          <h1 className="font-display text-[30px] sm:text-[38px] text-[#4f4550] leading-tight">
            Gift Guides
          </h1>
          <p className="text-[14.5px] text-[#6f6675] leading-relaxed mt-2 max-w-[68ch]">
            Hand-shaped shortlists from across every shop we carry, sorted by what you want to
            spend rather than by category. Each one refreshes from the live catalogue, so nothing
            here is a stale list of things that sold out in April.
          </p>
        </header>

        {groups.map((g) => (
        <section key={g.heading} className="mb-9">
        <h2 className="font-display font-extrabold text-[22px] text-[#4f4550] leading-tight">{g.heading}</h2>
        <p className="text-[13.5px] text-[#9a8fa3] font-semibold mt-0.5 mb-4 max-w-[68ch]">{g.blurb}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {g.cards.map(({ board: b, cover, count, inSeason }) => (
            <Link
              key={b.slug}
              href={`/gifts/${b.slug}`}
              className="group bg-white border-[3px] border-[#ffb199] rounded-[22px] overflow-hidden shadow-[0_4px_12px_rgba(255,138,101,.18)] flex flex-col hover:-translate-y-1 transition-transform"
            >
              <div className="relative aspect-[16/9] bg-gradient-to-br from-[#e6dcff] to-[#bfe3ea] flex items-center justify-center">
                {cover ? (
                  <ProductImage
                    src={cover.image}
                    alt=""
                    fallback={b.emoji}
                    className="w-full h-full object-cover"
                    fallbackClassName="absolute inset-0 flex items-center justify-center text-[56px]"
                    width={480}
                  />
                ) : (
                  <span className="text-[56px]" aria-hidden="true">{b.emoji}</span>
                )}
                <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-[2px] border-2 border-[#ffb199] rounded-full font-display font-extrabold text-[13px] px-2.5 py-1">
                  {b.emoji} {count} picks
                </span>
              </div>
              <div className="p-3.5 flex flex-col gap-1.5 flex-1">
                <h2 className="font-display font-extrabold text-[18px] text-[#4f4550] leading-tight group-hover:underline">
                  {b.title}
                </h2>
                <p className="text-[13.5px] text-[#6f6675] leading-snug">{b.tagline}</p>
                <p className="text-[12px] font-bold text-[#9a8fa3] mt-auto pt-1.5">
                  {b.kind === 'theme'
                    ? 'Always on — refreshed from the live catalogue'
                    : inSeason
                      ? '🔥 In season now'
                      : `Peaks from ${MONTHS[b.season[0]]} — worth pinning early`}
                </p>
              </div>
            </Link>
          ))}
        </div>
        </section>
        ))}
      </main>
    </ProductPageChrome>
  )
}
