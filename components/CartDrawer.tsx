'use client'
import { useState } from 'react'
import { useStore, cartTotal, groupCartByVendor, checkoutUrlForVendor, type CartItem } from '@/lib/store'
import { track } from '@/lib/pinterest-track'
import { logEvent } from '@/lib/site-events'
import { catEmoji, money, type Product } from '@/lib/data'

type Props = {
  open: boolean
  onClose: () => void
  products: Product[]
}

export default function CartDrawer({ open, onClose, products }: Props) {
  const { state, dispatch } = useStore()
  const { cart } = state

  // Track which vendor carts have been opened so the button reads "Reopen".
  const [opened, setOpened] = useState<Record<string, boolean>>({})

  const groups = groupCartByVendor(cart, products)
  const vendors = Object.keys(groups)
  const total = cartTotal(cart, products)

  function setQty(productId: string, variantIndex: number, qty: number) {
    dispatch({ type: 'SET_QTY', productId, variantIndex, qty })
  }
  function remove(productId: string, variantIndex: number) {
    dispatch({ type: 'REMOVE_FROM_CART', productId, variantIndex })
  }
  function clearCart() {
    dispatch({ type: 'CLEAR_CART' })
  }

  // Hand off to the vendor's own cart with the item(s), affiliate ref, and any
  // coupon pre-applied. Opens in a new tab so the shopper keeps browsing here;
  // inside the v0/preview iframe a new tab is required, so we always target
  // _blank and fall back to a top-level navigation if the browser blocks it.
  function checkout(vendor: string) {
    const url = checkoutUrlForVendor(groups[vendor] ?? [])
    if (!url || url === '#') return
    setOpened((o) => ({ ...o, [vendor]: true }))

    /**
     * The click out to the merchant — the strongest signal this business model
     * produces, and the last thing we can observe. It goes as `custom`, never
     * as `checkout`: the sale happens on the vendor's domain under the vendor's
     * analytics, and we never learn whether it completed. `keepalive` on the
     * request is what lets it survive the navigation on the line below.
     */
    const lines = groups[vendor] ?? []
    logEvent('checkout_click', { vendor, meta: String(lines.length) })
    const priceOf = (l: { product: Product; item: CartItem }) =>
      l.product.variants[l.item.variantIndex]?.price ?? l.product.price
    track({
      event_name: 'custom',
      custom_data: {
        event_label: 'outbound_merchant_click',
        currency: 'USD',
        value: lines.reduce((n, l) => n + priceOf(l) * l.item.qty, 0).toFixed(2),
        content_brand: vendor,
        content_ids: lines.map((l) => l.product.id),
        num_items: lines.reduce((n, l) => n + l.item.qty, 0),
        contents: lines.map((l) => ({
          id: l.product.id,
          quantity: l.item.qty,
          item_price: String(priceOf(l)),
          item_name: l.product.name,
          item_category: l.product.cat,
          item_brand: vendor,
        })),
      },
    })
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    if (!win) {
      try {
        if (window.top) window.top.location.href = url
        else window.location.href = url
      } catch {
        window.location.href = url
      }
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-[rgba(79,69,80,.4)] z-50 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 w-[min(430px,92vw)] h-full bg-[#fffaf0] border-l-4 border-[#ffb199] z-60 flex flex-col transition-transform duration-[220ms] ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-[3px] border-[#ffb199]">
          <h2 className="font-display font-extrabold text-[20px] text-[#4f4550]">
            🛒 Your Cart
            {cart.length > 0 && (
              <span className="font-sans text-[12px] font-extrabold bg-[#7fc4d4] text-white rounded-full px-2.5 py-[2px] ml-1.5 align-middle">
                {cart.reduce((n, i) => n + i.qty, 0)}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="border-none bg-none text-[26px] cursor-pointer text-[#9a8fa3] leading-none"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 px-4 cart-body">
          {cart.length === 0 && (
            <div className="text-center text-[#9a8fa3] py-10 font-semibold">
              <div className="text-5xl mb-3">🛒</div>
              <p>Your cart is empty!</p>
              <p className="text-sm mt-1">Add some kawaii finds above.</p>
            </div>
          )}

          {vendors.map((vendor) => {
            const items = groups[vendor]
            const vendorTotal = items.reduce((sum, { product, item }) => {
              const price = item.variantIndex >= 0 && product.variants[item.variantIndex]
                ? product.variants[item.variantIndex].price
                : product.price
              return sum + price * item.qty
            }, 0)
            const coupon = items.map(({ product }) => product).find((p) => p.couponCode && p.couponPct > 0)
            const nItems = items.reduce((n, { item }) => n + item.qty, 0)
            const isOpened = !!opened[vendor]

            return (
              <div
                key={vendor}
                className={`border-[2.5px] rounded-[18px] mb-3.5 overflow-hidden bg-white ${isOpened ? 'border-[#6bc98a]' : 'border-[#ffb199]'}`}
              >
                {/* Vendor header */}
                <div className="bg-[#ffb199] font-display font-extrabold px-3 py-2.5 text-[14px] flex justify-between items-center gap-2">
                  <span>🏪 {vendor}</span>
                  <span className="text-[10px] font-extrabold bg-white rounded-full px-2 py-[2px] text-[#7fc4d4]">
                    {isOpened ? '✓ opened' : `${nItems} item${nItems > 1 ? 's' : ''}`}
                  </span>
                </div>

                {/* Line items */}
                {items.map(({ product, item }) => {
                  const price = item.variantIndex >= 0 && product.variants[item.variantIndex]
                    ? product.variants[item.variantIndex].price
                    : product.price
                  const variantTitle = item.variantIndex >= 0 && product.variants[item.variantIndex]
                    ? product.variants[item.variantIndex].title
                    : null

                  return (
                    <div
                      key={`${item.productId}::${item.variantIndex}`}
                      className="flex gap-2.5 p-2.5 px-3 border-b border-dashed border-[#ffe6d9] items-center last:border-b-0"
                    >
                      <div className="w-12 h-12 rounded-[10px] flex-[0_0_auto] bg-gradient-to-br from-[#ffb199] to-[#bfe3ea] flex items-center justify-center text-2xl overflow-hidden">
                        {product.image
                          ? <img src={product.image || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                          : <span aria-hidden="true">{catEmoji(product.cat)}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-bold leading-tight">
                          {product.name}
                          {variantTitle && (
                            <span className="inline-block text-[11px] font-extrabold text-[#b79cff] bg-[#e6dcff] rounded-md px-1.5 py-[1px] ml-1.5 align-middle">
                              {variantTitle}
                            </span>
                          )}
                        </div>
                        <div className="font-display text-[#ff8a65] text-[12.5px]">
                          {money(price)}
                          {product.couponCode && product.couponPct > 0 && (
                            <span className="font-sans text-[9.5px] font-extrabold text-[#e0227a] bg-[#fff0f6] rounded-md px-1.5 py-[1px] ml-1.5">
                              {product.couponCode}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setQty(item.productId, item.variantIndex, item.qty - 1)}
                          className="w-6 h-6 border-2 border-[#ff8a65] bg-[#ffb199] rounded-lg font-black cursor-pointer text-[13px] flex items-center justify-center"
                          aria-label="Decrease quantity"
                        >
                          –
                        </button>
                        <span className="text-[13px] font-bold w-5 text-center">{item.qty}</span>
                        <button
                          onClick={() => setQty(item.productId, item.variantIndex, item.qty + 1)}
                          className="w-6 h-6 border-2 border-[#ff8a65] bg-[#ffb199] rounded-lg font-black cursor-pointer text-[13px] flex items-center justify-center"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => remove(item.productId, item.variantIndex)}
                        className="border-none bg-none cursor-pointer text-[15px] text-[#9a8fa3] px-0.5 hover:text-[#ff8a65]"
                        aria-label={`Remove ${product.name}`}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}

                {/* Coupon note */}
                {coupon && (
                  <div className="text-[11px] font-bold text-[#a3125c] bg-[#fff0f6] px-3 py-1.5 border-t border-dashed border-[#ffe6d9]">
                    🏷️ Code <b>{coupon.couponCode}</b> auto-applies at checkout
                  </div>
                )}

                {/* Vendor footer */}
                <div className="flex items-center justify-between px-3 py-2 bg-[#fffaf0] border-t border-dashed border-[#ffe6d9]">
                  <span className="font-bold text-[12px] text-[#4f4550]">Subtotal: {money(vendorTotal)}</span>
                  <button
                    onClick={() => checkout(vendor)}
                    className={`border-[2.5px] font-display font-extrabold px-3.5 py-2 cursor-pointer text-[12.5px] rounded-[12px] transition-opacity hover:opacity-90 ${
                      isOpened
                        ? 'border-[#6bc98a] bg-white text-[#2e7d32]'
                        : 'border-[#6bc98a] bg-[#6bc98a] text-white'
                    }`}
                  >
                    {isOpened ? 'Reopen ↗' : 'Check out →'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t-[3px] border-[#ffb199] bg-white">
            <div className="flex justify-between items-center font-display font-extrabold text-[18px] text-[#4f4550] mb-1">
              <span>Total ({vendors.length} store{vendors.length > 1 ? 's' : ''})</span>
              <span className="text-[#ff8a65] text-[22px]">{money(total)}</span>
            </div>
            <p className="text-[11px] text-[#9a8fa3] font-semibold mb-2.5 leading-snug">
              Each store runs its own checkout. Tap “Check out” on a store above to open its cart with your items (and any coupon) ready. 🌸
            </p>
            <button
              onClick={clearCart}
              className="w-full border-none bg-none text-[#9a8fa3] font-bold text-[12px] py-2 cursor-pointer underline hover:text-[#ff8a65]"
            >
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  )
}
