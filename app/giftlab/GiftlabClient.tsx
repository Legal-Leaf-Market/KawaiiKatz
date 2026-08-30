'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'

import { useVendorCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import { useStore } from '@/lib/store'
import { money, type Product } from '@/lib/data'
import ProductCard from '@/components/ProductCard'
import CartDrawer from '@/components/CartDrawer'
import WishlistDrawer from '@/components/WishlistDrawer'

const VENDOR = 'GiftLAB'

/**
 * GiftLAB's showcase.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS VENDOR HAS A ROOM OF ITS OWN
 *
 * Its feed was read in full before this page existed. Of 2,387 mapped products
 * exactly ZERO contain "kawaii", zero "plush" and zero "Sanrio". Dropped into
 * the main grid it would make a third of the catalogue not-kawaii, and 699 of
 * them land in `other` because categorize() has no rule for a personalised
 * photo gift.
 *
 * That is not a reason to decline a real partner, it is a reason to give it its
 * own page — the same call BRKOX got, and BRKOX is currently the best
 * performing thing this site puts on Pinterest.
 *
 * -----------------------------------------------------------------------------
 * THE THEMES ARE DERIVED FROM THE NAME, BECAUSE THERE IS NOTHING ELSE
 *
 * `product_type` is EMPTY on all 2,426 rows of their feed, so there is no
 * merchant taxonomy to group by and an `include` list could not reach a single
 * product (§4). The name is the only signal, exactly as it is for BRKOX.
 *
 * ORDER MATTERS, most specific first: "Custom Girlfriend Face Boxer Shorts -
 * Halloween" is both a face gift and a Halloween gift, and in October the
 * Halloween shelf is the one worth surfacing. Counts below are from the real
 * feed, 2026-08-30.
 */
const THEMES: { key: string; label: string; emoji: string; test: RegExp }[] = [
  { key: 'halloween', label: 'Halloween', emoji: '🎃', test: /halloween|spooky|pumpkin|ghost|witch|skeleton|trick or treat/i },
  { key: 'christmas', label: 'Christmas', emoji: '🎄', test: /christmas|xmas|santa|reindeer|ornament|stocking/i },
  { key: 'face', label: 'Put a face on it', emoji: '😄', test: /\bface\b|funny face|mash faces/i },
  { key: 'pets', label: 'For pet people', emoji: '🐾', test: /\bpet\b|\bdog\b|\bcat\b|\bpaw\b|puppy|kitten/i },
  { key: 'couples', label: 'Couples & anniversaries', emoji: '💛', test: /couple|boyfriend|girlfriend|anniversary|valentine|husband|wife/i },
  { key: 'family', label: 'Mum, dad & family', emoji: '👨‍👩‍👧', test: /\bmom\b|\bmum\b|mother|\bdad\b|father|family|grandma|grandpa|nana/i },
  { key: 'home', label: 'Blankets & home', emoji: '🛋️', test: /blanket|throw|pillow|canvas|wall art|doormat|apron|towel/i },
  { key: 'tech', label: 'Phone & tech', emoji: '📱', test: /phone case|airpod|earphone|charger|mouse ?pad|airtag/i },
  { key: 'wear', label: 'Socks & wearables', emoji: '🧦', test: /\bsocks\b|shirt|hoodie|sweater|jacket|boxer|slipper/i },
  { key: 'rest', label: 'Everything else', emoji: '🎁', test: /.*/ },
]

function themeOf(p: Product): string {
  return THEMES.find((t) => t.test.test(p.name))?.key ?? 'rest'
}

export default function GiftlabClient({ initialProducts }: { initialProducts: Product[] }) {
  const { products, allProducts, loading, live } = useVendorCatalog(VENDOR, initialProducts)
  const { excludedIds } = useExclusions()
  const { state } = useStore()
  const [theme, setTheme] = useState('all')
  const [query, setQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [wishOpen, setWishOpen] = useState(false)

  const visible = useMemo(
    () => products.filter((p) => !excludedIds.has(p.id)),
    [products, excludedIds]
  )

  // Only offer a chip for a theme that has stock behind it. With 2,300-odd
  // products every theme will have some, but an empty chip on a thin day is
  // worse than a missing one.
  const themesPresent = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of visible) counts.set(themeOf(p), (counts.get(themeOf(p)) ?? 0) + 1)
    return THEMES.filter((t) => counts.has(t.key)).map((t) => ({ ...t, count: counts.get(t.key)! }))
  }, [visible])

  const shown = useMemo(() => {
    let list = theme === 'all' ? visible : visible.filter((p) => themeOf(p) === theme)
    const q = query.trim().toLowerCase()
    if (q) {
      // Search stays inside this vendor. A header search on a showcase page
      // that silently returned plushies would be a confusing place to land.
      const tokens = q.split(/\s+/).filter(Boolean)
      list = list.filter((p) => {
        const hay = `${p.name} ${p.blurb}`.toLowerCase()
        return tokens.every((t) => hay.includes(t))
      })
    }
    // 2,300 cards in one DOM is a phone running out of memory. The themes are
    // the navigation; this is the safety rail behind them.
    return list.slice(0, 240)
  }, [visible, theme, query])

  const priceFrom = useMemo(() => {
    const prices = visible.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b)
    return prices.length ? prices[0] : 0
  }, [visible])

  return (
    <div className="min-h-screen bg-[#fffaf0]">
      <header className="relative overflow-hidden border-b-4 border-[#ff8a65] bg-gradient-to-br from-[#ffe6dc] via-[#fffaf0] to-[#e6dcff]">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-display font-extrabold text-[13px] text-[#ff8a65] hover:text-[#e0227a] transition-colors"
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
                className="border-2 border-[#ff8a65] bg-white text-[#ff8a65] rounded-full h-9 px-3.5 font-display font-extrabold text-[13px] cursor-pointer hover:bg-[#ff8a65] hover:text-white transition-colors"
              >
                🛒 Cart{state.cart.length ? ` (${state.cart.length})` : ''}
              </button>
            </div>
          </div>

          <h1 className="font-display text-[30px] sm:text-[42px] leading-tight mt-5 text-[#4f4550]">
            🎁 GiftLAB
          </h1>
          <p className="font-display font-extrabold text-[15px] sm:text-[17px] text-[#e0227a] mt-1">
            Put a face on it: personalised photo gifts, printed to order
          </p>
          <p className="text-[14px] sm:text-[15px] text-[#6f6472] font-semibold mt-3 max-w-[62ch] leading-relaxed">
            GiftLAB print your photos onto things people actually use: custom face socks and
            aprons, photo AirPod cases, printed blankets, puzzles and keyrings. Not kawaii, and
            not pretending to be. This is the shelf for the gift that only works because it is
            unmistakably about one person.
          </p>
          {visible.length > 0 && (
            <p className="text-[13px] font-bold text-[#9a8fa3] mt-3">
              {visible.length.toLocaleString()} things, from {money(priceFrom)}. Made to order,
              so give them a few days.
            </p>
          )}
        </div>
      </header>

      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 flex-wrap items-center mb-4">
          <button
            onClick={() => setTheme('all')}
            className={`border-2 rounded-full px-3.5 h-9 font-display font-extrabold text-[13px] cursor-pointer transition-colors ${
              theme === 'all'
                ? 'bg-[#ff8a65] border-[#ff8a65] text-white'
                : 'bg-white border-[#ffd9c9] text-[#6f6472] hover:border-[#ff8a65]'
            }`}
          >
            Everything ({visible.length})
          </button>
          {themesPresent.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={`border-2 rounded-full px-3.5 h-9 font-display font-extrabold text-[13px] cursor-pointer transition-colors ${
                theme === t.key
                  ? 'bg-[#ff8a65] border-[#ff8a65] text-white'
                  : 'bg-white border-[#ffd9c9] text-[#6f6472] hover:border-[#ff8a65]'
              }`}
            >
              {t.emoji} {t.label} ({t.count})
            </button>
          ))}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GiftLAB, for example: socks, blanket, dog"
          className="w-full sm:max-w-[420px] border-[2.5px] border-[#ffd9c9] rounded-xl h-11 px-3.5 text-[14px] font-semibold text-[#4f4550] bg-white outline-none focus:border-[#ff8a65] mb-5"
        />

        {loading && !visible.length ? (
          <p className="text-[#9a8fa3] font-bold py-10">Opening the print shop...</p>
        ) : !visible.length ? (
          <p className="text-[#9a8fa3] font-bold py-10">
            Nothing here right now. The catalogue refreshes every few hours.
          </p>
        ) : (
          <>
            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
              {shown.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {shown.length < visible.length && theme === 'all' && !query && (
              <p className="text-[13px] font-bold text-[#9a8fa3] mt-5 text-center">
                Showing {shown.length} of {visible.length.toLocaleString()}. Pick a theme above to
                narrow it down.
              </p>
            )}
          </>
        )}

        {!live && !loading && visible.length > 0 && (
          <p className="text-[12px] text-[#9a8fa3] font-semibold mt-6">
            Showing the last catalogue we built. Live prices load in a moment.
          </p>
        )}
      </div>

      {/* Both drawers take the WHOLE catalogue, not this vendor's slice: a
          visitor can arrive here with a plushie already saved, and a drawer that
          could not resolve it would show an empty board and look broken. */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} products={allProducts} />
      <WishlistDrawer open={wishOpen} onClose={() => setWishOpen(false)} products={allProducts} />
    </div>
  )
}
