'use client'
import React, { createContext, useContext, useReducer, useEffect } from 'react'
import type { Product, AdaPick } from './data'
import { DEFAULT_ADA_PICKS, affiliateUrl, couponWrapUrl } from './data'

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
  adaPicks: AdaPick[]
}

type Action =
  | { type: 'ADD_TO_CART'; productId: string; variantIndex: number }
  | { type: 'REMOVE_FROM_CART'; productId: string; variantIndex: number }
  | { type: 'SET_QTY'; productId: string; variantIndex: number; qty: number }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_WISH'; productId: string }
  | { type: 'SET_ADA_MODE'; on: boolean }
  | { type: 'SET_ADA_AUTHORIZED'; on: boolean }
  | { type: 'TOGGLE_ADA_PICK'; pick: AdaPick }
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
    case 'TOGGLE_ADA_PICK': {
      const exists = state.adaPicks.some((x) => x.id === action.pick.id)
      return {
        ...state,
        adaPicks: exists
          ? state.adaPicks.filter((x) => x.id !== action.pick.id)
          : [...state.adaPicks, action.pick],
      }
    }
    case 'LOAD': return { ...state, ...action.state }
    default: return state
  }
}

const defaultState: State = { cart: [], wish: [], adaMode: false, adaAuthorized: false, adaPicks: DEFAULT_ADA_PICKS }

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
      const storedPicks = localStorage.getItem('wc_ada_picks_v2')
      const adaPicks: AdaPick[] = storedPicks ? JSON.parse(storedPicks) : DEFAULT_ADA_PICKS
      dispatch({ type: 'LOAD', state: { cart, wish, adaAuthorized, adaMode: adaAuthorized && !adaModeOff, adaPicks } })
    } catch { /* ignore */ }
  }, [])

  // Persist cart + wish + ada picks + ada mode preference
  useEffect(() => {
    try { localStorage.setItem('wc_cart', JSON.stringify(state.cart)) } catch { /* ignore */ }
  }, [state.cart])
  useEffect(() => {
    try { localStorage.setItem('wc_wish', JSON.stringify(state.wish)) } catch { /* ignore */ }
  }, [state.wish])
  useEffect(() => {
    try { localStorage.setItem('wc_ada_picks_v2', JSON.stringify(state.adaPicks)) } catch { /* ignore */ }
  }, [state.adaPicks])
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


