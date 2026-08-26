'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { affiliateUrl, couponWrapUrl, type Product } from '@/lib/data'
import { pinProductPage } from '@/lib/pinterest'
import { track } from '@/lib/pinterest-track'
import { logEvent } from '@/lib/site-events'

/**
 * The interactive strip on a product page. A small client island so the page
 * itself stays a server component — there is nothing else on it that needs
 * hydrating.
 */
export default function ProductPageActions({ product: p }: { product: Product }) {
  const { state, dispatch } = useStore()
  const [added, setAdded] = useState(false)
  const inWish = state.wish.includes(p.id)

  const dest = couponWrapUrl(affiliateUrl(p.url || p.domain, p.vendor), p.vendor)

  function buy() {
    logEvent('outbound_click', { productId: p.id, vendor: p.vendor, cat: p.cat })
    track({
      event_name: 'custom',
      custom_data: {
        event_label: 'outbound_merchant_click',
        currency: 'USD',
        value: String(p.price),
        content_ids: [p.id],
        content_name: p.name,
        content_category: p.cat,
        content_brand: p.vendor,
        num_items: 1,
      },
    })
  }

  function addToCart() {
    logEvent('add_to_cart', { productId: p.id, vendor: p.vendor, cat: p.cat })
    dispatch({ type: 'ADD_TO_CART', productId: p.id, variantIndex: 0 })
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <div className="flex flex-col gap-2 mt-1">
      <a
        href={dest}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        onClick={buy}
        className="border-[3px] border-[#ff8a65] bg-[#ff8a65] text-white font-display font-extrabold px-4 py-3.5 rounded-[16px] text-center text-[16px] hover:opacity-90 transition-opacity"
      >
        Buy at {p.vendor} →
      </a>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addToCart}
          className={`flex-1 border-[2.5px] font-display font-extrabold px-3 py-2.5 rounded-[14px] cursor-pointer text-[14px] transition-colors
            ${added ? 'border-[#2e7d32] bg-[#c9ecd2] text-[#1b4d20]' : 'border-[#ff8a65] bg-[#ffb199] text-[#4f4550] hover:bg-[#ff8a65] hover:text-white'}`}
        >
          {added ? 'Added ✓' : 'Add to Cart 🛒'}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_WISH', productId: p.id })}
          className={`border-[2.5px] border-[#ff5a7a] ${inWish ? 'bg-[#ff5a7a] text-white' : 'bg-white text-[#ff5a7a]'} rounded-[14px] w-[52px] cursor-pointer text-[19px] flex items-center justify-center`}
          aria-label={inWish ? 'Remove from My Board' : 'Save to My Board'}
        >
          {inWish ? '♥' : '♡'}
        </button>
        {/* Pins THIS page, not the merchant link — see pinProductPage(). */}
        <button
          type="button"
          onClick={() => { logEvent('pin_click', { productId: p.id, vendor: p.vendor, cat: p.cat }); pinProductPage(p) }}
          className="border-[2.5px] border-[#e60023] bg-white text-[#e60023] rounded-[14px] w-[52px] cursor-pointer text-[19px] flex items-center justify-center hover:bg-[#e60023] hover:text-white transition-colors"
          aria-label={`Pin ${p.name} to Pinterest`}
          title="Pin this"
        >
          📌
        </button>
      </div>
    </div>
  )
}
