'use client'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import { useStore } from '@/lib/store'
import { fillDecora, decoraPool, SHOPS } from '@/lib/decora'
import { money, type Product } from '@/lib/data'
import { logEvent } from '@/lib/site-events'
import ProductCard from '@/components/ProductCard'
import CartDrawer from '@/components/CartDrawer'
import WishlistDrawer from '@/components/WishlistDrawer'

/**
 * The Decora room.
 *
 * -----------------------------------------------------------------------------
 * THIS IS THE ONE PAGE THAT DOES NOT MATCH THE SITE, ON PURPOSE
 *
 * Section 7 of PROJECT_GUIDE says do not restyle to match the sister sites,
 * because Kawaii Katz is deliberately its own aesthetic. That rule is about not
 * flattening this site into the others; it is not a rule that every page here
 * must be cream and blush. The handoff brief is explicit: "Avoid making the
 * entire site baby-pastel. This section is the more fashion-forward room of
 * KawaiiKatz." So this page runs hot pink, violet, black and cyan, and the rest
 * of the site is untouched.
 *
 * The audience is the difference. The home page sells to somebody buying a
 * plushie; this sells to somebody building an outfit, and the copy register
 * follows: short, confident, never infantilising.
 *
 * -----------------------------------------------------------------------------
 * WHAT THE ART IS AND IS NOT
 *
 * Katz and Panda are the site's own characters and already ship as the brand
 * marks (public/brand-cat.png, assets/logo-*.webp). The bunny is Kawaii Katz's
 * own editorial character, lifted from the concept sheet in the handoff pack.
 *
 * IT IS NOT ANY SHOP'S MASCOT OR LOGO AND MUST NEVER BE PRESENTED AS ONE.
 * The brief's legal guardrail is explicit about this, and it is why the room is
 * named after the aesthetic rather than after a retailer: our rabbit stands
 * next to the words "Kawaii Katz goes Decora", never next to a shop's name as
 * though they drew it. Shop attribution is a separate, plain, text-only block
 * near the foot, and every label named there is called out as their trademark.
 *
 * All typography is HTML and CSS. None of the lettering baked into the concept
 * art is used, per the brief, and no category name is baked into a raster.
 */

const IMG = '/decora/'

/** Product tiles per row band, so the grid never renders 400 cards at once. */
const HERO_STICKERS = [
  { src: 'st-omg.webp', alt: 'Katz, delighted' },
  { src: 'st-bunny.webp', alt: 'The bunny, unimpressed' },
  { src: 'st-panda.webp', alt: 'Panda, unbothered' },
  { src: 'st-need.webp', alt: 'Need it' },
]

function Sticker({ children, tone = 'pink' }: { children: React.ReactNode; tone?: 'pink' | 'violet' | 'cyan' | 'black' }) {
  const tones: Record<string, string> = {
    pink: 'bg-[#ff2d92] text-white',
    violet: 'bg-[#8b3dff] text-white',
    cyan: 'bg-[#25e0e8] text-[#1a0b2e]',
    black: 'bg-[#160a24] text-white',
  }
  return (
    <span
      className={`inline-block ${tones[tone]} border-[3px] border-white rounded-full px-3.5 py-1
        font-display font-extrabold text-[12px] tracking-wide uppercase
        shadow-[0_2px_0_rgba(0,0,0,.35)] rotate-[-1.5deg]`}
    >
      {children}
    </span>
  )
}

export default function DecoraClient({
  initialProducts,
  totalCount,
}: {
  initialProducts: Product[]
  /** The shelf's REAL size, counted server-side over the whole catalogue.
      `pool` below is only what this render has in hand, which during first
      paint is the section union, so counting it would understate the shop. */
  totalCount: number
}) {
  const { products: live, loading } = useLiveCatalog(initialProducts)
  const { excludedIds } = useExclusions()
  const { state } = useStore()
  const [cartOpen, setCartOpen] = useState(false)
  const [wishOpen, setWishOpen] = useState(false)

  /**
   * `useLiveCatalog` holds SHOWCASE vendors out of `products`, which is right
   * for the home grid and wrong here only if a source is ever given a showcase.
   * Grumpy Bunny has none, so `products` is the correct list and using it keeps
   * this page consistent with the rest of the site's idea of the catalogue.
   */
  const visible = useMemo(
    () => live.filter((p) => !excludedIds.has(p.id)),
    [live, excludedIds]
  )

  const { sections, edit } = useMemo(() => fillDecora(visible), [visible])
  const pool = useMemo(() => decoraPool(visible), [visible])

  const priceFrom = useMemo(() => {
    const ps = pool.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b)
    return ps.length ? ps[0] : 0
  }, [pool])

  return (
    <div className="min-h-screen bg-[#12071f] text-white">
      {/* ══════════════════════════════════════════════════ HERO */}
      <header className="relative overflow-hidden border-b-[5px] border-[#ff2d92]">
        {/* Checkerboard + glow, both pure CSS. The brief lists gingham and
            checkerboard as motifs; baking them into a raster would cost a
            megabyte and would not scale to a phone. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              'linear-gradient(45deg,#ff2d92 25%,transparent 25%,transparent 75%,#ff2d92 75%),' +
              'linear-gradient(45deg,#ff2d92 25%,transparent 25%,transparent 75%,#ff2d92 75%)',
            backgroundSize: '56px 56px',
            backgroundPosition: '0 0, 28px 28px',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(139,61,255,.55), transparent 62%)' }}
        />

        <div className="relative max-w-[1180px] mx-auto px-4 sm:px-6 pt-6 pb-10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-display font-extrabold text-[13px] text-[#25e0e8] hover:text-white transition-colors"
            >
              ← Back to Kawaii Katz
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => setWishOpen(true)}
                className="border-[3px] border-white bg-[#ff2d92] text-white rounded-full h-9 px-3.5 font-display font-extrabold text-[13px] cursor-pointer hover:bg-white hover:text-[#ff2d92] transition-colors"
              >
                ♥ My Board{state.wish.length ? ` (${state.wish.length})` : ''}
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className="border-[3px] border-white bg-[#8b3dff] text-white rounded-full h-9 px-3.5 font-display font-extrabold text-[13px] cursor-pointer hover:bg-white hover:text-[#8b3dff] transition-colors"
              >
                🛒 Cart{state.cart.length ? ` (${state.cart.length})` : ''}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-6 items-center mt-6">
            <div>
              <div className="flex gap-2 flex-wrap mb-4">
                <Sticker tone="cyan">Direct from Japan</Sticker>
                <Sticker tone="pink">Decora · Harajuku</Sticker>
              </div>

              {/* Display type, built here rather than lifted from the concept
                  art. The brief: "Rebuild all typography as HTML/CSS/SVG." */}
              {/* THE ROOM IS NAMED AFTER THE AESTHETIC, NOT THE SHOP. See the
                  note on SOURCES in lib/decora.ts: a shop's name in 88px type
                  reads as their page even when every word on it is ours. */}
              <h1 className="font-display leading-[0.92] tracking-tight">
                <span className="block text-[13px] sm:text-[15px] font-extrabold uppercase tracking-[.28em] text-[#25e0e8] mb-2">
                  Kawaii Katz goes
                </span>
                <span
                  className="block text-[62px] sm:text-[92px] lg:text-[104px] font-extrabold text-white"
                  style={{ textShadow: '4px 4px 0 #ff2d92, 8px 8px 0 rgba(139,61,255,.55)' }}
                >
                  Decora
                </span>
              </h1>

              <p className="text-[16px] sm:text-[18px] font-bold text-[#ffd6ec] mt-5 max-w-[46ch] leading-relaxed">
                Cute. Chaotic. Completely intentional. Japanese street fashion, decora
                accessories and character collabs, pulled out of shops we like and laid out
                the way we would wear it.
              </p>

              {pool.length > 0 && (
                <p className="text-[13.5px] font-bold text-[#b79cff] mt-3">
                  {Math.max(totalCount, pool.length).toLocaleString()} pieces on the shelf right
                  now, from {money(priceFrom)}.
                </p>
              )}

              <div className="flex gap-2.5 flex-wrap mt-5">
                {HERO_STICKERS.map((s) => (
                  <Image
                    key={s.src}
                    src={`${IMG}${s.src}`}
                    alt={s.alt}
                    width={72}
                    height={86}
                    className="h-[58px] w-auto shrink-0 drop-shadow-[0_3px_6px_rgba(0,0,0,.5)] rotate-[-3deg] even:rotate-[3deg]"
                  />
                ))}
              </div>
            </div>

            {/* The cast. Bunny centre and largest: this room is hers. */}
            <div className="relative flex items-end justify-center gap-0 min-h-[260px] sm:min-h-[340px] pb-1">
              <Image
                src={`${IMG}katz.webp`}
                alt="Katz, the Kawaii Katz black cat"
                width={814}
                height={760}
                priority
                className="w-[34%] max-w-[190px] h-auto -mr-[6%] mb-2 drop-shadow-[0_8px_18px_rgba(0,0,0,.55)]"
              />
              <Image
                src={`${IMG}bunny.webp`}
                alt="The Kawaii Katz editorial bunny, in full decora"
                width={481}
                height={760}
                priority
                className="w-[42%] max-w-[250px] h-auto rounded-[22px] border-[5px] border-white shadow-[0_10px_30px_rgba(0,0,0,.6)] z-10"
              />
              <Image
                src={`${IMG}panda.webp`}
                alt="Panda, the Kawaii Katz panda"
                width={834}
                height={760}
                className="w-[34%] max-w-[190px] h-auto -ml-[6%] mb-2 drop-shadow-[0_8px_18px_rgba(0,0,0,.55)]"
              />
            </div>
          </div>

          {/* Affiliate disclosure, ABOVE the fold and next to the first thing
              that could be mistaken for a shop. The brief asks for it to be
              clear near outbound links; putting it only in the footer would
              technically satisfy that and practically not. */}
          <p className="text-[12.5px] font-semibold text-[#c9b4e8] mt-8 max-w-[70ch] leading-relaxed">
            We do not sell any of this. Every piece is stocked by an independent shop
            ({SHOPS.map((s) => s.vendor).join(', ')}), and links out are affiliate links, so we
            may earn a commission when you buy. You check out on their site, never ours.
          </p>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════ SECTIONS */}
      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-9">
        {loading && !pool.length ? (
          <p className="text-[#b79cff] font-bold py-12 text-center">Opening the wardrobe...</p>
        ) : !pool.length ? (
          <p className="text-[#b79cff] font-bold py-12 text-center">
            Nothing on the shelf right now. The catalogue refreshes every few hours.
          </p>
        ) : (
          <>
            {/* Section jump chips. Real anchors, so the page is navigable
                without JavaScript and a Pin can deep-link to a section. */}
            <nav className="flex gap-2 flex-wrap mb-9">
              {sections.map(({ section }) => (
                <a
                  key={section.key}
                  href={`#${section.key}`}
                  className="border-2 border-[#8b3dff] bg-[#1d0d33] text-[#e9d9ff] rounded-full px-3.5 h-9 inline-flex items-center font-display font-extrabold text-[12.5px] hover:bg-[#8b3dff] hover:text-white transition-colors"
                >
                  {section.title}
                </a>
              ))}
            </nav>

            {sections.map(({ section, products }) => (
              <section key={section.key} id={section.key} className="mb-12 scroll-mt-6">
                <div className="flex items-end gap-3 flex-wrap mb-1">
                  <span className="font-display font-extrabold text-[11.5px] uppercase tracking-[.24em] text-[#25e0e8]">
                    {section.kicker}
                  </span>
                </div>
                <h2
                  className="font-display font-extrabold text-[34px] sm:text-[46px] leading-[0.98] text-white"
                  style={{ textShadow: '3px 3px 0 #ff2d92' }}
                >
                  {section.title}
                </h2>
                <p className="text-[14.5px] font-semibold text-[#c9b4e8] mt-2 mb-5 max-w-[62ch] leading-relaxed">
                  {section.blurb}
                </p>
                <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            ))}

            {/* ═════════════════════════════ THE GRUMPY EDIT */}
            {edit.length > 0 && (
              <section id="edit" className="mb-12 scroll-mt-6">
                <div className="rounded-[26px] border-[4px] border-[#ff2d92] bg-[#1d0d33] p-5 sm:p-7">
                  <div className="flex items-center gap-4 flex-wrap mb-3">
                    <Image
                      src={`${IMG}st-bunny.webp`}
                      alt=""
                      width={158}
                      height={200}
                      className="h-[64px] w-auto"
                    />
                    <div>
                      <span className="font-display font-extrabold text-[11.5px] uppercase tracking-[.24em] text-[#25e0e8]">
                        One piece per house
                      </span>
                      <h2
                        className="font-display font-extrabold text-[34px] sm:text-[44px] leading-[0.98] text-white"
                        style={{ textShadow: '3px 3px 0 #8b3dff' }}
                      >
                        The Edit
                      </h2>
                    </div>
                  </div>
                  <p className="text-[14.5px] font-semibold text-[#c9b4e8] mb-5 max-w-[64ch] leading-relaxed">
                    A tour rather than a top ten. We cannot see what sells on their site, only what
                    gets clicked on ours, so this is one thing from each of the Japanese labels the
                    shops are known for.
                  </p>
                  <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
                    {edit.map((p) => (
                      <ProductCard key={`edit-${p.id}`} product={p} />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ═════════════════════════════ WHERE IT COMES FROM */}
        {/* WHERE IT ALL COMES FROM. Each shop's own words about itself, never
            ours about them, and nothing time-sensitive: a page cached for six
            hours cannot keep a promise about stock or delivery. */}
        <section className="rounded-[22px] border-2 border-[#8b3dff] bg-[#180b2a] p-5 sm:p-6 mt-4">
          <h2 className="font-display font-extrabold text-[19px] text-white mb-1">
            Where it comes from
          </h2>
          <p className="text-[13px] font-semibold text-[#9a86c4] leading-relaxed max-w-[72ch] mb-4">
            Kawaii Katz is the editorial. These are the shops that actually stock and ship it.
          </p>

          {SHOPS.map((shop) => (
            <div key={shop.vendor} className="border-t border-[#3a2359] pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
              <h3 className="font-display font-extrabold text-[16px] text-white">{shop.vendor}</h3>
              <p className="text-[14px] font-semibold text-[#c9b4e8] leading-relaxed max-w-[72ch] mt-1">
                Describes itself as carrying {shop.says}, and says orders ship from{' '}
                {shop.shipsFrom}. Labels on its shelves include {shop.brands.join(', ')}. Those
                are its words about its own shop, not a promise from us.
              </p>
              <a
                href={shop.home}
                target="_blank"
                rel="nofollow sponsored noopener"
                onClick={() => logEvent('outbound_click', { vendor: shop.vendor, meta: 'decora-shop-note' })}
                className="inline-block mt-3 bg-[#ff2d92] text-white border-[3px] border-white rounded-full px-5 h-10 leading-[34px] font-display font-extrabold text-[13.5px] hover:bg-white hover:text-[#ff2d92] transition-colors"
              >
                Visit {shop.vendor} →
              </a>
            </div>
          ))}

          <p className="text-[13px] font-semibold text-[#9a86c4] leading-relaxed max-w-[72ch] mt-5 pt-4 border-t border-[#3a2359]">
            Prices and availability come from each shop&apos;s live catalogue and change without
            us knowing. We are not affiliated with, endorsed by, or speaking for any of them, the
            labels named above are their trademarks and not ours, and the characters on this page
            are Kawaii Katz&apos;s own. Links out are affiliate links.
          </p>
        </section>
      </main>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} products={live} />
      <WishlistDrawer open={wishOpen} onClose={() => setWishOpen(false)} products={live} />
    </div>
  )
}
