'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { catEmoji, money, type Product } from '@/lib/data'
import { pinProduct } from '@/lib/pinterest'
import ProductImage from './ProductImage'

/**
 * Showcase card for BRKOX, with a 3-D flip ported from the Greek Glass page on
 * Legal-Leaf (`.gcard` / `.gcard-inner` / `.gface`).
 *
 * Why this exists instead of reusing ProductCard: on mobile ProductCard is a
 * horizontal row with a 130px thumbnail beside the text. That works for a
 * plushie you recognise instantly, but these are wall frames whose whole appeal
 * is the composition — at 130px you cannot tell a Millennium Falcon frame from
 * an X-Wing one. So the photo gets the full width and most of the height, the
 * details sit underneath, and everything that does not fit moves to the back.
 *
 * The image is `object-contain`, not `cover`: cropping a display frame cuts off
 * the frame, which is the product.
 */
export default function BrkoxCard({
  product: p,
  isAdaMode,
  priority = false,
}: {
  product: Product
  isAdaMode?: boolean
  /** Set on the first rows — visible without scrolling. */
  priority?: boolean
}) {
  const { state, dispatch } = useStore()
  const [flipped, setFlipped] = useState(false)
  const [variantIndex, setVariantIndex] = useState(0)
  const [justAdded, setJustAdded] = useState(false)

  const variant = p.variants[variantIndex] ?? null
  const price = variant ? variant.price : p.price
  const inWish = state.wish.includes(p.id)
  const hasVariants = p.variants.length > 1

  function addToCart(e: React.MouseEvent) {
    e.stopPropagation() // never flip while adding
    dispatch({ type: 'ADD_TO_CART', productId: p.id, variantIndex })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  function toggleWish(e: React.MouseEvent) {
    e.stopPropagation()
    dispatch({ type: 'TOGGLE_WISH', productId: p.id })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // The card is a button for keyboard users too, but Space must not scroll.
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setFlipped((f) => !f)
    }
  }

  const actionsBar = (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t-2 border-[#f3ecff] bg-[#fffaf0]">
      <span className="font-display font-extrabold text-[11.5px] text-[#b79cff] select-none whitespace-nowrap">
        ↻ Tap to flip
      </span>
      <button
        onClick={addToCart}
        className={`font-display font-extrabold text-[12.5px] text-white rounded-[12px] px-3.5 py-2 cursor-pointer whitespace-nowrap transition-colors ${
          justAdded ? 'bg-[#4bbf7a]' : 'bg-gradient-to-r from-[#b79cff] to-[#ff8a65] hover:opacity-90'
        }`}
      >
        {justAdded ? '✓ Added' : '＋ Add'}
      </button>
    </div>
  )

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${p.name}. Activate to see details.`}
      aria-pressed={flipped}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={onKeyDown}
      className="[perspective:1600px] h-[520px] sm:h-[480px] cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#b79cff] rounded-[22px]"
    >
      <div
        className="relative w-full h-full [transform-style:preserve-3d] transition-transform duration-[600ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* ---------- FRONT ---------- */}
        <div className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] bg-white rounded-[22px] border-[3px] border-[#e6dcff] overflow-hidden flex flex-col shadow-[0_8px_24px_rgba(255,138,101,.16)]">
          <div className="relative flex-1 min-h-0 bg-gradient-to-br from-[#f5efff] to-[#ffe9e0]">
            <ProductImage
              src={p.image}
              alt={p.name}
              fallback={catEmoji(p.cat)}
              className="w-full h-full object-contain p-3"
              fallbackClassName="absolute inset-0 flex items-center justify-center text-[80px]"
              // Taller card, and object-contain shows the whole frame, so this
              // one earns a larger step than the square grid cards.
              width={600}
              priority={priority}
            />

            {p.onSale && p.discountPct > 0 && !flipped && (
              <span className="absolute top-2.5 left-2.5 bg-[#e0227a] text-white border-[3px] border-white rounded-full font-display font-extrabold text-[12.5px] px-3.5 py-1.5 z-20 shadow-[0_4px_12px_rgba(224,34,122,.5)]">
                -{p.discountPct}% OFF
              </span>
            )}

            <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-30">
              <button
                onClick={toggleWish}
                aria-label={inWish ? 'Remove from My Board' : 'Save to My Board'}
                className={`border-2 border-[#ff5a7a] ${inWish ? 'bg-[#ff5a7a] text-white' : 'bg-white text-[#ff5a7a]'} rounded-full w-[34px] h-[34px] cursor-pointer text-[15px] flex items-center justify-center shadow-[0_4px_12px_rgba(255,138,101,.18)]`}
              >
                {inWish ? '♥' : '♡'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); pinProduct(p) }}
                aria-label={`Pin ${p.name} to Pinterest`}
                className="border-2 border-[#e60023] bg-white text-[#e60023] rounded-full w-[34px] h-[34px] cursor-pointer text-[15px] flex items-center justify-center shadow-[0_4px_12px_rgba(255,138,101,.18)] hover:bg-[#e60023] hover:text-white transition-colors"
              >
                📌
              </button>
            </div>
          </div>

          {/* Details under the photo */}
          <div className="px-3.5 pt-2.5 pb-1.5 text-center">
            <div className="text-[10px] font-extrabold uppercase tracking-[.7px] text-[#b79cff]">{p.vendor}</div>
            <h3 className="font-display text-[14.5px] text-[#4f4550] leading-tight mt-0.5 line-clamp-2">{p.name}</h3>
            <div className="font-display text-[20px] text-[#ff8a65] mt-1">
              {hasVariants && <span className="text-[13px] font-bold mr-0.5">from</span>}
              {money(price)}
              {p.onSale && p.wasPrice > 0 && (
                <span className="font-sans text-[13px] text-[#9a8fa3] line-through ml-2">{money(p.wasPrice)}</span>
              )}
            </div>
          </div>

          {actionsBar}
        </div>

        {/* ---------- BACK ---------- */}
        <div className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] bg-white rounded-[22px] border-[3px] border-[#b79cff] overflow-hidden flex flex-col shadow-[0_8px_24px_rgba(255,138,101,.16)]">
          <div className="px-4 pt-4 pb-2.5 border-b-2 border-[#f3ecff]">
            <h3 className="font-display font-extrabold text-[15px] text-[#4f4550] leading-snug text-center">{p.name}</h3>
          </div>

          <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
            <p className="text-[13px] text-[#6f6473] leading-relaxed text-center">
              {p.blurb?.trim() || 'A made-to-fit display piece from BRKOX. Full specs and sizing live on their site.'}
            </p>

            {hasVariants && (
              <div className="relative mt-4" onClick={(e) => e.stopPropagation()}>
                <select
                  value={variantIndex}
                  onChange={(e) => setVariantIndex(Number(e.target.value))}
                  aria-label="Choose an option"
                  className="w-full appearance-none border-[2.5px] border-[#b79cff] rounded-[14px] px-3.5 py-2.5 pr-9 font-sans font-extrabold bg-[#e6dcff] cursor-pointer text-[#4f4550] text-[13px] focus:outline-none focus:border-[#ff8a65]"
                >
                  {p.variants.map((v, i) => (
                    <option key={v.id} value={i}>
                      {v.title || 'Standard'} — {money(v.price)}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] text-[#b79cff] font-black">▾</span>
                <span className="absolute left-3 -top-2 bg-white px-1.5 font-display text-[9px] font-extrabold tracking-[.5px] uppercase text-[#b79cff] rounded-md">choose</span>
              </div>
            )}

            <div className="flex gap-1.5 flex-wrap justify-center mt-4">
              <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full bg-[#fffaf0] text-[#9a8fa3]">{p.cat}</span>
              {isAdaMode && (
                <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full bg-[#e6dcff] text-[#4f4550]">{p.id}</span>
              )}
            </div>
          </div>

          {actionsBar}
        </div>
      </div>
    </div>
  )
}
