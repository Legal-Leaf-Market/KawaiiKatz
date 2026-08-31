'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'

import { useVendorCatalog } from '@/hooks/useLiveCatalog'
import { useExclusions } from '@/hooks/useExclusions'
import { useStore } from '@/lib/store'
import { affiliateUrl, vendorCfg, money, type Product } from '@/lib/data'
import { logEvent } from '@/lib/site-events'
import ProductCard from '@/components/ProductCard'
import FloatingCart from '@/components/FloatingCart'
import CartDrawer from '@/components/CartDrawer'
import WishlistDrawer from '@/components/WishlistDrawer'

const VENDOR = 'Everblog US'

/**
 * Rows that are not products.
 *
 * Their feed carries a $0.98 "Worry-Free Purchase" line, which is a checkout
 * add-on rather than a thing you buy. It cost nothing to leave in the catalogue
 * and everything to leave on this page: it is the cheapest row, so the header
 * read "prices start at $0.98" for a shop whose calendars are $249 and $349.
 * That is exactly the invented number the rest of this page is built to avoid,
 * and it was invented by arithmetic rather than by anyone writing it.
 *
 * The test is the BRAND, not the price. Every real row here says Everblog,
 * FridgeCal or HomeCal in its name, because it is a single-product shop with
 * accessories; a warranty line does not. A price floor would have been the
 * obvious rule and the wrong one, since a genuine $2 accessory is a thing they
 * could sell tomorrow.
 */
const BRAND = /everblog|fridgecal|homecal/i

/**
 * Everblog's showcase.
 *
 * -----------------------------------------------------------------------------
 * WHY A PARTNER WHO SELLS NO KAWAII IS ON THIS SITE AT ALL
 *
 * The same call BRKOX and GiftLAB got, for the same reason and with the same
 * boundary: a real partner whose stock is a different shape from the shelf gets
 * a room of its own rather than being scattered through a grid of plushies
 * where it would help nobody. `VendorConfig.showcase` also keeps it OUT of the
 * main grid, which is the point: a $349 wall calendar between a $12 plushie and
 * a pencil case reads as a mis-click.
 *
 * The thread it belongs to is real and already runs through the site: MamaRaya's
 * baby gifts, Montessori & Me's routine charts, the whole `learning` shelf. The
 * person buying a plushie for a seven year old is usually the person running
 * the seven year old's week.
 *
 * -----------------------------------------------------------------------------
 * EVERY CLAIM ON THIS PAGE IS SOURCED, AND THE PRICES ARE NOT CLAIMS AT ALL
 *
 * Prices come from the live feed and nothing here hardcodes one. A page cached
 * for six hours cannot promise a number, and the site has never invented stock,
 * availability or a discount (§4c, and the EVER10 note in lib/data.ts: their
 * terms name a code and never say what it takes off, so we do not show it).
 *
 * The review line is attributed rather than asserted, because it is somebody
 * else's measurement and it will drift.
 *
 * -----------------------------------------------------------------------------
 * IT WORKS WITH AN EMPTY FEED, WHICH IS NOT HYPOTHETICAL
 *
 * This went live unprobed on Jacob's call, so `products.json` answering nothing
 * is a live possibility, and the §4c batch is the precedent: of seven approved
 * partnerships, one returned a readable feed. An empty grid here still shows
 * the pitch and still sends a tracked click, so the page earns either way
 * instead of reading as broken.
 */
export default function EverblogClient({ initialProducts }: { initialProducts: Product[] }) {
  const { products, allProducts, loading } = useVendorCatalog(VENDOR, initialProducts)
  const { excludedIds } = useExclusions()
  const { state } = useStore()
  const [cartOpen, setCartOpen] = useState(false)
  const [wishOpen, setWishOpen] = useState(false)

  const cfg = vendorCfg(VENDOR)
  const visible = useMemo(
    () => products.filter((p) => !excludedIds.has(p.id) && BRAND.test(p.name)),
    [products, excludedIds]
  )
  const from = useMemo(() => {
    const ps = visible.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b)
    return ps.length ? ps[0] : 0
  }, [visible])

  /** The tracked link to the shop itself, for the empty state and the footer. */
  const shopLink = affiliateUrl('https://everblog.com', VENDOR)

  return (
    <div className="min-h-screen bg-[#fffaf0]">
      <header className="border-b-4 border-[#7fc4d4] bg-gradient-to-br from-[#e8f6f9] to-[#fffaf0]">
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
          <Link
            href="/"
            className="font-display text-[13.5px] font-extrabold text-[#7fc4d4] hover:underline"
          >
            ← Back to Kawaii Katz
          </Link>

          <div className="mt-5 flex flex-wrap items-start gap-5">
            <div className="text-[54px] leading-none">{cfg?.showcase?.emoji ?? '📅'}</div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[34px] font-extrabold leading-[1.05] text-[#4f4550] sm:text-[46px]">
                Everblog
              </h1>
              <p className="mt-1 font-display text-[16px] font-extrabold text-[#7fc4d4]">
                {cfg?.showcase?.tagline}
              </p>
              <p className="mt-3 max-w-[68ch] text-[15px] font-semibold leading-relaxed text-[#4f4550]">
                {cfg?.showcase?.intro}
              </p>
            </div>
          </div>

          {/* Three things a shopper actually wants to know, and nothing we
              cannot stand behind. "No subscription" is the merchant's own
              headline feature and the thing every reviewer led with. */}
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {[
              'No subscription',
              'A profile for everyone in the house',
              'Chores that turn into stars',
              'Fridge or wall',
            ].map((f) => (
              <li
                key={f}
                className="rounded-full border-2 border-[#bfe3ea] bg-white px-3.5 py-1.5 font-display text-[12.5px] font-extrabold text-[#4f4550]"
              >
                {f}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[12.5px] font-semibold leading-relaxed text-[#9a8fa3]">
            Rated 4.7 out of 5 across 358 reviews on Trustpilot, and reviewed by Notebookcheck,
            The Gadgeteer, TWICE and Poc Network. Those are their numbers and other people&rsquo;s
            write-ups, not ours.
          </p>

          <p className="mt-3 max-w-[72ch] text-[12.5px] font-semibold leading-relaxed text-[#9a8fa3]">
            We do not sell any of this. Everblog stock it and ship it, you check out on their
            site, and our links are affiliate links, so we may earn a commission when you buy.
            {from > 0 ? ` Prices come from their live feed and start at ${money(from)}.` : ''}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
        {visible.length > 0 ? (
          <>
            <h2 className="mb-4 font-display text-[22px] font-extrabold text-[#4f4550]">
              {visible.length === 1 ? 'The calendar' : `${visible.length} from Everblog`}
            </h2>
            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} similarPool={allProducts} />
              ))}
            </div>
          </>
        ) : (
          /* The empty state is a real page, not an apology. See the note above:
             this shipped unprobed, and a showcase that still explains the thing
             and still sends a tracked click earns either way. */
          <div className="rounded-[22px] border-[3px] border-[#bfe3ea] bg-white p-6 text-center sm:p-10">
            <p className="font-display text-[20px] font-extrabold text-[#4f4550]">
              {loading ? 'Loading their shelf' : 'Their shelf is not showing here yet'}
            </p>
            <p className="mx-auto mt-2 max-w-[52ch] text-[14px] font-semibold leading-relaxed text-[#9a8fa3]">
              {loading
                ? 'One moment.'
                : 'We read their catalogue every few hours and it has not come through yet. Everblog are open and shipping in the meantime.'}
            </p>
            {!loading && (
              <a
                href={shopLink}
                target="_blank"
                rel="nofollow sponsored noopener"
                onClick={() => logEvent('outbound_click', { vendor: VENDOR, meta: 'everblog-empty' })}
                className="mt-5 inline-block rounded-full border-[3px] border-[#7fc4d4] bg-[#7fc4d4] px-6 py-3 font-display text-[14px] font-extrabold text-white transition-colors hover:bg-white hover:text-[#7fc4d4]"
              >
                Visit Everblog →
              </a>
            )}
          </div>
        )}

        <section className="mt-10 rounded-[22px] border-[3px] border-[#bfe3ea] bg-white p-6">
          <h2 className="font-display text-[19px] font-extrabold text-[#4f4550]">
            Why this is on a kawaii site
          </h2>
          <p className="mt-2 max-w-[70ch] text-[14px] font-semibold leading-relaxed text-[#4f4550]">
            Because it is the same shopper. Half of what we carry is bought by a parent for a
            kid: the wooden toys, the routine charts, the lunch boxes, the plushie that has to
            arrive before a birthday. Everblog is the thing that keeps the birthday on the
            fridge. We would rather point at one good version of it than pretend the category
            does not exist.
          </p>
          <a
            href={shopLink}
            target="_blank"
            rel="nofollow sponsored noopener"
            onClick={() => logEvent('outbound_click', { vendor: VENDOR, meta: 'everblog-note' })}
            className="mt-4 inline-block rounded-full border-[3px] border-[#7fc4d4] px-5 py-2.5 font-display text-[13.5px] font-extrabold text-[#7fc4d4] transition-colors hover:bg-[#7fc4d4] hover:text-white"
          >
            See it on everblog.com →
          </a>
        </section>
      </main>

      {/* Same bubble and same confirmation as every other room, because a
          visitor arriving here from the grid has a cart already. */}
      <FloatingCart products={allProducts} onOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} products={allProducts} />
      <WishlistDrawer open={wishOpen} onClose={() => setWishOpen(false)} products={allProducts} />
      {state.wish.length > 0 && (
        <button
          type="button"
          onClick={() => setWishOpen(true)}
          className="fixed bottom-4 left-4 z-50 rounded-full border-[3px] border-[#ff5a7a] bg-white px-4 py-2.5 font-display text-[13px] font-extrabold text-[#ff5a7a] shadow-[0_8px_24px_rgba(0,0,0,.15)]"
        >
          ♥ My Board ({state.wish.length})
        </button>
      )}
    </div>
  )
}
