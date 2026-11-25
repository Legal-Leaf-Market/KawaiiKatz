'use client'
import { useEffect, useState } from 'react'
import { useStore, cartTotal, groupCartByVendor, vendorHandoff, lineKey, type CartItem } from '@/lib/store'
import { track } from '@/lib/pinterest-track'
import { logEvent } from '@/lib/site-events'
import { catEmoji, money, type Product } from '@/lib/data'
import ProductImage from '@/components/ProductImage'

type Props = {
  open: boolean
  onClose: () => void
  products: Product[]
}

type Line = { product: Product; item: CartItem }

/** Same rel as the Buy button on product pages: these are paid links. */
const OUTBOUND_REL = 'nofollow sponsored noopener noreferrer'

function hasVariant(l: Line): boolean {
  return l.item.variantIndex >= 0 && !!l.product.variants[l.item.variantIndex]
}
function priceOf(l: Line): number {
  return hasVariant(l) ? l.product.variants[l.item.variantIndex].price : l.product.price
}
/** A "from" price with no variant picked here: the real price is set on the shop's page. */
function isFromPrice(l: Line): boolean {
  return !hasVariant(l) && l.product.unit === 'from'
}

export default function CartDrawer({ open, onClose, products }: Props) {
  const { state, dispatch } = useStore()
  const { cart } = state

  // Which vendors (and, for page handoffs, which lines) have been opened, so
  // the controls read "Reopen" / "Opened".
  const [opened, setOpened] = useState<Record<string, boolean>>({})

  const groups = groupCartByVendor(cart, products)
  const vendors = Object.keys(groups)
  const total = cartTotal(cart, products)
  const handoffs = Object.fromEntries(vendors.map((v) => [v, vendorHandoff(groups[v] ?? [])]))
  const anyPages = vendors.some((v) => handoffs[v].kind === 'pages')
  const anyFrom = cart.length > 0 && vendors.some((v) => (groups[v] ?? []).some(isFromPrice))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function setQty(productId: string, variantIndex: number, qty: number) {
    dispatch({ type: 'SET_QTY', productId, variantIndex, qty })
  }
  function remove(productId: string, variantIndex: number) {
    dispatch({ type: 'REMOVE_FROM_CART', productId, variantIndex })
  }
  function clearCart() {
    dispatch({ type: 'CLEAR_CART' })
  }

  /**
   * The click out to the merchant: the strongest signal this business model
   * produces, and the last thing we can observe. It goes as `custom`, never
   * as `checkout`: the sale happens on the vendor's domain under the vendor's
   * analytics, and we never learn whether it completed.
   */
  function reportOutbound(vendor: string, lines: Line[]) {
    logEvent('checkout_click', { vendor, meta: String(lines.length) })
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
  }

  /*
   * Hand-offs are real links, not window.open. The old button called
   * window.open(url, '_blank', 'noopener,noreferrer') and, when that returned
   * null, navigated this tab to the same URL as a popup-blocked fallback. But
   * window.open with `noopener` ALWAYS returns null (that is in the spec), so
   * the fallback fired on every click: the shop opened in a new tab AND this
   * tab left for it, and a Shopify store got two separate checkouts. A link
   * with target=_blank is a user navigation, so no popup blocker stops it and
   * nothing needs a fallback. The tracking calls use keepalive, and this page
   * stays open anyway.
   */
  function openVendor(vendor: string, lines: Line[]) {
    setOpened((o) => ({ ...o, [vendor]: true }))
    reportOutbound(vendor, lines)
  }
  function openLine(vendor: string, line: Line) {
    setOpened((o) => ({ ...o, [vendor]: true, [`${vendor}::${lineKey(line.item)}`]: true }))
    reportOutbound(vendor, [line])
  }

  const ctaClass = (isOpened: boolean) =>
    `inline-block no-underline border-[2.5px] font-display font-extrabold px-3.5 py-2 cursor-pointer text-[12.5px] rounded-[12px] transition-opacity hover:opacity-90 ${
      isOpened
        ? 'border-[#6bc98a] bg-white text-[#2e7d32]'
        : 'border-[#6bc98a] bg-[#6bc98a] text-white'
    }`

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
            const handoff = handoffs[vendor]
            const vendorTotal = items.reduce((sum, l) => sum + priceOf(l) * l.item.qty, 0)
            const vendorFrom = items.some(isFromPrice)
            const coupon = items.map(({ product }) => product).find((p) => p.couponCode && p.couponPct > 0)
            const nItems = items.reduce((n, { item }) => n + item.qty, 0)
            const isOpened = !!opened[vendor]
            const single = handoff.kind === 'pages' && items.length === 1 ? items[0] : null

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
                {items.map((line) => {
                  const { product, item } = line
                  const key = lineKey(item)
                  const variantTitle = hasVariant(line) ? product.variants[item.variantIndex].title : null
                  const from = isFromPrice(line)
                  const pageUrl = handoff.kind === 'pages' ? handoff.links[key] : ''
                  const lineOpened = !!opened[`${vendor}::${key}`]

                  return (
                    <div
                      key={key}
                      className="flex gap-2.5 p-2.5 px-3 border-b border-dashed border-[#ffe6d9] items-center last:border-b-0"
                    >
                      <div className="relative w-12 h-12 rounded-[10px] flex-[0_0_auto] bg-gradient-to-br from-[#ffb199] to-[#bfe3ea] flex items-center justify-center text-2xl overflow-hidden">
                        <ProductImage
                          src={product.image}
                          alt=""
                          fallback={catEmoji(product.cat)}
                          fallbackClassName="text-2xl"
                          className="w-full h-full object-cover"
                          width={96}
                        />
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
                          {from && <span className="font-sans text-[10.5px] font-bold text-[#9a8fa3] mr-1">from</span>}
                          {money(priceOf(line))}
                          {product.couponCode && product.couponPct > 0 && (
                            <span className="font-sans text-[9.5px] font-extrabold text-[#e0227a] bg-[#fff0f6] rounded-md px-1.5 py-[1px] ml-1.5">
                              {product.couponCode}
                            </span>
                          )}
                        </div>
                        {pageUrl && !single && (
                          <a
                            href={pageUrl}
                            target="_blank"
                            rel={OUTBOUND_REL}
                            onClick={() => openLine(vendor, line)}
                            className="inline-block mt-0.5 text-[11px] font-extrabold text-[#2e7d32] underline hover:opacity-80"
                          >
                            {lineOpened ? 'Opened ↗' : from ? 'Pick size at the shop ↗' : 'Open at the shop ↗'}
                          </a>
                        )}
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

                {/* No cart link: say what will actually happen */}
                {handoff.kind === 'pages' && (
                  <div className="text-[11px] font-bold text-[#6b5f70] bg-[#fffaf0] px-3 py-1.5 border-t border-dashed border-[#ffe6d9] leading-snug">
                    {items.length > 1
                      ? 'This shop has no cart link, so each item opens on its own page. Add them to your cart there.'
                      : 'This shop has no cart link, so the item opens on its own page. Add it to your cart there.'}
                    {vendorFrom && ' Pick your size there too.'}
                  </div>
                )}

                {/* Vendor footer */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#fffaf0] border-t border-dashed border-[#ffe6d9]">
                  <span className="font-bold text-[12px] text-[#4f4550]">
                    Subtotal: {vendorFrom ? 'from ' : ''}{money(vendorTotal)}
                  </span>
                  {handoff.kind === 'cart' && (
                    <a
                      href={handoff.url}
                      target="_blank"
                      rel={OUTBOUND_REL}
                      onClick={() => openVendor(vendor, items)}
                      className={ctaClass(isOpened)}
                    >
                      {isOpened ? 'Reopen ↗' : 'Check out →'}
                    </a>
                  )}
                  {single && handoff.kind === 'pages' && (
                    <a
                      href={handoff.links[lineKey(single.item)]}
                      target="_blank"
                      rel={OUTBOUND_REL}
                      onClick={() => openLine(vendor, single)}
                      className={ctaClass(isOpened)}
                    >
                      {isOpened ? 'Reopen ↗' : 'Go to shop →'}
                    </a>
                  )}
                  {handoff.kind === 'pages' && !single && (
                    <span className="text-[11px] font-bold text-[#9a8fa3]">Open each item above</span>
                  )}
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
              <span className="text-[#ff8a65] text-[22px]">
                {anyFrom && <span className="font-sans text-[12px] font-bold text-[#9a8fa3] mr-1">from</span>}
                {money(total)}
              </span>
            </div>
            <p className="text-[11px] text-[#9a8fa3] font-semibold mb-2.5 leading-snug">
              {anyPages
                ? 'Each store runs its own checkout. Most open with your items (and any coupon) already in their cart. A few can’t, so those items open on the product page instead. 🌸'
                : 'Each store runs its own checkout. Tap “Check out” on a store above to open its cart with your items (and any coupon) ready. 🌸'}
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
