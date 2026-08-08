'use client'
import { useState, useMemo } from 'react'
import { CATEGORIES, catEmoji, money, type Product } from '@/lib/data'
import { pinProduct } from '@/lib/pinterest'
import { useStore } from '@/lib/store'
import { useCarousel } from '@/hooks/useCarousel'
import ProductImage from './ProductImage'

type Props = { products: Product[]; excludedIds?: Set<string> }

export default function FeaturedCollection({ products, excludedIds }: Props) {
  const [selectedCat, setSelectedCat] = useState('plush')
  const [seed, setSeed] = useState(() => Math.random())
  const { dispatch } = useStore()
  const { ref, canPrev, canNext, prev, next, update } = useCarousel<HTMLDivElement>()

  // Excluded products are never promoted here — the Featured carousel has no
  // restore control, so hidden items must not surface (even for the admin).
  const visible = useMemo(
    () => (excludedIds?.size ? products.filter((p) => !excludedIds.has(p.id)) : products),
    [products, excludedIds]
  )

  // Only categories that actually have products (image-having) show in the menu
  const availableCats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of visible) if (p.image) counts[p.cat] = (counts[p.cat] || 0) + 1
    return CATEGORIES.filter((c) => counts[c.key])
  }, [visible])

  const featured = useMemo(() => {
    const pool = visible.filter((p) => p.cat === selectedCat && p.image)
    // Deterministic shuffle keyed by seed
    return [...pool]
      .sort((a, b) => hashStr(a.id + seed) - hashStr(b.id + seed))
      .slice(0, 16)
  }, [visible, selectedCat, seed])

  function shuffle() { setSeed(Math.random()); requestAnimationFrame(update) }

  function addToCart(id: string) {
    dispatch({ type: 'ADD_TO_CART', productId: id, variantIndex: 0 })
  }

  return (
    <section className="py-4 pb-2 bg-[rgba(255,250,240,.78)]" aria-label="Featured Collection">
      <div className="max-w-[1180px] mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-2xl bg-gradient-to-br from-[#bfe3ea] to-[#c9ecd2] flex items-center justify-center text-2xl shadow-[0_4px_12px_rgba(255,138,101,.18)] border-2 border-white" aria-hidden="true">
              ✨
            </div>
            <div>
              <h2 className="font-display font-extrabold text-[25px] text-[#4f4550] leading-none">Featured Collection</h2>
              <small className="font-bold text-[#9a8fa3] text-[12.5px]">Fresh picks, shuffled for you</small>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={selectedCat}
                onChange={(e) => { setSelectedCat(e.target.value); setSeed(Math.random()) }}
                className="appearance-none border-[2.5px] border-[#7fc4d4] rounded-full px-3.5 py-[9px] pr-9 font-display font-extrabold bg-white text-[#4f4550] cursor-pointer text-[13px] min-w-[160px] focus:outline-none"
                aria-label="Select category for featured collection"
              >
                {(availableCats.length ? availableCats : CATEGORIES).map((c) => (
                  <option key={c.key} value={c.key}>{c.emoji} {c.name}</option>
                ))}
              </select>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#7fc4d4] font-black">▾</span>
            </div>
            <button
              onClick={shuffle}
              className="border-[2.5px] border-[#ff8a65] bg-[#ffb199] text-[#4f4550] font-display font-extrabold px-3.5 py-2 rounded-full cursor-pointer text-[13px] shadow-[0_4px_12px_rgba(255,138,101,.18)] active:translate-y-0.5 hover:bg-[#ff8a65] hover:text-white transition-colors"
              aria-label="Shuffle featured products"
            >
              🔀 Shuffle
            </button>
          </div>
        </div>

        {featured.length === 0 ? (
          <p className="text-[#9a8fa3] font-bold py-3.5 px-1">No items in this category yet. 🌸</p>
        ) : (
          <div className="relative">
            {/* Prev arrow */}
            <CarouselArrow direction="prev" show={canPrev} onClick={prev} />
            {/* Rail */}
            <div
              ref={ref}
              className="flex gap-4 overflow-x-auto pb-3.5 pt-1.5 featured-rail scroll-smooth"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {featured.map((p) => (
                <div
                  key={p.id}
                  className="flex-[0_0_205px] bg-white border-[3px] border-[#7fc4d4] rounded-[20px] overflow-hidden shadow-[0_4px_12px_rgba(255,138,101,.18)] flex flex-col relative"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  {p.onSale && p.discountPct > 0 && (
                    <span className="absolute top-2 left-2 bg-[#e0227a] text-white border-2 border-white rounded-full font-display font-extrabold text-[10px] px-2 py-[3px] z-20">
                      -{p.discountPct}%
                    </span>
                  )}
                  <div className="aspect-square bg-gradient-to-br from-[#bfe3ea] to-[#c9ecd2] flex items-center justify-center overflow-hidden relative">
                    <ProductImage
                      src={p.image}
                      alt={p.name}
                      fallback={catEmoji(p.cat)}
                      className="w-full h-full object-cover"
                      width={400}
                    />
                  </div>
                  <div className="p-2.5 px-3 flex flex-col gap-1.5 flex-1">
                    <div className="text-[9.5px] font-extrabold uppercase tracking-[.6px] text-[#7fc4d4]">{p.vendor}</div>
                    <div className="font-display font-extrabold text-[14px] leading-tight line-clamp-2">{p.name}</div>
                    <div className="font-display text-[#ff8a65] text-[16px]">{money(p.price)}</div>
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => addToCart(p.id)}
                        className="flex-1 border-2 border-[#ff8a65] bg-[#ffb199] text-[#4f4550] font-display font-extrabold rounded-xl py-2 cursor-pointer text-[12.5px] text-center hover:bg-[#ff8a65] hover:text-white transition-colors"
                        aria-label={`Add ${p.name} to cart`}
                      >
                        Add 🛒
                      </button>
                      <button
                        onClick={() => pinProduct(p)}
                        className="flex-none border-2 border-[#e60023] bg-white text-[#e60023] rounded-xl w-9 cursor-pointer text-[14px] flex items-center justify-center hover:bg-[#e60023] hover:text-white transition-colors"
                        aria-label={`Pin ${p.name} to Pinterest`}
                        title="Share this to Pinterest"
                      >
                        📌
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Next arrow */}
            <CarouselArrow direction="next" show={canNext} onClick={next} />
          </div>
        )}
      </div>
    </section>
  )
}

export function CarouselArrow({ direction, show, onClick }: { direction: 'prev' | 'next'; show: boolean; onClick: () => void }) {
  const isPrev = direction === 'prev'
  return (
    <button
      onClick={onClick}
      aria-label={isPrev ? 'Scroll left' : 'Scroll right'}
      className={[
        'absolute top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white border-[3px] border-[#ff8a65] text-[#ff8a65] shadow-[0_6px_16px_rgba(255,138,101,.32)]',
        'flex items-center justify-center text-xl font-black cursor-pointer transition-all hover:bg-[#ff8a65] hover:text-white',
        isPrev ? 'left-0 -translate-x-1/4' : 'right-0 translate-x-1/4',
        show ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
    >
      {isPrev ? '���' : '›'}
    </button>
  )
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}
