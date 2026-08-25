'use client'
import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { usePicks } from '@/hooks/usePicks'
import { CatMark, PandaMark } from '@/components/BrandMark'
import { catEmoji, money, type Product, type AdaPick } from '@/lib/data'
import { openPin } from '@/lib/pinterest'
import { useCarousel } from '@/hooks/useCarousel'
import ProductImage from './ProductImage'

export type { AdaPick }

type Props = {
  products: Product[]
  excludedIds?: Set<string>
}

export default function AdaPicksRail({ products, excludedIds }: Props) {
  const { state, dispatch } = useStore()
  const { adaMode } = state
  // The picks come from the server now, not the client store. They used to live
  // in localStorage, which meant Ada curated the rail for herself and nobody
  // else — see the note on hooks/usePicks.
  const { picks: adaPicks, removePick, strandedLocalPicks, publishLocalPicks } = usePicks()
  const { ref, canPrev, canNext, prev, next } = useCarousel<HTMLDivElement>()

  // Resolve each pick against the live catalog so images/prices stay fresh.
  // For shoppers, drop any pick that has been excluded from the store so a
  // hidden product can't resurface via the pick's fallback metadata.
  const resolved = useMemo(() => {
    return [...adaPicks]
      .filter((pk) => adaMode || !excludedIds?.has(pk.id))
      .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
      .map((pk) => {
        const live = products.find((x) => x.id === pk.id)
        return {
          pick: pk,
          live,
          image: live?.image || pk.image || '',
          price: live?.price ?? pk.price,
          name: live?.name || pk.name,
        }
      })
  }, [adaPicks, products, adaMode, excludedIds])

  function addToCart(id: string) {
    dispatch({ type: 'ADD_TO_CART', productId: id, variantIndex: 0 })
  }


  const isEmpty = resolved.length === 0

  return (
    <section className="py-4 pb-0.5" aria-label="Ada's Picks">
      <div className="max-w-[1180px] mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#e6dcff] to-[#ffb199] flex items-center justify-center shadow-[0_3px_6px_rgba(183,156,255,.38)]" aria-hidden="true">
              <CatMark size={46} />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-[25px] text-[#4f4550] leading-none">Ada&apos;s Picks</h2>
              <small className="font-bold text-[#9a8fa3] text-[12.5px]">Curated by our kawaii editor</small>
            </div>
          </div>
          {/* Admin-only exit control. Nothing renders for shoppers — Ada Mode is
              entered exclusively by typing the secret code, which opens the login. */}
          {adaMode && (
            <div className="flex items-center gap-2">
              {/* Picks stranded in this browser by the old localStorage-only
                  implementation. Offered, never auto-published: this list is
                  global now, and whatever is in one browser is not necessarily
                  what should go on the site for everyone. */}
              {strandedLocalPicks.length > 0 && (
                <button
                  onClick={publishLocalPicks}
                  className="border-[2.5px] border-[#ff8a65] bg-white text-[#ff8a65] font-display font-extrabold px-3.5 py-2 rounded-full cursor-pointer text-[13px] hover:bg-[#ff8a65] hover:text-white transition-colors"
                  title="These picks were saved only in this browser. Publish them so every visitor sees them."
                >
                  ⬆ Publish {strandedLocalPicks.length} saved on this device
                </button>
              )}
              <button
                onClick={() => dispatch({ type: 'SET_ADA_MODE', on: false })}
                className="border-[2.5px] border-[#b79cff] bg-[#b79cff] text-white font-display font-extrabold px-3.5 py-2 rounded-full cursor-pointer text-[13px]"
                title="Exit Ada Mode"
              >
                🌙 Ada Mode ON
              </button>
            </div>
          )}
        </div>

        {/* Empty state (only reachable in Ada mode after removing all picks) */}
        {isEmpty ? (
          <p className="text-[#9a8fa3] font-bold py-3.5 px-1">
            ✨ You&apos;re in <strong>Ada Mode</strong>! Tap ☆ on any product below to add your first pick.
          </p>
        ) : (
          <div className="relative">
            <MascotArrow direction="prev" show={canPrev} onClick={prev} />
            <div
              ref={ref}
              className="flex gap-4 overflow-x-auto pb-3.5 pt-1.5 ap-rail-bare scroll-smooth"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {resolved.map(({ pick, live, image, price, name }) => {
                return (
                  <div
                    key={pick.id}
                    className="flex-[0_0_205px] bg-white border-[3px] border-[#b79cff] rounded-[20px] overflow-hidden shadow-[0_4px_12px_rgba(255,138,101,.18)] flex flex-col relative"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <span className="absolute top-2 left-2 bg-[#b79cff] text-white border-2 border-white rounded-full font-display font-extrabold text-[10px] px-2 py-[3px] z-20">
                      🎀 pick
                    </span>
                    {adaMode && (
                      <button
                        onClick={() => removePick(pick.id)}
                        className="absolute top-2 right-2 border-2 border-[#b79cff] bg-white text-[#b79cff] rounded-full w-[30px] h-[30px] cursor-pointer text-[15px] z-20 flex items-center justify-center hover:bg-[#b79cff] hover:text-white transition-colors"
                        aria-label="Remove from Ada's Picks"
                        title="Remove from picks"
                      >
                        ★
                      </button>
                    )}
                    <div className="aspect-square bg-gradient-to-br from-[#e6dcff] to-[#bfe3ea] flex items-center justify-center overflow-hidden relative">
                      {/* The rail is the first thing on the page, so these load
                          eagerly rather than waiting on the lazy heuristic. */}
                      <ProductImage
                        src={image}
                        alt={name}
                        fallback={catEmoji(pick.cat)}
                        className="w-full h-full object-cover"
                        width={200}
                        priority
                      />
                    </div>
                    <div className="p-2.5 px-3 flex flex-col gap-1.5 flex-1">
                      <div className="font-display font-extrabold text-[14px] leading-tight line-clamp-2">{name}</div>
                      <div className="font-display text-[#ff8a65] text-[16px]">{money(price)}</div>
                      <div className="flex gap-1.5 mt-auto">
                        <button
                          type="button"
                          disabled={!live}
                          onClick={() => live && addToCart(live.id)}
                          className="flex-1 border-2 border-[#ff8a65] bg-[#ffb199] text-[#4f4550] font-display font-extrabold rounded-xl py-2 cursor-pointer text-[12.5px] text-center hover:bg-[#ff8a65] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ffb199] disabled:hover:text-[#4f4550]"
                          aria-label={live ? `Add ${name} to cart` : `${name} unavailable`}
                        >
                          {live ? 'Add 🎀' : 'Unavailable'}
                        </button>
                        <button
                          /* Pins our own product page when the pick still
                             resolves to a live product, and only falls back to
                             the merchant link when it does not — /p/<id> would
                             404 for a pick whose product has left the feed, and
                             a pin to a 404 is worse than an affiliate pin. */
                          onClick={() => openPin({
                            id: pick.id, name, vendor: pick.vendor, cat: pick.cat, price, image,
                            url: live?.url || pick.url,
                            domain: live?.domain,
                            pinUrl: live ? `${window.location.origin}/p/${live.id}` : undefined,
                          })}
                          className="flex-none border-2 border-[#e60023] bg-white text-[#e60023] rounded-xl w-9 cursor-pointer text-[14px] flex items-center justify-center hover:bg-[#e60023] hover:text-white transition-colors"
                          aria-label={`Pin ${name} to Pinterest`}
                          title="Share this to Pinterest"
                        >
                          📌
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <MascotArrow direction="next" show={canNext} onClick={next} />
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * The carousel control for Ada's Picks: our own mascots, holding an arrow.
 *
 * It replaced a plain circular chevron, and the reason is that the rail had a
 * scrollbar doing the work of saying "there is more over here" — which is a
 * thin, grey, easily-missed thing on a page that is neither. The cat leads on
 * the left and the panda on the right, in the same order they sit in the logo,
 * with the arrow on the outside of each so the direction reads outward.
 *
 * Bigger than the chevron on purpose: this is the affordance now, so it has to
 * be visible at a glance and comfortable on a thumb.
 */
function MascotArrow({
  direction,
  show,
  onClick,
}: {
  direction: 'prev' | 'next'
  show: boolean
  onClick: () => void
}) {
  const isPrev = direction === 'prev'
  return (
    <button
      onClick={onClick}
      aria-label={isPrev ? 'Scroll picks left' : 'Scroll picks right'}
      title={isPrev ? 'Back' : 'More picks'}
      className={[
        'absolute top-1/2 -translate-y-1/2 z-30 flex items-center gap-0.5',
        'bg-white border-[3px] border-[#b79cff] rounded-full py-1 cursor-pointer',
        'shadow-[0_6px_16px_rgba(183,156,255,.42)] transition-all',
        'hover:bg-[#b79cff] hover:scale-105 group',
        isPrev ? 'left-0 -translate-x-1/4 pl-1.5 pr-2' : 'right-0 translate-x-1/4 pl-2 pr-1.5',
        show ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
    >
      {isPrev && (
        <span className="text-[22px] leading-none font-black text-[#b79cff] group-hover:text-white -mt-0.5">‹</span>
      )}
      <span className="block w-[34px] h-[34px]" aria-hidden="true">
        {isPrev ? <CatMark size={34} /> : <PandaMark size={34} />}
      </span>
      {!isPrev && (
        <span className="text-[22px] leading-none font-black text-[#b79cff] group-hover:text-white -mt-0.5">›</span>
      )}
    </button>
  )
}
