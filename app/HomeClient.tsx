'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { PRICE_BUCKETS, isNewItem, type Product } from '@/lib/data'
import { useStore } from '@/lib/store'
import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import Header from '@/components/Header'
import FilterToolbar, { type Filters } from '@/components/FilterToolbar'
import ProductCard from '@/components/ProductCard'
import AdaPicksRail from '@/components/AdaPicksRail'
import FeaturedCollection from '@/components/FeaturedCollection'
import CartDrawer from '@/components/CartDrawer'
import WishlistDrawer from '@/components/WishlistDrawer'
import GiftFinder from '@/components/GiftFinder'
import AdaLoginModal from '@/components/AdaLoginModal'

const PAGE_SIZE = 18
const ADA_SECRET_CODE = 'adamode'

// Simple search — supports synonyms and fuzzy token matching from original
function searchMatch(p: Product, q: string): boolean {
  if (!q) return true
  const hay = `${p.name} ${p.vendor} ${p.cat} ${p.blurb}`.toLowerCase()
  const tokens = q.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean)
  return tokens.every((tok) => hay.includes(tok))
}

export default function HomeClient({ initialProducts }: { initialProducts: Product[] }) {
  const { state, dispatch } = useStore()
  // `gridProducts` excludes showcase vendors (they have their own page);
  // `allProducts` keeps everyone, so cart and wishlist can still resolve an
  // item that was added from a showcase page.
  //
  // `initialProducts` is a real slice of the current catalogue, rendered into
  // the HTML by the server. It seeds SWR so the first paint is live product
  // data rather than a hardcoded placeholder list.
  const { products: gridProducts, allProducts } = useLiveCatalog(initialProducts)
  const { excludedIds, exclude, restore } = useExclusions()

  // Shoppers never see excluded products (filtered client-side against the fresh
  // exclusion list). In Ada mode the curator keeps seeing them, marked, so they
  // can be restored. Cart/Wishlist keep the full catalog so existing items resolve.
  const products = useMemo(
    () => (state.adaMode ? gridProducts : gridProducts.filter((p) => !excludedIds.has(p.id))),
    [gridProducts, excludedIds, state.adaMode]
  )

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({ store: '', cat: '', priceBucket: '', onSaleOnly: false, newOnly: false })
  const [page, setPage] = useState(1)
  const [cartOpen, setCartOpen] = useState(false)
  const [wishOpen, setWishOpen] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)
  const [adaLoginOpen, setAdaLoginOpen] = useState(false)

  // Ada Mode is hidden from the customer-facing site entirely. The ONLY way to
  // surface it is to type the secret code "adamode" anywhere on the page (not
  // in an input), which opens the login. Ported from the original keydown buffer.
  useEffect(() => {
    let buf = ''
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      const k = e.key || ''
      if (k.length !== 1 || !/[a-z]/i.test(k)) return
      buf = (buf + k.toLowerCase()).slice(-ADA_SECRET_CODE.length)
      if (buf === ADA_SECRET_CODE) { buf = ''; setAdaLoginOpen(true) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filters.store && p.vendor !== filters.store) return false
      if (filters.cat && p.cat !== filters.cat) return false
      if (filters.priceBucket) {
        const b = PRICE_BUCKETS.find((x) => x.key === filters.priceBucket)
        if (b && (p.price < b.min || p.price >= b.max)) return false
      }
      if (filters.onSaleOnly && !p.onSale) return false
      if (filters.newOnly && !isNewItem(p)) return false
      if (!searchMatch(p, search)) return false
      return true
    })
  }, [products, filters, search])

  // Resolve each Ada pick to its full catalog product (for real image/price),
  // falling back to a minimal product built from the pick itself.
  const resolvedPicks = useMemo<Product[]>(() => {
    return state.adaPicks.map((pk) => {
      const full = products.find((p) => p.id === pk.id)
      if (full) return full
      return {
        id: pk.id, vendor: pk.vendor, domain: pk.url, name: pk.name, cat: pk.cat,
        character: '', price: pk.price, unit: '', onSale: false, wasPrice: 0, discountPct: 0,
        commissionPct: 0, couponCode: '', couponPct: 0, image: pk.image, url: pk.url,
        badge: '', added: '', variants: [], blurb: '',
      }
    })
  }, [state.adaPicks, products])

  // Arrange the feed in blocks of 10: [1 Ada pick] followed by three sets of 3,
  // each set drawn from a different category, rotating categories round-robin.
  // So an Ada pick punctuates the feed every 10th item.
  type FeedItem = { kind: 'product'; product: Product } | { kind: 'ada'; product: Product }
  const arranged = useMemo<FeedItem[]>(() => {
    // Group filtered products by category, preserving original order within each.
    const byCat = new Map<string, Product[]>()
    for (const p of filtered) {
      if (!byCat.has(p.cat)) byCat.set(p.cat, [])
      byCat.get(p.cat)!.push(p)
    }
    const cats = [...byCat.keys()]
    const cursors: Record<string, number> = {}
    cats.forEach((c) => { cursors[c] = 0 })

    // Round-robin: each pass takes up to 3 from every category that still has items.
    // Consecutive sets therefore rotate through the categories.
    const sets: Product[][] = []
    let progressed = true
    while (progressed) {
      progressed = false
      for (const c of cats) {
        const list = byCat.get(c)!
        if (cursors[c] < list.length) {
          sets.push(list.slice(cursors[c], cursors[c] + 3))
          cursors[c] += 3
          progressed = true
        }
      }
    }

    // Assemble items, injecting one Ada pick before every 3 category-sets so
    // each [pick + 3 + 3 + 3] group is a block of 10.
    const items: FeedItem[] = []
    let pickCursor = 0
    for (let i = 0; i < sets.length; i++) {
      if (i % 3 === 0 && resolvedPicks.length > 0) {
        items.push({ kind: 'ada', product: resolvedPicks[pickCursor % resolvedPicks.length] })
        pickCursor++
      }
      for (const p of sets[i]) items.push({ kind: 'product', product: p })
    }
    return items
  }, [filtered, resolvedPicks])

  const shownItems = arranged.slice(0, page * PAGE_SIZE)
  const hasMore = shownItems.length < arranged.length
  const shownProductCount = shownItems.reduce((n, it) => n + (it.kind === 'product' ? 1 : 0), 0)

  function handleSearch(q: string) {
    // Detect ada mode activation code
    if (q.trim().toLowerCase() === ADA_SECRET_CODE) {
      setAdaLoginOpen(true)
      setSearch('')
      return
    }
    setSearch(q)
    setPage(1)
  }

  function handleFiltersChange(f: Filters) {
    setFilters(f)
    setPage(1)
  }

  function toggleAdaPick(p: Product) {
    dispatch({
      type: 'TOGGLE_ADA_PICK',
      pick: { id: p.id, name: p.name, vendor: p.vendor, cat: p.cat, price: p.price, image: p.image, url: p.url || p.domain, ts: Date.now() },
    })
  }

  function toggleExclude(p: Product, currentlyExcluded: boolean) {
    if (currentlyExcluded) restore(p.id)
    else exclude(p)
  }

  const pickedIds = new Set(state.adaPicks.map((x) => x.id))

  return (
    <>
      {/* Header */}
      <Header
        onSearch={handleSearch}
        onOpenCart={() => setCartOpen(true)}
        onOpenWish={() => setWishOpen(true)}
        onOpenGift={() => setGiftOpen(true)}
        wishCount={state.wish.length}
        searchValue={search}
      />

      <main>
        {/* CTA Strip */}
        <div className="max-w-[1180px] mx-auto px-4 flex gap-3.5 flex-wrap py-4 pb-1.5">
          <button
            id="giftfinder"
            onClick={() => setGiftOpen(true)}
            className="flex-1 min-w-[260px] flex items-center gap-3.5 border-[3px] border-white rounded-[20px] p-3.5 px-4 cursor-pointer shadow-[0_8px_24px_rgba(255,138,101,.16)] text-left transition-all hover:-translate-y-0.5 active:translate-y-px bg-gradient-to-r from-[#ffb199] to-[#ffd873]"
            aria-label="Open Gift Finder"
          >
            <span className="text-[36px]" aria-hidden="true">🎁</span>
            <span className="flex flex-col leading-tight">
              <strong className="font-display text-[20px] text-[#4f4550]">Gift Finder</strong>
              <small className="font-bold text-[12.5px] text-[#4f4550] opacity-80">Find the perfect kawaii gift</small>
            </span>
          </button>
          <button
            onClick={() => setWishOpen(true)}
            className="flex-1 min-w-[260px] flex items-center gap-3.5 border-[3px] border-white rounded-[20px] p-3.5 px-4 cursor-pointer shadow-[0_8px_24px_rgba(255,138,101,.16)] text-left transition-all hover:-translate-y-0.5 active:translate-y-px bg-gradient-to-r from-[#bfe3ea] to-[#c9ecd2]"
            aria-label="Open My Board wishlist"
          >
            <span className="text-[36px]" aria-hidden="true">❤️</span>
            <span className="flex flex-col leading-tight">
              <strong className="font-display text-[20px] text-[#4f4550]">My Board</strong>
              <small className="font-bold text-[12.5px] text-[#4f4550] opacity-80">Your saved kawaii finds</small>
            </span>
          </button>
          {/* Showcase partners sit here rather than in the product grid — the
              whole point of a showcase is that the catalogue is not buried. */}
          <Link
            href="/brkox"
            className="flex-1 min-w-[260px] flex items-center gap-3.5 border-[3px] border-white rounded-[20px] p-3.5 px-4 cursor-pointer shadow-[0_8px_24px_rgba(255,138,101,.16)] text-left transition-all hover:-translate-y-0.5 active:translate-y-px bg-gradient-to-r from-[#cdb8ff] to-[#ffc4b0]"
            aria-label="Browse the BRKOX display frame showcase"
          >
            <span className="text-[36px]" aria-hidden="true">🧱</span>
            <span className="flex flex-col leading-tight">
              <strong className="font-display text-[20px] text-[#4f4550]">
                BRKOX <span className="text-[11px] align-middle bg-white/70 rounded-full px-1.5 py-0.5">NEW</span>
              </strong>
              <small className="font-bold text-[12.5px] text-[#4f4550] opacity-80">Display frames for LEGO® builds</small>
            </span>
          </Link>
        </div>

        {/* Ada's Picks rail */}
        <AdaPicksRail products={products} excludedIds={excludedIds} />

        {/* Featured Collection */}
        <FeaturedCollection products={products} excludedIds={excludedIds} />

        {/* Filter toolbar */}
        <div id="shop">
          <FilterToolbar filters={filters} products={products} onChange={handleFiltersChange} />
        </div>

        {/* Results count */}
        <div className="max-w-[1180px] mx-auto px-4 mt-4 mb-1 flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5 font-display font-extrabold text-[#4f4550] text-[16px] flex-wrap">
            <span className="bg-gradient-to-r from-[#ffb199] to-[#bfe3ea] px-3.5 py-1 rounded-full shadow-[0_4px_12px_rgba(255,138,101,.18)] text-[20px]">
              {filtered.length}
            </span>
            <span>products</span>
            {(filters.store || filters.cat || filters.priceBucket || filters.onSaleOnly || filters.newOnly || search) && (
              <>
                <span className="text-[#9a8fa3] text-[20px]">·</span>
                <span
                  className="bg-gradient-to-r from-[#bfe3ea] to-[#c9ecd2] px-3.5 py-1 rounded-full shadow-[0_4px_12px_rgba(255,138,101,.18)] text-[20px]"
                >
                  {shownProductCount}
                </span>
                <span>shown</span>
              </>
            )}
          </div>
          {search && (
            <div className="text-[#9a8fa3] font-bold text-[13px]">
              Results for &ldquo;<strong className="text-[#ff8a65]">{search}</strong>&rdquo;
            </div>
          )}
        </div>

        {/* Product grid */}
        <div className="max-w-[1180px] mx-auto px-4">
          {shownItems.length === 0 ? (
            <div className="text-center py-16 text-[#9a8fa3] font-bold">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-lg">No products match those filters.</p>
              <button
                onClick={() => { setFilters({ store: '', cat: '', priceBucket: '', onSaleOnly: false, newOnly: false }); setSearch(''); setPage(1) }}
                className="mt-3 border-[2.5px] border-[#ffb199] bg-white text-[#ff8a65] font-display font-extrabold px-6 py-2.5 rounded-full cursor-pointer hover:bg-[#ffb199] hover:text-[#4f4550] transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 py-2 pb-10">
              {shownItems.map((item, i) =>
                item.kind === 'ada' ? (
                  <ProductCard
                    key={`ada-${item.product.id}-${i}`}
                    product={item.product}
                    isFeedPick
                    isPicked
                    isExcluded={excludedIds.has(item.product.id)}
                    isAdaMode={state.adaMode}
                    onTogglePick={state.adaMode ? toggleAdaPick : undefined}
                    onToggleExclude={state.adaMode ? toggleExclude : undefined}
                  />
                ) : (
                  <ProductCard
                    key={`prod-${item.product.id}-${i}`}
                    product={item.product}
                    isPicked={pickedIds.has(item.product.id)}
                    isExcluded={excludedIds.has(item.product.id)}
                    isAdaMode={state.adaMode}
                    onTogglePick={state.adaMode ? toggleAdaPick : undefined}
                    onToggleExclude={state.adaMode ? toggleExclude : undefined}
                  />
                )
              )}
              {hasMore && (
                <div className="col-span-full flex justify-center py-3.5 pb-7">
                  <button
                    onClick={() => setPage((n) => n + 1)}
                    className="border-[3px] border-[#ff8a65] bg-[#ffb199] font-display font-extrabold text-[15px] px-7 py-3 rounded-full cursor-pointer shadow-[0_4px_12px_rgba(255,138,101,.18)] text-[#4f4550] hover:bg-[#ff8a65] hover:text-white transition-colors active:translate-y-0.5"
                  >
                    Load more ({arranged.length - shownItems.length} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-[#bfe3ea] to-[#ffb199] py-6 mt-5" role="contentinfo">
        <div className="max-w-[1180px] mx-auto px-4 flex flex-wrap gap-3.5 justify-between items-center text-[#4f4550]">
          <div>
            <strong className="font-display text-[18px]">🐈‍⬛ Kawaii Katz 🐼</strong>
            <p className="text-sm font-semibold opacity-80 mt-0.5">Kawaii, Clever &amp; Kind</p>
          </div>
          <div className="text-sm font-semibold opacity-80 text-center">
            <p>Curated kawaii finds — affiliate links support this site.</p>
            <p className="mt-0.5">
              <a href="mailto:hello@kawaiikatz.com" className="font-extrabold hover:underline">hello@kawaiikatz.com</a>
            </p>
          </div>
        </div>
      </footer>

      {/* Drawers & Modals */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} products={allProducts} />
      <WishlistDrawer open={wishOpen} onClose={() => setWishOpen(false)} products={allProducts} />
      <GiftFinder open={giftOpen} onClose={() => setGiftOpen(false)} products={products} />
      <AdaLoginModal open={adaLoginOpen} onClose={() => setAdaLoginOpen(false)} />
    </>
  )
}
