'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { catEmoji, money, isNewItem, type Product } from '@/lib/data'
import { pinProduct } from '@/lib/pinterest'
import ProductImage from './ProductImage'

type Props = {
  product: Product
  /** True only when THIS card is an injected "Ada's Pick" feed card (gold glow + badge). */
  isFeedPick?: boolean
  /** True when the product is in Ada's picks — only drives the star toggle state in Ada Mode. */
  isPicked?: boolean
  /** True when the product is on the global store-exclusion kill-list. */
  isExcluded?: boolean
  isAdaMode?: boolean
  onTogglePick?: (p: Product) => void
  /** Ada-mode only: toggle this product on/off the live store. */
  onToggleExclude?: (p: Product, currentlyExcluded: boolean) => void
  /** Set on the first rows of the grid — those are visible without scrolling. */
  priority?: boolean
}

export default function ProductCard({ product: p, isFeedPick: isFeedPickProp, isPicked, isExcluded, isAdaMode, onTogglePick, onToggleExclude, priority = false }: Props) {
  const { state, dispatch } = useStore()
  const [selVariant, setSelVariant] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const variant = p.variants[selVariant] ?? null
  const price = variant ? variant.price : p.price
  const inWish = state.wish.includes(p.id)
  const isNew = isNewItem(p)
  const isFeedPick = isFeedPickProp ?? false

  function addToCart() {
    dispatch({ type: 'ADD_TO_CART', productId: p.id, variantIndex: selVariant })
  }

  function toggleWish(e: React.MouseEvent) {
    e.preventDefault()
    dispatch({ type: 'TOGGLE_WISH', productId: p.id })
  }

  const stickerEl = (() => {
    if (p.onSale && p.discountPct) return (
      <span className="absolute top-2.5 left-2.5 bg-[#e0227a] text-white border-[3px] border-white rounded-full font-display font-extrabold text-[13.5px] px-[15px] py-[7px] z-20 shadow-[0_4px_12px_rgba(224,34,122,.5)] whitespace-nowrap">
        -{p.discountPct}% OFF
      </span>
    )
    if (isFeedPick) return (
      <span className="absolute top-2.5 left-2.5 bg-gradient-to-r from-[#ffd451] to-[#ffb300] text-[#5a3c00] border-2 border-white rounded-full font-display font-extrabold text-[11px] px-3 py-[5px] z-20 shadow-[0_3px_10px_rgba(255,170,0,.5)]">
        🎀 pick
      </span>
    )
    if (p.badge) return (
      <span className="absolute top-2.5 left-2.5 bg-[#ffd873] border-2 border-white rounded-full font-display font-extrabold text-[11px] px-3 py-[5px] z-20 shadow-[0_4px_12px_rgba(255,138,101,.18)] max-w-[calc(100%-20px)] overflow-hidden text-ellipsis whitespace-nowrap">
        {p.badge}
      </span>
    )
    if (isNew) return (
      <span className="absolute top-2.5 left-2.5 bg-[#ffd873] border-2 border-white rounded-full font-display font-extrabold text-[11px] px-3 py-[5px] z-20 shadow-[0_4px_12px_rgba(255,138,101,.18)]">
        🆕 New
      </span>
    )
    return null
  })()

  return (
    <article
      className={`bg-white rounded-[24px] overflow-hidden flex flex-col relative transition-all duration-150 cursor-default
        ${isFeedPick
          ? 'border-[3px] border-[#ffcf3f] shadow-[0_0_0_2px_#ffe58a,0_0_18px_3px_rgba(255,193,7,.55),0_8px_24px_rgba(255,170,0,.28)] [animation:pickGlow_2.6s_ease-in-out_infinite]'
          : 'border-[3px] border-[#ffb199] shadow-[0_4px_12px_rgba(255,138,101,.18)]'}
        hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(255,138,101,.16)]
        sm:flex-col flex-row sm:border-[3px] border-2 sm:rounded-[24px] rounded-[18px]
        ${isExcluded ? 'opacity-60 grayscale-[.35] !border-[#e0227a]' : ''}`
      }
      aria-label={p.name}
    >
      {isExcluded && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-[#e0227a] text-white font-display font-extrabold text-[11px] tracking-wide text-center py-1 uppercase">
          Hidden from store
        </div>
      )}
      {/* Image area */}
      <div
        className={`relative flex items-center justify-center text-[80px] overflow-hidden
          ${isFeedPick
            ? 'bg-gradient-to-br from-[#fff2c2] to-[#e6dcff]'
            : 'bg-gradient-to-br from-[#ffb199] to-[#bfe3ea]'}
          aspect-[4/5] sm:aspect-[4/5] w-[130px] flex-[0_0_130px] sm:w-auto sm:flex-none`
        }
      >
        <ProductImage
          src={p.image}
          alt={p.name}
          fallback={catEmoji(p.cat)}
          className="w-full h-full object-cover"
          fallbackClassName="absolute inset-0 flex items-center justify-center text-[80px]"
          width={400}
          priority={priority}
        />
        {stickerEl}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-30">
          <button
            onClick={toggleWish}
            className={`border-2 border-[#ff5a7a] ${inWish ? 'bg-[#ff5a7a] text-white' : 'bg-white text-[#ff5a7a]'} rounded-full w-[34px] h-[34px] cursor-pointer text-[15px] shadow-[0_4px_12px_rgba(255,138,101,.18)] flex items-center justify-center`}
            aria-label={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
            title={inWish ? 'Remove from My Board' : 'Save to My Board'}
          >
            {inWish ? '♥' : '♡'}
          </button>
          <button
            onClick={() => pinProduct(p)}
            className="border-2 border-[#e60023] bg-white text-[#e60023] rounded-full w-[34px] h-[34px] cursor-pointer text-[15px] shadow-[0_4px_12px_rgba(255,138,101,.18)] flex items-center justify-center hover:bg-[#e60023] hover:text-white transition-colors"
            aria-label={`Pin ${p.name} to Pinterest`}
            title="Share this to Pinterest"
          >
            📌
          </button>
          {isAdaMode && onTogglePick && (
            <button
              onClick={() => onTogglePick(p)}
              className={`border-2 border-[#b79cff] ${isPicked ? 'bg-[#b79cff] text-white' : 'bg-white text-[#b79cff]'} rounded-full w-[34px] h-[34px] cursor-pointer text-[15px] flex items-center justify-center`}
              aria-label={isPicked ? "Remove from Ada's Picks" : "Add to Ada's Picks"}
              title={isPicked ? "Remove pick" : "Add to Ada's Picks"}
            >
              {isPicked ? '★' : '☆'}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 sm:px-3.5 sm:pb-3.5 flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[.7px] text-[#b79cff]">{p.vendor}</div>
        <h3 className="font-display text-[16.5px] sm:text-[16.5px] text-[14.5px] text-[#4f4550] leading-tight">{p.name}</h3>

        {p.blurb && (
          <div className="text-[12.5px] text-[#9a8fa3] leading-relaxed">
            <span className={expanded ? '' : 'line-clamp-2'}>{p.blurb}</span>
            {p.blurb.length > 80 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="bg-none border-none text-[#7fc4d4] font-extrabold text-xs cursor-pointer p-0 ml-1 hover:underline"
              >
                {expanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}

        {/* Variant selector */}
        {p.variants.length > 1 && (
          <div className="relative mt-0.5">
            <select
              value={selVariant}
              onChange={(e) => setSelVariant(Number(e.target.value))}
              className="w-full appearance-none border-[2.5px] border-[#b79cff] rounded-[14px] px-3.5 py-2.5 pr-9 font-sans font-extrabold bg-[#e6dcff] cursor-pointer text-[#4f4550] text-[13.5px] focus:outline-none focus:border-[#ff8a65]"
              aria-label="Choose variant"
            >
              {p.variants.map((v, i) => (
                <option key={v.id} value={i}>
                  {v.title} — {money(v.price)}
                </option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] text-[#b79cff] font-black">▾</span>
            <span className="absolute left-3 -top-2 bg-white px-1.5 font-display text-[9px] font-extrabold tracking-[.5px] uppercase text-[#b79cff] rounded-md">choose</span>
          </div>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
          <span className={`font-display text-[21px] ${p.onSale ? 'text-[#e0227a]' : 'text-[#ff8a65]'}`}>
            {p.unit && <span className="text-sm font-bold mr-0.5">{p.unit} </span>}
            {money(price)}
          </span>
          {p.onSale && p.wasPrice > 0 && (
            <span className="font-sans text-[13px] text-[#9a8fa3] line-through">{money(p.wasPrice)}</span>
          )}
        </div>

        {/* Coupon tag */}
        {p.couponCode && p.couponPct > 0 && (
          <div className="text-[10.5px] font-bold text-[#a3125c] bg-[#fff0f6] border-[1.5px] border-dashed border-[#e0227a] rounded-[10px] px-2 py-1 leading-tight mt-0.5 self-start">
            Extra <strong className="font-display">{p.couponPct}% off</strong> with code <strong className="font-display">{p.couponCode}</strong>
          </div>
        )}

        {/* Tags */}
        <div className="flex gap-1 flex-wrap mt-0.5">
          <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full bg-[#fffaf0] text-[#9a8fa3]">{p.cat}</span>
          {p.character && <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full text-white" style={{ background: '#b79cff' }}>{p.character}</span>}
        </div>

        {/* Add to cart */}
        <button
          type="button"
          onClick={addToCart}
          className="mt-auto border-[2.5px] border-[#ff8a65] bg-[#ffb199] text-[#4f4550] font-display font-extrabold px-2.5 py-2.5 rounded-[14px] cursor-pointer text-sm text-center hover:bg-[#ff8a65] hover:text-white transition-colors active:translate-y-0.5"
          aria-label={`Add ${p.name} to cart`}
        >
          Add to Cart 🛒
        </button>

        {/* Ada-mode only: big store exclusion control */}
        {isAdaMode && onToggleExclude && (
          <button
            onClick={() => onToggleExclude(p, !!isExcluded)}
            className={`mt-1 w-full border-[3px] font-display font-extrabold px-2.5 py-3 rounded-[14px] cursor-pointer text-[14px] text-center uppercase tracking-wide transition-colors active:translate-y-0.5
              ${isExcluded
                ? 'border-[#2e7d32] bg-[#c9ecd2] text-[#1b4d20] hover:bg-[#2e7d32] hover:text-white'
                : 'border-[#e0227a] bg-[#e0227a] text-white hover:bg-[#a3125c]'}`}
            aria-label={isExcluded ? `Restore ${p.name} to store` : `Exclude ${p.name} from store`}
          >
            {isExcluded ? '↩ Restore to Store' : '⛔ Exclude from Store'}
          </button>
        )}
      </div>
    </article>
  )
}
