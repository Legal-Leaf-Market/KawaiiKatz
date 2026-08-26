'use client'
import Link from 'next/link'
import { useMemo } from 'react'

import { ARTICLES } from '@/lib/articles'
import { BOARDS } from '@/lib/boards'
import { catEmoji, money, type Product } from '@/lib/data'
import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import ProductImage from './ProductImage'

/**
 * The link-in-bio page.
 *
 * -----------------------------------------------------------------------------
 * THE PRODUCTS ARRIVE CLIENT-SIDE, AND THAT IS A BUILD-BUDGET DECISION
 *
 * This page could call getCatalog() and prerender. It deliberately does not.
 * Section 4b counts catalogue-backed prerendered routes, and the last
 * measurement was 188s of a 240s ceiling; every one of those routes pays a full
 * scrape plus a coco-ssd pass on a cold build. A bio link is not worth a sixth
 * of the remaining headroom.
 *
 * So the shell is static (guides and articles are just data) and the two
 * product rails come from useLiveCatalog, the same SWR call the chrome already
 * makes. Until it lands the rails render nothing rather than a skeleton,
 * because the rest of the page is already useful and a bio-link visitor
 * arriving to four grey boxes is worse than arriving to the guides.
 *
 * -----------------------------------------------------------------------------
 * BUILT FOR A THUMB
 *
 * Everyone here arrived from a phone, from a bio link, in about a second of
 * intent. One column, big rows, no filters, no grid. Anything that needs two
 * hands or a second thought belongs on the home page instead, and there is a
 * link to it at the bottom.
 */

const CORAL = '#ff8a65'
const INK = '#4f4550'
const MUTED = '#9a8fa3'
const LINE = '#ffe6d9'

/** How many products each rail shows. Small on purpose. */
const RAIL = 6

/**
 * Nothing older than this counts as "fresh".
 *
 * Without a window the rail is just "newest six", which is true but can quietly
 * become a lie: if a scrape stalls or every vendor goes quiet for a month, the
 * heading still says this week over stock from July. The heading changes
 * instead of the claim being stretched, see FRESH_TITLE below.
 */
const FRESH_DAYS = 14

/**
 * At most two per vendor on a rail.
 *
 * Section 4e recorded this the first time: one vendor will take a whole
 * section. The first build of this page opened with five compression socks from
 * the same shop, which is a range being dumped, not a week of new arrivals.
 */
const MAX_PER_VENDOR = 2

/** Keeps the first N of each vendor, preserving the order it was given. */
function capPerVendor(items: Product[], n: number): Product[] {
  const seen = new Map<string, number>()
  const out: Product[] = []
  for (const p of items) {
    const c = seen.get(p.vendor) ?? 0
    if (c >= n) continue
    seen.set(p.vendor, c + 1)
    out.push(p)
  }
  return out
}

function Rail({ title, note, items }: { title: string; note: string; items: Product[] }) {
  if (!items.length) return null
  return (
    <section>
      <h2 className="font-display font-extrabold text-[16px]" style={{ color: INK }}>
        {title}
      </h2>
      <p className="text-[12.5px] font-semibold mb-2" style={{ color: MUTED }}>
        {note}
      </p>
      {/* A horizontal scroller rather than a grid: it fits four thumbnails on a
          phone without shrinking any of them, and swiping is the gesture this
          audience is already making. */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/p/${p.id}`}
            className="flex-none w-[132px] rounded-[16px] border-[2.5px] bg-white overflow-hidden"
            style={{ borderColor: LINE }}
          >
            <div className="relative aspect-[4/5] bg-gradient-to-br from-[#ffb199] to-[#bfe3ea]">
              <ProductImage src={p.image} alt={p.name} fallback={catEmoji(p.cat)} width={132} />
              {p.discountPct > 0 && (
                <span
                  className="absolute top-1.5 left-1.5 text-white font-display font-extrabold text-[10.5px] px-2 py-[2px] rounded-full border-2 border-white"
                  style={{ background: '#e0227a' }}
                >
                  -{p.discountPct}%
                </span>
              )}
            </div>
            <div className="p-2">
              <p className="text-[11.5px] font-bold leading-tight line-clamp-2" style={{ color: INK }}>
                {p.name}
              </p>
              <p className="font-display font-extrabold text-[13px] mt-0.5" style={{ color: CORAL }}>
                {money(p.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Row({ href, emoji, title, sub }: { href: string; emoji: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-[2.5px] bg-white rounded-[16px] px-3.5 py-3 hover:bg-[#fffaf0] transition-colors"
      style={{ borderColor: LINE }}
    >
      <span className="text-[22px] flex-none leading-none">{emoji}</span>
      <span className="min-w-0">
        <span className="block font-display font-extrabold text-[14.5px] leading-tight" style={{ color: INK }}>
          {title}
        </span>
        <span className="block text-[12px] font-semibold leading-snug line-clamp-1" style={{ color: MUTED }}>
          {sub}
        </span>
      </span>
      <span className="ml-auto flex-none font-extrabold text-[15px]" style={{ color: CORAL }}>
        ›
      </span>
    </Link>
  )
}

export default function IgLanding() {
  const { products } = useLiveCatalog()
  const { excludedIds } = useExclusions()

  const live = useMemo(
    () => products.filter((p) => p.image && !excludedIds.has(p.id)),
    [products, excludedIds]
  )

  /**
   * Newest first, by the date we first saw the product.
   *
   * `added` is when it entered OUR catalogue, not when the vendor listed it, so
   * this is genuinely "new to Kawaii Katz" and refreshes itself every time a
   * vendor puts something up. That is what makes one stable bio URL worth
   * revisiting.
   */
  const { fresh, freshIsRecent } = useMemo(() => {
    const newest = capPerVendor(
      [...live].sort((a, b) => (a.added < b.added ? 1 : -1)),
      MAX_PER_VENDOR
    )
    const cutoff = new Date(Date.now() - FRESH_DAYS * 86400_000).toISOString().slice(0, 10)
    const recent = newest.filter((p) => (p.added || '').slice(0, 10) >= cutoff)
    // Enough genuinely recent stock to fill the rail? Say "this week". Otherwise
    // show the newest anyway under a heading that claims nothing about when.
    return recent.length >= RAIL
      ? { fresh: recent.slice(0, RAIL), freshIsRecent: true }
      : { fresh: newest.slice(0, RAIL), freshIsRecent: false }
  }, [live])

  /**
   * Biggest discounts, but only ones worth the word "drop".
   *
   * Under 20% is noise on a catalogue where several vendors run a standing 10%,
   * and a page promising price drops that opens with 10% off teaches people to
   * stop looking.
   */
  const drops = useMemo(
    () =>
      capPerVendor(
        live
          .filter((p) => p.onSale && p.discountPct >= 20)
          .sort((a, b) => b.discountPct - a.discountPct),
        MAX_PER_VENDOR
      ).slice(0, RAIL),
    [live]
  )

  return (
    <main className="max-w-[520px] mx-auto px-4 py-6 flex flex-col gap-6">
      <header className="text-center">
        <h1 className="font-display text-[27px] leading-tight" style={{ color: INK }}>
          🐱 Kawaii Katz 🐼
        </h1>
        <p className="text-[13.5px] font-semibold mt-1" style={{ color: MUTED }}>
          Cute, clever and kind things from twelve shops, in one place.
        </p>
      </header>

      <Rail
        title={freshIsRecent ? '✨ Fresh this week' : '✨ New in'}
        note={
          freshIsRecent
            ? 'The newest things across every shop we carry.'
            : 'The most recent arrivals across every shop we carry.'
        }
        items={fresh}
      />

      <Rail
        title="🔻 Price drops"
        note="20% off or better, right now."
        items={drops}
      />

      <section className="flex flex-col gap-2">
        <h2 className="font-display font-extrabold text-[16px]" style={{ color: INK }}>
          🎁 Gift guides
        </h2>
        {BOARDS.map((b) => (
          <Row
            key={b.slug}
            href={`/gifts/${b.slug}`}
            emoji={b.emoji}
            title={b.title}
            sub={b.tagline}
          />
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display font-extrabold text-[16px]" style={{ color: INK }}>
          📚 Worth knowing
        </h2>
        {/* Four, not ten. A bio-link page is a menu, not a library, and the
            last row sends anyone who wants more to the real index. */}
        {ARTICLES.slice(0, 4).map((a) => (
          <Row
            key={a.slug}
            href={`/learn/${a.slug}`}
            emoji={a.emoji}
            title={a.title}
            sub={`${a.readMins} min read`}
          />
        ))}
        <Row href="/learn" emoji="📖" title="All the guides" sub={`${ARTICLES.length} short reads`} />
      </section>

      <section className="flex flex-col gap-2">
        <Row href="/" emoji="🛍️" title="Shop everything" sub="4,000+ things, filter by what you want" />
        <Row href="/gifts" emoji="🎀" title="All gift guides" sub="Sorted by price, every shop" />
      </section>

      <p className="text-[11.5px] text-center leading-relaxed pb-2" style={{ color: MUTED }}>
        We earn a commission if you buy through our links, at no extra cost to you. Every item checks
        out on the shop&apos;s own site. Kawaii Katz never takes payment.
      </p>
    </main>
  )
}
