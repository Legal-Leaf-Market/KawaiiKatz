'use client'
import React, { createContext, useContext, useReducer, useEffect } from 'react'
import type { Product } from './data'
import { affiliateUrl, couponWrapUrl } from './data'

export type CartItem = {
  productId: string
  variantIndex: number
  qty: number
}

type State = {
  cart: CartItem[]
  wish: string[] // product ids
  adaMode: boolean
  adaAuthorized: boolean
}

/**
 * Ada's Picks are NOT in this store, and that is the fix rather than an
 * omission. They lived here as `adaPicks`, persisted by the effect below to
 * localStorage, and went nowhere else — so a pick Ada starred was saved to that
 * one browser and every visitor saw the hardcoded DEFAULT_ADA_PICKS instead.
 * The curator UI gave no sign of it.
 *
 * They are editorial state shared by everyone, not per-visitor state like the
 * cart and the wishlist, so they belong on the server: hooks/usePicks.ts,
 * backed by /api/picks and the store_picks table.
 */

type Action =
  | { type: 'ADD_TO_CART'; productId: string; variantIndex: number }
  | { type: 'REMOVE_FROM_CART'; productId: string; variantIndex: number }
  | { type: 'SET_QTY'; productId: string; variantIndex: number; qty: number }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_WISH'; productId: string }
  | { type: 'SET_ADA_MODE'; on: boolean }
  | { type: 'SET_ADA_AUTHORIZED'; on: boolean }
  | { type: 'LOAD'; state: Partial<State> }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const key = `${action.productId}::${action.variantIndex}`
      const existing = state.cart.find((i) => `${i.productId}::${i.variantIndex}` === key)
      if (existing) {
        return { ...state, cart: state.cart.map((i) => `${i.productId}::${i.variantIndex}` === key ? { ...i, qty: i.qty + 1 } : i) }
      }
      return { ...state, cart: [...state.cart, { productId: action.productId, variantIndex: action.variantIndex, qty: 1 }] }
    }
    case 'REMOVE_FROM_CART': {
      const key = `${action.productId}::${action.variantIndex}`
      return { ...state, cart: state.cart.filter((i) => `${i.productId}::${i.variantIndex}` !== key) }
    }
    case 'SET_QTY': {
      const key = `${action.productId}::${action.variantIndex}`
      if (action.qty <= 0) return { ...state, cart: state.cart.filter((i) => `${i.productId}::${i.variantIndex}` !== key) }
      return { ...state, cart: state.cart.map((i) => `${i.productId}::${i.variantIndex}` === key ? { ...i, qty: action.qty } : i) }
    }
    case 'CLEAR_CART': return { ...state, cart: [] }
    case 'TOGGLE_WISH': {
      const has = state.wish.includes(action.productId)
      return { ...state, wish: has ? state.wish.filter((id) => id !== action.productId) : [...state.wish, action.productId] }
    }
    case 'SET_ADA_MODE': return { ...state, adaMode: action.on }
    case 'SET_ADA_AUTHORIZED': return { ...state, adaAuthorized: action.on }
    case 'LOAD': return { ...state, ...action.state }
    default: return state
  }
}

const defaultState: State = { cart: [], wish: [], adaMode: false, adaAuthorized: false }

const StoreCtx = createContext<{ state: State; dispatch: React.Dispatch<Action> }>({ state: defaultState, dispatch: () => {} })

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const cart = JSON.parse(localStorage.getItem('wc_cart') || '[]')
      const wish = JSON.parse(localStorage.getItem('wc_wish') || '[]')
      const adaAuthorized = localStorage.getItem('wc_ada_authorized') === '1'
      const adaModeOff = localStorage.getItem('wc_ada_mode_off') === '1'
      // wc_ada_picks_v2 is deliberately NOT read back. It is left in place so
      // usePicks() can offer to publish anything stranded in it; see the note
      // there. Reading it here would restore the browser-local list and put the
      // old bug straight back.
      dispatch({ type: 'LOAD', state: { cart, wish, adaAuthorized, adaMode: adaAuthorized && !adaModeOff } })
    } catch { /* ignore */ }
  }, [])

  // Reconcile Ada authorization against the server. localStorage is only a UI
  // hint; the httpOnly session cookie is the truth and expires independently of
  // it. Without this a stale flag leaves the curator UI switched on while every
  // write silently 401s, which reads as "the app is broken".
  //
  // Only runs when the client already believes it is authorized, so ordinary
  // visitors never pay for the request.
  useEffect(() => {
    let cancelled = false
    try {
      if (localStorage.getItem('wc_ada_authorized') !== '1') return
    } catch { return }

    fetch('/api/ada-login', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { authorized?: boolean } | null) => {
        if (cancelled || !data) return
        if (data.authorized) return // session still good; nothing to correct
        dispatch({ type: 'SET_ADA_AUTHORIZED', on: false })
        dispatch({ type: 'SET_ADA_MODE', on: false })
        try { localStorage.removeItem('wc_ada_authorized') } catch { /* ignore */ }
      })
      .catch(() => { /* offline: leave the optimistic state alone */ })

    return () => { cancelled = true }
  }, [])

  // Persist cart + wish + ada mode preference. Picks are server-side now.
  useEffect(() => {
    try { localStorage.setItem('wc_cart', JSON.stringify(state.cart)) } catch { /* ignore */ }
  }, [state.cart])
  useEffect(() => {
    try { localStorage.setItem('wc_wish', JSON.stringify(state.wish)) } catch { /* ignore */ }
  }, [state.wish])
  useEffect(() => {
    try {
      if (state.adaAuthorized) {
        if (state.adaMode) localStorage.removeItem('wc_ada_mode_off')
        else localStorage.setItem('wc_ada_mode_off', '1')
      }
    } catch { /* ignore */ }
  }, [state.adaMode, state.adaAuthorized])

  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>
}

export function useStore() { return useContext(StoreCtx) }

export function cartTotal(cart: CartItem[], products: Product[]): number {
  return cart.reduce((sum, item) => {
    const p = products.find((x) => x.id === item.productId)
    if (!p) return sum
    const price = item.variantIndex >= 0 && p.variants[item.variantIndex]
      ? p.variants[item.variantIndex].price
      : p.price
    return sum + price * item.qty
  }, 0)
}

export function cartCount(cart: CartItem[]): number {
  return cart.reduce((n, i) => n + i.qty, 0)
}

export function groupCartByVendor(cart: CartItem[], products: Product[]) {
  const groups: Record<string, { product: Product; item: CartItem }[]> = {}
  for (const item of cart) {
    const p = products.find((x) => x.id === item.productId)
    if (!p) continue
    if (!groups[p.vendor]) groups[p.vendor] = []
    groups[p.vendor].push({ product: p, item })
  }
  return groups
}

/**
 * Build the vendor's own add-to-cart permalink for a group of cart lines, with
 * affiliate tracking (?ref=…) and any coupon wrap applied. This is an affiliate
 * storefront — checkout hands off to each vendor's real cart, it never happens
 * on this site. Mirrors the original vendorCheckoutUrl:
 *   base    = domain/cart/<variantId>:<qty>,<variantId>:<qty>
 *   +ref    = affiliateUrl(base, vendor)   -> …/cart/…?ref=kawaiikatz
 *   +coupon = couponWrapUrl(…)             -> domain/discount/CODE?redirect=…
 * When variant IDs are unavailable it falls back to the product URL (still
 * carrying the affiliate ref) so the link is never broken.
 */
export function checkoutUrlForVendor(items: { product: Product; item: CartItem }[]): string {
  let domain = ''
  let fallback = ''
  let vendor = ''
  let missing = false
  const parts: string[] = []
  for (const { product, item } of items) {
    domain = product.domain
    fallback = product.url || product.domain
    vendor = product.vendor
    const variant =
      (item.variantIndex >= 0 && product.variants[item.variantIndex]) ||
      product.variants.find((v) => v.available) ||
      product.variants[0]
    const vid = variant?.id ? String(variant.id) : ''
    if (vid && domain) parts.push(`${vid}:${item.qty}`)
    else missing = true
  }
  const base = domain && parts.length && !missing ? `${domain}/cart/${parts.join(',')}` : fallback
  return couponWrapUrl(affiliateUrl(base, vendor), vendor)
}


