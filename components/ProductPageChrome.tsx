'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useStore } from '@/lib/store'
import Header from '@/components/Header'
import CartDrawer from '@/components/CartDrawer'
import WishlistDrawer from '@/components/WishlistDrawer'
import GiftFinder from '@/components/GiftFinder'
import TasteNote from '@/components/TasteNote'
import { CatMark, PandaMark } from '@/components/BrandMark'

/**
 * Header, drawers and footer for a product page.
 *
 * Without this the page renders bare — no cart, no Gift Finder, no way back
 * into the catalogue — which would defeat the point of building the page at
 * all. The whole argument for /p/<id> is that pin traffic lands somewhere it
 * can be picked up instead of bouncing to a merchant; a dead end with a Buy
 * button is just a slower bounce.
 *
 * A client component wrapping server-rendered children, so the page itself
 * stays a server component and only the chrome hydrates.
 *
 * `useLiveCatalog` is the same SWR call the home page makes, against the same
 * cached key — the drawers need the catalogue to resolve a cart line, and this
 * shares the request rather than opening a second one.
 */
export default function ProductPageChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { state } = useStore()
  const { allProducts, products } = useLiveCatalog()
  const [cartOpen, setCartOpen] = useState(false)
  const [wishOpen, setWishOpen] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)

  return (
    <>
      <Header
        // There is no grid here to filter, so searching leaves for the one
        // place that can answer. Anything else would be a box that does nothing.
        onSearch={(q) => { if (q.trim()) router.push(`/?q=${encodeURIComponent(q.trim())}`) }}
        searchValue=""
        onOpenCart={() => setCartOpen(true)}
        onOpenWish={() => setWishOpen(true)}
        onOpenGift={() => setGiftOpen(true)}
        wishCount={state.wish.length}
      />

      {children}

      <footer className="bg-gradient-to-r from-[#bfe3ea] to-[#ffb199] py-6 mt-10" role="contentinfo">
        <div className="max-w-[1180px] mx-auto px-4 flex flex-wrap gap-3.5 justify-between items-center text-[#4f4550]">
          <a href="/" className="block">
            <strong className="font-display text-[18px] inline-flex items-center gap-2">
              <CatMark size={26} /> Kawaii Katz <PandaMark size={26} />
            </strong>
            <p className="text-sm font-semibold opacity-80 mt-0.5">Kawaii, Clever &amp; Kind</p>
          </a>
          <div className="text-sm font-semibold opacity-80 text-center">
            <p>Curated kawaii finds — affiliate links support this site.</p>
            <TasteNote variant="footer" />
          </div>
        </div>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} products={allProducts} />
      <WishlistDrawer open={wishOpen} onClose={() => setWishOpen(false)} products={allProducts} />
      <GiftFinder open={giftOpen} onClose={() => setGiftOpen(false)} products={products} />
    </>
  )
}
