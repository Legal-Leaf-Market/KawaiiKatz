'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useVendorCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import { useStore } from '@/lib/store'
import { vendorCfg, type Product } from '@/lib/data'
import BrkoxCard from '@/components/BrkoxCard'
import CartDrawer from '@/components/CartDrawer'
import WishlistDrawer from '@/components/WishlistDrawer'

const VENDOR = 'BRKOX'

/**
 * Themes are derived from the product title rather than stored on the vendor's
 * side — their Shopify catalogue has no product_type set at all, so grouping by
 * franchise is the only way to make 50-odd near-identically-named display frames
 * browsable. Order matters: "Speed Champions F1" must beat "Technic" because
 * several F1 sets are Technic sets.
 */
const THEMES: { key: string; label: string; emoji: string; test: RegExp }[] = [
  { key: 'f1', label: 'F1 & Speed Champions', emoji: '🏎️', test: /speed champions|formula|\bf1\b|grand prix|sauber|red bull|mercedes-amg/i },
  { key: 'starwars', label: 'Star Wars', emoji: '🚀', test: /star wars|mandalorian|x-wing|at-at|millennium|tantive|jango|landspeeder|starfighter|minas tirith/i },
  { key: 'heroes', label: 'Super Heroes & Wizards', emoji: '🦸', test: /marvel|\bdc\b|harry potter/i },
  { key: 'cars', label: 'Technic & Cars', emoji: '🔧', test: /technic|porsche|lamborghini|nissan|skyline|peugeot|mercedes-benz|road bike/i },
  { key: 'minifigs', label: 'Minifigures', emoji: '🧍', test: /minifigure/i },
  { key: 'icons', label: 'Icons & Ideas', emoji: '🗼', test: /.*/ },
]

function themeOf(p: Product): string {
  return THEMES.find((t) => t.test.test(p.name))?.key ?? 'icons'
}

export default function BrkoxClient({ initialProducts }: { initialProducts: Product[] }) {
  const cfg = vendorCfg(VENDOR)
  // Server-rendered slice seeds the view, so the showcase paints with real
  // frames instead of a loading line while the full catalogue arrives.
  const { products, allProducts, loading, live } = useVendorCatalog(VENDOR, initialProducts)
  const { excludedIds } = useExclusions()
  const { state } = useStore()
  const [theme, setTheme] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [wishOpen, setWishOpen] = useState(false)

  const visible = useMemo(
    () => products.filter((p) => !excludedIds.has(p.id)),
    [products, excludedIds]
  )

  // Only offer a filter chip for a theme that actually has stock behind it.
  const themesPresent = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of visible) counts.set(themeOf(p), (counts.get(themeOf(p)) ?? 0) + 1)
    return THEMES.filter((t) => counts.has(t.key)).map((t) => ({ ...t, count: counts.get(t.key)! }))
  }, [visible])

  const shown = useMemo(() => {
    let list = theme === 'all' ? visible : visible.filter((p) => themeOf(p) === theme)
    const q = query.trim().toLowerCase()
    if (q) {
      // Search stays inside this vendor — the header search on a showcase page
      // that silently returned plushies would be a confusing place to land.
      const tokens = q.split(/\s+/).filter(Boolean)
      list = list.filter((p) => {
        const hay = `${p.name} ${p.blurb}`.toLowerCase()
        return tokens.every((t) => hay.includes(t))
      })
    }
    return list
  }, [visible, theme, query])

  /**
   * "From" price for the hero, ignoring outliers.
   *
   * BRKOX currently lists a Charles Leclerc helmet case variant at $1.90 next to
   * its $64.90 twin — a data-entry slip on their side. Taking a naive minimum
   * made the page announce "from $1.90" over a wall of $100-plus frames, which
   * reads as broken and undersells the partner.
   *
   * The product card still shows $1.90, because that IS the price they publish
   * and quietly rewriting a vendor's price would be worse than an odd headline.
   * This only guards the summary: anything under a tenth of the median is
   * treated as a typo rather than a bargain.
   */
  const priceFrom = useMemo(() => {
    const prices = visible.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b)
    if (!prices.length) return 0
    const median = prices[Math.floor(prices.length / 2)]
    const sane = prices.filter((n) => n >= median * 0.1)
    return sane.length ? sane[0] : prices[0]
  }, [visible])

  return (
    <div className="min-h-screen bg-[#fffaf0]">
      {/* Hero */}
      <header className="relative overflow-hidden border-b-4 border-[#b79cff] bg-gradient-to-br from-[#efe6ff] via-[#fffaf0] to-[#ffe6dc]">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-display font-extrabold text-[13px] text-[#b79cff] hover:text-[#ff8a65] transition-colors"
            >
              ← Back to Kawaii Katz
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => setWishOpen(true)}
                className="border-2 border-[#ff5a7a] bg-white text-[#ff5a7a] rounded-full h-9 px-3.5 font-display font-extrabold text-[13px] cursor-pointer hover:bg-[#ff5a7a] hover:text-white transition-colors"
              >
                ♥ My Board{state.wish.length ? ` (${state.wish.length})` : ''}
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className="border-2 border-[#b79cff] bg-white text-[#b79cff] rounded-full h-9 px-3.5 font-display font-extrabold text-[13px] cursor-pointer hover:bg-[#b79cff] hover:text-white transition-colors"
              >
                🛒 Cart{state.cart.length ? ` (${state.cart.length})` : ''}
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-4 flex-wrap">
            <div className="text-[54px] leading-none">{cfg?.showcase?.emoji ?? '🧱'}</div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 bg-[#b79cff] text-white font-display font-extrabold text-[11px] uppercase tracking-[.8px] rounded-full px-3 py-1 mb-2">
                ✨ New partner
              </div>
              <h1 className="font-display font-extrabold text-[34px] sm:text-[44px] text-[#4f4550] leading-[1.05]">
                BRKOX
              </h1>
              <p className="font-display text-[17px] sm:text-[19px] text-[#ff8a65] mt-1">
                {cfg?.showcase?.tagline}
              </p>
              <p className="text-[14px] sm:text-[15px] text-[#6f6473] leading-relaxed mt-3 max-w-[62ch]">
                {cfg?.showcase?.intro}
              </p>

              <div className="flex gap-2 flex-wrap mt-4">
                {live && (
                  <span className="text-[12px] font-extrabold text-[#4f4550] bg-white border-2 border-[#b79cff] rounded-full px-3 py-1">
                    {visible.length} pieces
                  </span>
                )}
                {priceFrom > 0 && (
                  <span className="text-[12px] font-extrabold text-[#4f4550] bg-white border-2 border-[#ff8a65] rounded-full px-3 py-1">
                    from ${priceFrom.toFixed(2)}
                  </span>
                )}
                <span className="text-[12px] font-extrabold text-[#4f4550] bg-white border-2 border-[#7fc4d4] rounded-full px-3 py-1">
                  🔴 Live prices
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-7">
        <div className="relative mb-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search BRKOX: try “X-Wing”, “Ferrari”, “minifigures”…"
            aria-label="Search BRKOX products"
            className="w-full border-[3px] border-[#b79cff] bg-white rounded-[16px] pl-11 pr-4 py-3 font-sans font-bold text-[#4f4550] text-[14px] outline-none focus:border-[#ff8a65] placeholder:text-[#c4bccb] placeholder:font-semibold"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none">🔍</span>
        </div>

        {/* Theme chips */}
        {themesPresent.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => setTheme('all')}
              className={`font-display font-extrabold text-[13px] rounded-full px-3.5 py-2 border-[2.5px] transition-colors ${
                theme === 'all'
                  ? 'bg-[#b79cff] border-[#b79cff] text-white'
                  : 'bg-white border-[#e6dcff] text-[#4f4550] hover:border-[#b79cff]'
              }`}
            >
              Everything ({visible.length})
            </button>
            {themesPresent.map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`font-display font-extrabold text-[13px] rounded-full px-3.5 py-2 border-[2.5px] transition-colors ${
                  theme === t.key
                    ? 'bg-[#b79cff] border-[#b79cff] text-white'
                    : 'bg-white border-[#e6dcff] text-[#4f4550] hover:border-[#b79cff]'
                }`}
              >
                {t.emoji} {t.label} ({t.count})
              </button>
            ))}
          </div>
        )}

        {/* Only a genuinely empty page says it is loading. The server now
            inlines the whole vendor, so SWR is still "loading" on first render
            while a full grid of frames is already on screen — announcing a
            fetch over the top of it would invent a wait that isn't happening. */}
        {loading && !shown.length && (
          <p className="font-display text-[#9a8fa3] text-center py-16 text-[17px]">
            Fetching the display cabinet… 🧱
          </p>
        )}

        {!loading && !shown.length && (
          <p className="font-display text-[#9a8fa3] text-center py-16 text-[17px]">
            {query.trim() || theme !== 'all'
              ? 'Nothing matches that. 🌸'
              : 'Nothing here right now. 🌸'}
          </p>
        )}

        {/* One column on phones so each frame gets the full screen width — the
            whole point of the taller card is that you can see the composition.
            Fixed column counts rather than auto-fill: the card has a fixed
            height, so letting columns stretch to 550px produced very wide, short
            cards with the photo swimming in empty space. */}
        <div className="grid gap-3.5 sm:gap-4 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p, i) => (
            <BrkoxCard key={p.id} product={p} isAdaMode={state.adaMode} priority={i < 4} />
          ))}
        </div>

        <p className="text-[12.5px] text-[#9a8fa3] text-center mt-10 leading-relaxed">
          LEGO® is a trademark of the LEGO Group, which does not sponsor, authorise or endorse
          BRKOX or Kawaii Katz. Frames and cases are made to fit the sets listed. The sets
          themselves are sold separately.
        </p>
      </main>

      {/* Drawers get the FULL catalog, not just BRKOX, so a cart built on the
          home page still resolves its items while the shopper is over here. */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} products={allProducts} />
      <WishlistDrawer open={wishOpen} onClose={() => setWishOpen(false)} products={allProducts} />
    </div>
  )
}
