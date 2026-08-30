'use client'
import { useEffect, useRef, useState } from 'react'

import { cartCount, useStore } from '@/lib/store'
import { logEvent } from '@/lib/site-events'
import { CartIcon } from '@/components/Icons'
import type { Product } from '@/lib/data'

/**
 * The bottom-right cart bubble, and the confirmation that fires with it.
 *
 * -----------------------------------------------------------------------------
 * WHY BOTH LIVE IN ONE COMPONENT
 *
 * They are one thing to a visitor: you press Add, something tells you it
 * worked, and the place it went is right there under it. Splitting them would
 * mean two components agreeing on a corner, a z-index and a stacking order, and
 * the toast would still have to point at the bubble.
 *
 * The header pill stays exactly as it is. This is not a replacement for it: the
 * pill is where you look when you are looking, and this is what catches your
 * eye when you are not. On a phone the header scrolls away entirely, which is
 * the case that actually needed solving.
 *
 * -----------------------------------------------------------------------------
 * THE CONFIRMATION IS DRIVEN BY THE STORE, NOT BY A CALLBACK
 *
 * `state.lastAdd` is written by the reducer, so every ADD_TO_CART in the app
 * raises this toast without a single call site opting in. That is the same
 * argument the conversion call in StoreProvider makes, and it is the same
 * reason: eight components that add to a cart are eight chances for the ninth
 * to be forgotten.
 *
 * Watching `state.cart` instead would have been the obvious way and the wrong
 * one. It fires on the localStorage LOAD, so every page refresh with something
 * in the cart would announce "added to cart" for something you added yesterday,
 * and it would MISS a repeat add of the same product, where the line just
 * increments.
 */

const SHOW_MS = 3200

export default function FloatingCart({
  products,
  onOpen,
  tone = 'kawaii',
}: {
  /** Used only to name the added product in the toast. Missing is fine. */
  products: Product[]
  onOpen: () => void
  tone?: 'kawaii' | 'decora'
}) {
  const { state } = useStore()
  const count = cartCount(state.cart)

  const [toast, setToast] = useState<{ name: string; at: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const add = state.lastAdd
    if (!add) return
    // Named from the catalogue rather than from the action, so no call site has
    // to pass anything. "Added to cart" with no name is still a real
    // confirmation, which is what makes that safe.
    const named = products.find((p) => p.id === add.productId)?.name || ''
    setToast({ name: named, at: add.at })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), SHOW_MS)
    return () => { if (timer.current) clearTimeout(timer.current) }
    // `at` alone: a repeat add of the same product changes nothing else, and
    // re-running on `products` would re-open a dismissed toast when the live
    // catalogue lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastAdd?.at])

  const skin =
    tone === 'decora'
      ? {
          bubble: 'border-white bg-[#8b3dff] text-white hover:bg-[#ff2d92]',
          badge: 'bg-[#25e0e8] text-[#12071f] border-white',
          toast: 'border-[#ff2d92] bg-[#1d0d33] text-white',
          toastNote: 'text-[#c9b4e8]',
          link: 'text-[#25e0e8]',
        }
      : {
          bubble: 'border-white bg-[#ff5a7a] text-white hover:bg-[#ff8a65]',
          badge: 'bg-[#7fc4d4] text-white border-white',
          toast: 'border-[#ffb199] bg-white text-[#4f4550]',
          toastNote: 'text-[#9a8fa3]',
          link: 'text-[#e05a7a]',
        }

  return (
    <div className="fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:right-6 sm:bottom-6">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`max-w-[76vw] sm:max-w-[320px] rounded-[18px] border-[3px] ${skin.toast} px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,.28)]`}
        >
          <p className="font-display text-[14px] font-extrabold leading-tight">Added to cart</p>
          {toast.name && (
            <p className={`mt-0.5 line-clamp-2 text-[12.5px] font-semibold ${skin.toastNote}`}>
              {toast.name}
            </p>
          )}
          <button
            type="button"
            onClick={() => { setToast(null); logEvent('cart_open', { meta: 'toast' }); onOpen() }}
            className={`mt-1.5 font-display text-[12.5px] font-extrabold underline ${skin.link}`}
          >
            View cart
          </button>
        </div>
      )}

      {/*
        Hidden at zero, deliberately. An empty cart bubble is a permanent piece
        of furniture that says nothing; it should appear when there is something
        in it and mean something when it does.
      */}
      {count > 0 && (
        <button
          type="button"
          onClick={() => { logEvent('cart_open', { meta: 'floating' }); onOpen() }}
          aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`}
          className={`relative inline-flex h-[58px] w-[58px] items-center justify-center rounded-full border-[3px] ${skin.bubble} shadow-[0_8px_24px_rgba(0,0,0,.3)] transition-colors`}
        >
          <CartIcon />
          <span
            className={`absolute -right-1 -top-1 inline-flex h-[24px] min-w-[24px] items-center justify-center rounded-full border-2 px-1 font-display text-[12px] font-extrabold ${skin.badge}`}
          >
            {count > 99 ? '99+' : count}
          </span>
        </button>
      )}
    </div>
  )
}
