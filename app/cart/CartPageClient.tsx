'use client'
import { useEffect, useRef, useState } from 'react'
import ProductPageChrome from '@/components/ProductPageChrome'
import CartDrawer from '@/components/CartDrawer'
import { useLiveCatalog } from '@/hooks/useLiveCatalog'
import { useStore } from '@/lib/store'
import { logEvent } from '@/lib/site-events'

/**
 * One line handed over in the address: `<productId>~<variantId>~<qty>`.
 * Read from the right, because a product id is a vendor's handle and the
 * last two fields never contain `~`. Exported for the shape to be checked
 * without a browser.
 */
export function parseHandoffLine(raw: string): { productId: string; variantId: string; qty: number } | null {
  const m = /^(.+)~([^~]*)~(\d{1,3})$/.exec(raw)
  if (!m) return null
  const qty = Math.min(99, Math.max(1, Number(m[3])))
  return { productId: m[1], variantId: m[2], qty }
}

type Imported = { added: number; missing: number; from: string }

export default function CartPageClient() {
  const { allProducts, loading } = useLiveCatalog()
  const { dispatch } = useStore()
  const done = useRef(false)
  const [imported, setImported] = useState<Imported | null>(null)

  /**
   * Lines handed over from another site (Heart of Columbus) land in this
   * browser's cart once, then leave the address bar, so a reload or a shared
   * link cannot add them twice. Each line is SET to the quantity handed over
   * rather than added on top: the other site's cart is what the shopper just
   * looked at, and going back and checking out again must not double it.
   *
   * It waits for the catalogue so a line can be matched to a real product and
   * variant; an id the shop no longer carries is counted and reported, never
   * invented. The store's own LOAD from localStorage runs on mount, well before
   * the catalogue request returns, so it cannot overwrite what lands here.
   */
  useEffect(() => {
    if (done.current || loading) return
    const params = new URLSearchParams(window.location.search)
    const lines = params.getAll('i')
    done.current = true
    if (!lines.length) return

    let added = 0
    let missing = 0
    for (const raw of lines) {
      const line = parseHandoffLine(raw)
      const product = line && allProducts.find((p) => p.id === line.productId)
      if (!line || !product) { missing++; continue }
      let vi = product.variants.findIndex((v) => String(v.id) === line.variantId)
      if (vi < 0) vi = Math.max(0, product.variants.findIndex((v) => v.available))
      dispatch({ type: 'REMOVE_FROM_CART', productId: product.id, variantIndex: vi })
      dispatch({ type: 'ADD_TO_CART', productId: product.id, variantIndex: vi })
      if (line.qty > 1) dispatch({ type: 'SET_QTY', productId: product.id, variantIndex: vi, qty: line.qty })
      added += line.qty
    }

    const from = /heartofcolumbus/i.test(params.get('utm_source') || '') ? 'Heart of Columbus' : ''
    logEvent('cart_handoff', { meta: `${added}:${missing}${from ? ':hoc' : ''}` })
    setImported({ added, missing, from })
    try { window.history.replaceState(null, '', '/cart') } catch { /* keep the address */ }
  }, [loading, allProducts, dispatch])

  return (
    <ProductPageChrome>
      <main className="max-w-[760px] mx-auto px-4 py-6">
        <h1 className="font-display font-extrabold text-[28px] text-[#4f4550] mb-1">🛒 Your cart</h1>
        <p className="text-[14px] font-semibold text-[#6d6370] mb-4 leading-snug">
          Everything here is sold by independent kawaii shops. Each shop runs its own checkout, so tap
          “Check out” on each one to open its cart with your items ready.
        </p>

        {imported && imported.added > 0 && (
          <div className="mb-4 rounded-[16px] border-[2.5px] border-[#6bc98a] bg-white px-4 py-3 text-[14px] font-bold text-[#2e7d32]" role="status">
            {imported.added} item{imported.added === 1 ? '' : 's'}
            {imported.from ? ` from your ${imported.from} cart` : ''} {imported.added === 1 ? 'is' : 'are'} in your cart below. 🌸
            {imported.missing > 0 && (
              <span className="block mt-1 font-semibold text-[#a3125c]">
                {imported.missing} item{imported.missing === 1 ? ' is' : 's are'} no longer in the shop, so {imported.missing === 1 ? 'it was' : 'they were'} left out.
              </span>
            )}
          </div>
        )}
        {imported && imported.added === 0 && imported.missing > 0 && (
          <div className="mb-4 rounded-[16px] border-[2.5px] border-[#ffb199] bg-white px-4 py-3 text-[14px] font-bold text-[#a3125c]" role="status">
            Those items are no longer in the shop, so nothing new was added.
          </div>
        )}

        {loading && !imported ? (
          <p className="text-center text-[#9a8fa3] font-semibold py-10">Loading your cart…</p>
        ) : (
          <CartDrawer inline open onClose={() => {}} products={allProducts} />
        )}
      </main>
    </ProductPageChrome>
  )
}
